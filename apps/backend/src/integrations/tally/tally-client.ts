import { Injectable, Logger, BadRequestException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TallyConfig } from './interfaces/tally-config.interface';
import * as dns from 'dns';

@Injectable()
export class TallyClient {
  private readonly logger = new Logger(TallyClient.name);

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Validates Tally Host URL against SSRF attack vectors.
   * Enforces http/https protocols and rejects loopback, private IP ranges, and cloud metadata IPs
   * unless host is explicitly listed in process.env.TALLY_ALLOWED_INTERNAL_HOSTS.
   */
  public async validateTallyHostUrl(hostUrl: string): Promise<{ isValid: boolean; reason?: string }> {
    if (!hostUrl || typeof hostUrl !== 'string') {
      return { isValid: false, reason: 'Host URL must be a non-empty string' };
    }

    let parsed: URL;
    try {
      parsed = new URL(hostUrl);
    } catch {
      return { isValid: false, reason: 'Invalid URL format' };
    }

    // 1. Protocol validation (allow only http: and https:)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, reason: `Invalid protocol scheme '${parsed.protocol}'. Only http: and https: are allowed.` };
    }

    const hostname = parsed.hostname.toLowerCase();
    const hostWithPort = parsed.host.toLowerCase();

    // 2. Allowlist override check (process.env.TALLY_ALLOWED_INTERNAL_HOSTS)
    const allowedEnv = process.env.TALLY_ALLOWED_INTERNAL_HOSTS || '';
    const allowedList = allowedEnv.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
    if (allowedList.includes(hostname) || allowedList.includes(hostWithPort)) {
      return { isValid: true };
    }

    // 3. IP / Hostname validation
    // Loopback & local hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0' ||
      hostname === '::'
    ) {
      return { isValid: false, reason: `Forbidden loopback target: ${hostname}` };
    }

    // Check IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);

      // Loopback 127.0.0.0/8
      if (octet1 === 127) {
        return { isValid: false, reason: `Forbidden loopback IP (127.0.0.0/8): ${hostname}` };
      }
      // Zero network 0.0.0.0/8
      if (octet1 === 0) {
        return { isValid: false, reason: `Forbidden zero IP range: ${hostname}` };
      }
      // Private range 10.0.0.0/8
      if (octet1 === 10) {
        return { isValid: false, reason: `Forbidden private IP range (10.0.0.0/8): ${hostname}` };
      }
      // Private range 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { isValid: false, reason: `Forbidden private IP range (172.16.0.0/12): ${hostname}` };
      }
      // Private range 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) {
        return { isValid: false, reason: `Forbidden private IP range (192.168.0.0/16): ${hostname}` };
      }
      // Cloud metadata / Link-local 169.254.0.0/16 (e.g., 169.254.169.254)
      if (octet1 === 169 && octet2 === 254) {
        return { isValid: false, reason: `Forbidden cloud metadata / link-local IP (169.254.0.0/16): ${hostname}` };
      }
    }

    // DNS resolution check for domain names
    const isIp = ipv4Regex.test(hostname) || hostname.includes(':');
    if (!isIp) {
      try {
        const addresses = await dns.promises.lookup(hostname, { all: true });
        for (const addr of addresses) {
          const resolvedCheck = await this.validateTallyHostUrl(`http://${addr.address}`);
          if (!resolvedCheck.isValid) {
            return { isValid: false, reason: `Forbidden target: Host '${hostname}' resolved to ${addr.address} (${resolvedCheck.reason})` };
          }
        }
      } catch {
        // DNS lookup failed; ignore here
      }
    }

    return { isValid: true };
  }

  /**
   * Records a security audit log for Tally SSRF validation or connection events.
   */
  public async logSecurityAudit(action: string, hostUrl: string, details: any, userId?: string) {
    if (!this.prisma) return;
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const anyUser = await this.prisma.user.findFirst({ select: { id: true } });
        if (anyUser) targetUserId = anyUser.id;
      }
      if (!targetUserId) return;

      await this.prisma.auditLog.create({
        data: {
          action: action.startsWith('SSRF_') ? action : `SSRF_${action}`,
          entity: 'TallyClient',
          entityId: hostUrl,
          userId: targetUserId,
          details: { hostUrl, ...details, timestamp: new Date().toISOString() },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record security audit log: ${err.message}`);
    }
  }

  /**
   * Posts Tally XML Envelope to TallyPrime HTTP Server with SSRF Protection
   * Includes exponential backoff retry logic (3 attempts with jitter) and 5s timeout per attempt.
   */
  public async sendTallyXmlRequest(config: TallyConfig, xmlBody: string): Promise<string> {
    const host = config.tallyHostUrl || 'http://localhost:9000';
    this.logger.log(`📡 Sending XML request to Tally Host: ${host}`);

    // SSRF Guard Validation
    const validation = await this.validateTallyHostUrl(host);
    if (!validation.isValid) {
      this.logger.warn(`🚨 SSRF Guard rejected Tally Host URL [${host}]: ${validation.reason}`);
      await this.logSecurityAudit('SSRF_BLOCKED', host, { reason: validation.reason });
      throw new BadRequestException(`SSRF Validation Failed: ${validation.reason}`);
    }

    // Log connection test
    await this.logSecurityAudit('TALLY_CONNECTION_TEST', host, { status: 'INITIATED' });

    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(host, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml;charset=utf-8',
          },
          body: xmlBody,
          redirect: 'error', // Disable HTTP redirects
          signal: AbortSignal.timeout(5000), // Strict 5-second request timeout per attempt
        });

        if (!response.ok) {
          await this.logSecurityAudit('CONNECTION_FAILED', host, { status: response.status, text: response.statusText, attempt });
          throw new Error(`Tally Server HTTP Error ${response.status}: ${response.statusText}`);
        }

        // Payload size limit check (5MB cap)
        const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
        const contentLengthHeader = response.headers.get('content-length');
        if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_PAYLOAD_BYTES) {
          await this.logSecurityAudit('PAYLOAD_LIMIT_EXCEEDED', host, { size: contentLengthHeader });
          throw new BadRequestException('Tally response payload exceeds maximum 5MB limit');
        }

        const responseText = await response.text();
        if (Buffer.byteLength(responseText, 'utf8') > MAX_PAYLOAD_BYTES) {
          await this.logSecurityAudit('PAYLOAD_LIMIT_EXCEEDED', host, { size: Buffer.byteLength(responseText, 'utf8') });
          throw new BadRequestException('Tally response payload exceeds maximum 5MB limit');
        }

        await this.logSecurityAudit('TALLY_CONNECTION_TEST_SUCCESS', host, { status: 'SUCCESS', attempt });
        return responseText;
      } catch (err: any) {
        lastError = err;
        // Do not retry on client validation errors (e.g. BadRequestException)
        if (err instanceof BadRequestException) {
          throw err;
        }

        this.logger.warn(`⚠️ Tally Connection Attempt ${attempt}/${maxAttempts} failed at ${host}: ${err.message}`);

        if (attempt < maxAttempts) {
          // Exponential backoff with jitter: 100ms * 2^(attempt - 1) + jitter (0..100ms)
          const baseDelay = 100 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 100);
          const delay = baseDelay + jitter;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Graceful degradation logging after retries exhausted
    this.logger.error(`🚨 Tally connection failed after ${maxAttempts} attempts for ${host}: ${lastError?.message}`);
    if (lastError?.name === 'AbortError' || lastError?.message?.includes('aborted') || lastError?.message?.includes('timeout')) {
      await this.logSecurityAudit('TIMEOUT', host, { error: 'Request timed out after 5 seconds' });
      throw new BadRequestException('Tally request timed out after 5 seconds');
    }
    await this.logSecurityAudit('CONNECTION_FAILED', host, { error: lastError?.message || 'Connection failed' });
    throw new BadRequestException(`Tally server unreachable or connection failed: ${lastError?.message || 'Unknown network error'}`);
  }

  /**
   * Helper: Builds XML Envelope for Tally Export Request
   */
  public buildExportXmlEnvelope(requestType: string, companyName?: string): string {
    const companyFilter = companyName ? `<SVCCOMPANYNAME>${companyName}</SVCCOMPANYNAME>` : '';
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${requestType}</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SYSNAME:XML</SVEXPORTFORMAT>
          ${companyFilter}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}
