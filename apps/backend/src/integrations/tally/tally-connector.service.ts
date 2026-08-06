import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parseStringPromise } from 'xml2js';
import { PrismaService } from '../../prisma/prisma.service';
import { TallyClient } from './tally-client';
import { TallyTransformerService } from './tally-transformer.service';
import { TallyConfig } from './interfaces/tally-config.interface';
import { CfoBrainService } from '../../cfo-engine/cfo-brain.service';

@Injectable()
export class TallyConnectorService {
  private readonly logger = new Logger(TallyConnectorService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private tallyClient: TallyClient,
    private transformer: TallyTransformerService,
    @Optional() @Inject(CfoBrainService) private cfoBrain: CfoBrainService | null = null,
  ) {}

  /**
   * Checks if Tally Integration feature flag is enabled
   */
  public isTallyIntegrationEnabled(): boolean {
    return process.env.ENABLE_TALLY_INTEGRATION === 'true';
  }

  /**
   * Test Connection to Tally Host URL
   */
  public async testConnection(config: TallyConfig): Promise<{ success: boolean; message: string }> {
    if (!config.enabled && !this.isTallyIntegrationEnabled()) {
      return { success: false, message: 'Tally integration feature flag is disabled (ENABLE_TALLY_INTEGRATION=false)' };
    }

    try {
      const xmlReq = this.tallyClient.buildExportXmlEnvelope('List of Companies');
      const responseXml = await this.tallyClient.sendTallyXmlRequest(config, xmlReq);

      if (responseXml.includes('<ENVELOPE>') || responseXml.includes('<TALLYRESULT>')) {
        return { success: true, message: `Successfully connected to Tally at ${config.tallyHostUrl}` };
      }
      return { success: true, message: `Connected to ${config.tallyHostUrl}` };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  /**
   * Helper to parse voucher array from Tally XML response
   */
  private async parseVouchersFromXml(xml: string): Promise<any[]> {
    if (!xml || typeof xml !== 'string' || !xml.includes('<VOUCHER')) {
      return [];
    }
    try {
      const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
      const vouchers: any[] = [];
      const extract = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.VOUCHER) {
          if (Array.isArray(node.VOUCHER)) {
            vouchers.push(...node.VOUCHER);
          } else {
            vouchers.push(node.VOUCHER);
          }
        }
        for (const k of Object.keys(node)) {
          if (k !== 'VOUCHER' && typeof node[k] === 'object') {
            extract(node[k]);
          }
        }
      };
      extract(parsed);
      return vouchers;
    } catch (err: any) {
      this.logger.warn(`Failed to parse Tally XML: ${err.message}`);
      return [];
    }
  }

  /**
   * Process Tally XML File Upload (Preview & Full Canonical Ingestion)
   */
  public async processTallyXmlUpload(xmlContent: string, organizationId: string, userId: string, previewOnly = false) {
    this.logger.log(`Processing Tally XML upload (previewOnly=${previewOnly}) for org: ${organizationId}`);

    const rawVouchers = await this.parseVouchersFromXml(xmlContent);
    if (!rawVouchers || rawVouchers.length === 0) {
      throw new Error('No valid Tally vouchers found in uploaded XML file. Please export Vouchers from Tally Prime.');
    }

    let companyName = 'Tally Company';
    let financialYear = 'FY 2025-26';
    try {
      const parsed = await parseStringPromise(xmlContent, { explicitArray: false, ignoreAttrs: false });
      const compNode = parsed?.ENVELOPE?.HEADER?.TALLYREQUEST || parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDESC?.STATICVARIABLES?.SVCURRENTCOMPANY;
      if (compNode && typeof compNode === 'string') {
        companyName = compNode;
      }
    } catch (e) {
      // Fallback
    }

    const voucherBreakdown = {
      SALES: 0,
      PURCHASE: 0,
      PAYMENT: 0,
      RECEIPT: 0,
      CONTRA: 0,
      JOURNAL: 0,
      OTHER: 0,
    };

    let totalInflow = 0;
    let totalOutflow = 0;
    let duplicateCount = 0;
    let importedCount = 0;

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { organizationId, deletedAt: null },
    }) || await this.prisma.bankAccount.create({
      data: {
        name: 'Tally Main Clearing Account',
        bankName: 'Tally Integration',
        organizationId,
        balance: 0,
      },
    });

    for (const rawVch of rawVouchers) {
      const canonicalTx = this.transformer.transformVoucherToCanonicalTransaction(rawVch, organizationId);
      const rawType = (rawVch.VOUCHERTYPENAME || '').toUpperCase();

      if (rawType.includes('SALES')) voucherBreakdown.SALES++;
      else if (rawType.includes('PURCHASE')) voucherBreakdown.PURCHASE++;
      else if (rawType.includes('PAYMENT')) voucherBreakdown.PAYMENT++;
      else if (rawType.includes('RECEIPT')) voucherBreakdown.RECEIPT++;
      else if (rawType.includes('CONTRA')) voucherBreakdown.CONTRA++;
      else if (rawType.includes('JOURNAL')) voucherBreakdown.JOURNAL++;
      else voucherBreakdown.OTHER++;

      const existing = await this.prisma.transaction.findFirst({
        where: {
          externalId: canonicalTx.id,
          bankAccount: { organizationId },
        },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      importedCount++;
      if (canonicalTx.type === 'INCOME') totalInflow += canonicalTx.amount;
      if (canonicalTx.type === 'EXPENSE') totalOutflow += canonicalTx.amount;

      if (!previewOnly) {
        await this.prisma.transaction.create({
          data: {
            amount: canonicalTx.amount,
            type: canonicalTx.type === 'INCOME' ? 'INCOME' : canonicalTx.type === 'EXPENSE' ? 'EXPENSE' : 'TRANSFER',
            category: canonicalTx.category || 'general',
            description: canonicalTx.narration || 'Tally Import',
            date: canonicalTx.date ? new Date(canonicalTx.date) : new Date(),
            bankAccountId: bankAccount.id,
            source: 'TALLY',
            externalId: canonicalTx.id,
          },
        });
      }
    }

    if (previewOnly) {
      return {
        status: 'preview',
        previewOnly: true,
        companyName,
        financialYear,
        totalVouchers: rawVouchers.length,
        importedCount,
        duplicateCount,
        totalInflow,
        totalOutflow,
        voucherBreakdown,
        estimatedCashImpact: totalInflow - totalOutflow,
        estimatedRunwayImpactMonths: Math.round(((totalInflow - totalOutflow) / (totalOutflow || 1)) * 10) / 10,
        confidenceScore: 92,
        message: `FounderCFO successfully understood your Tally company "${companyName}". Detected ${rawVouchers.length} vouchers (${duplicateCount} duplicates found). No data has been saved yet.`,
      };
    }

    let postImportDebrief: any = null;
    if (this.cfoBrain) {
      try {
        postImportDebrief = await this.cfoBrain.generatePostImportDebrief(userId, organizationId, {
          importedCount,
          duplicateCount,
          totalRevenueImported: totalInflow,
          totalExpenseImported: totalOutflow,
        });
      } catch (err) {
        this.logger.warn(`Failed to generate Tally post-import debrief: ${err}`);
      }
    }

    return {
      status: 'success',
      previewOnly: false,
      companyName,
      financialYear,
      importedCount,
      duplicateCount,
      totalInflow,
      totalOutflow,
      message: `Tally Sync Complete! Imported ${importedCount} vouchers (${duplicateCount} duplicates skipped) from ${companyName}.`,
      postImportDebrief,
    };
  }

  /**
   * Syncs Tally Vouchers -> Transforms to CanonicalTransaction -> Emits transaction.ingested
   */
  public async syncTallyVouchers(organizationId: string, config: TallyConfig) {
    const startTime = Date.now();
    if (!config?.enabled && !this.isTallyIntegrationEnabled()) {
      this.logger.warn('⚠️ Tally Sync skipped: Feature flag ENABLE_TALLY_INTEGRATION is false');
      return { count: 0, message: 'Feature flag disabled' };
    }

    if (!config?.tallyHostUrl) {
      return { count: 0, message: 'Tally host URL not configured' };
    }

    this.logger.log(`🔄 Initiating Tally Voucher Sync for org: ${organizationId} at host: ${config.tallyHostUrl}`);

    let responseXml = '';
    try {
      const xmlReq = this.tallyClient.buildExportXmlEnvelope('Vouchers');
      responseXml = await this.tallyClient.sendTallyXmlRequest(config, xmlReq);
    } catch (err: any) {
      this.logger.warn(`⚠️ Tally fetch failed for host ${config.tallyHostUrl}: ${err.message}`);
      return { count: 0, message: `Tally server unreachable or unconfigured: ${err.message}` };
    }

    const rawVouchers = await this.parseVouchersFromXml(responseXml);
    if (!rawVouchers || rawVouchers.length === 0) {
      const duration = Date.now() - startTime;
      this.logger.log(`[TELEMETRY] TallySync: duration ${duration} ms, imported 0 records, duplicate 0 records`);
      return { count: 0, message: 'No vouchers found in Tally response' };
    }

    let ingestedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const errorDetails: Array<{ error: string }> = [];

    for (const rawVch of rawVouchers) {
      try {
        // 1. Transform to Canonical Object
        const canonicalTx = this.transformer.transformVoucherToCanonicalTransaction(rawVch, organizationId);

        // Ingestion deduplication check before event emission
        const existing = await this.prisma.transaction.findFirst({
          where: {
            externalId: canonicalTx.id,
            bankAccount: { organizationId },
          },
        });

        if (existing) {
          duplicateCount++;
          this.logger.log(`Skipping duplicate Tally voucher: ${canonicalTx.id}`);
          continue;
        }

        // 2. Emit transaction.ingested event into existing pipeline
        this.eventEmitter.emit('transaction.ingested', {
          organizationId,
          transaction: {
            id: canonicalTx.id,
            amount: canonicalTx.amount,
            type: canonicalTx.type,
            category: canonicalTx.category,
            narration: canonicalTx.narration,
            date: canonicalTx.date,
            source: canonicalTx.source,
          },
        });

        ingestedCount++;
      } catch (err: any) {
        failedCount++;
        const errorMessage = err?.message || String(err);
        this.logger.error(`❌ Failed to ingest Tally voucher for org ${organizationId}: ${errorMessage}`, err?.stack);
        errorDetails.push({ error: errorMessage });
      }
    }

    if (failedCount > 0) {
      this.logger.warn(`⚠️ Partial sync failure detected for org ${organizationId}: ${failedCount} voucher(s) failed out of ${rawVouchers.length}`);
      await this.logPartialSyncAudit(organizationId, {
        totalVouchers: rawVouchers.length,
        ingestedCount,
        duplicateCount,
        failedCount,
        errorDetails,
      });
    }

    // 3. Emit dashboard quick update for UI feedback
    if (ingestedCount > 0) {
      this.eventEmitter.emit('dashboard.quick_update', {
        organizationId,
        deltaTransactions: ingestedCount,
        message: `Ingested ${ingestedCount} vouchers from Tally`,
      });
    }

    const duration = Date.now() - startTime;
    this.logger.log(`[TELEMETRY] TallySync: duration ${duration} ms, imported ${ingestedCount} records, duplicate ${duplicateCount} records`);

    const resultMessage = failedCount > 0
      ? `Partial sync completed: ${ingestedCount} ingested, ${duplicateCount} duplicate, ${failedCount} failed`
      : `Successfully synced ${ingestedCount} Tally vouchers into Canonical Financial Pipeline`;

    return {
      count: ingestedCount,
      duplicates: duplicateCount,
      failed: failedCount,
      message: resultMessage,
    };
  }

  /**
   * Records an audit log event for partial synchronization failures.
   */
  private async logPartialSyncAudit(organizationId: string, details: any) {
    if (!this.prisma) return;
    try {
      let targetUserId: string | undefined;
      const user = await this.prisma.user.findFirst({
        where: { organizationId },
        select: { id: true },
      });
      if (user) {
        targetUserId = user.id;
      } else {
        const fallbackUser = await this.prisma.user.findFirst({ select: { id: true } });
        if (fallbackUser) targetUserId = fallbackUser.id;
      }

      if (!targetUserId) return;

      await this.prisma.auditLog.create({
        data: {
          action: 'TALLY_PARTIAL_SYNC_FAILURE',
          entity: 'TallyConnector',
          entityId: organizationId,
          userId: targetUserId,
          details: {
            organizationId,
            timestamp: new Date().toISOString(),
            ...details,
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record partial sync audit log: ${err.message}`);
    }
  }
}

