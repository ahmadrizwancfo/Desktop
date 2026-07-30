import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { createHash } from 'crypto';
import { AppModule } from '../src/app.module';
import { LiveStateEngineService } from '../src/cfo-engine/live-state.engine';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { CFOState } from '../src/cfo-engine/cfo-state.service';
import { TallyClient } from '../src/integrations/tally/tally-client';
import { TallyTransformerService } from '../src/integrations/tally/tally-transformer.service';
import { roundToTwoDecimals } from '../src/events/workers/reconciliation.worker';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tier 5 Adversarial Coverage Hardening & Empirical Stress Test Suite', () => {
  let app: INestApplication;
  let liveStateEngine: LiveStateEngineService;
  let decisionEngine: DecisionEngineService;
  let tallyClient: TallyClient;
  let tallyTransformer: TallyTransformerService;
  let prisma: PrismaService;

  let tenantA_Token: string;
  let tenantA_OrgId: string;
  let tenantB_Token: string;
  let tenantB_OrgId: string;

  const emailA = `tier5-orgA-${Date.now()}@example.com`;
  const emailB = `tier5-orgB-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback', 'sse', 'sse/stream'],
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);

    liveStateEngine = app.get<LiveStateEngineService>(LiveStateEngineService);
    decisionEngine = app.get<DecisionEngineService>(DecisionEngineService);
    tallyClient = app.get<TallyClient>(TallyClient);
    tallyTransformer = app.get<TallyTransformerService>(TallyTransformerService);
    prisma = app.get<PrismaService>(PrismaService);

    // Register Tenant A
    const regA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailA, password, name: 'Tier5 Tenant A', organizationName: 'Tier5 Org A' });

    tenantA_Token = regA.body?.access_token;
    tenantA_OrgId = regA.body?.user?.organizationId || regA.body?.user?.organization?.id;

    // Register Tenant B
    const regB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailB, password, name: 'Tier5 Tenant B', organizationName: 'Tier5 Org B' });

    tenantB_Token = regB.body?.access_token;
    tenantB_OrgId = regB.body?.user?.organizationId || regB.body?.user?.organization?.id;

    // DB Connection Pool Warmup
    await liveStateEngine.hydrateStateFromDb('warmup-org-id');
  }, 35000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HIGH-CONCURRENCY PERFORMANCE SLA STRESS TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. High-Concurrency Performance SLA Stress Testing', () => {
    it('1.1: LiveStateEngine DB refresh under full 100-request concurrency (< 250ms SLA)', async () => {
      const orgIds = Array.from({ length: 100 }, (_, i) => `tier5-concurrency-100-org-${i}-${Date.now()}`);
      
      const startTime = performance.now();
      const results = await Promise.all(
        orgIds.map(async (orgId) => {
          const t0 = performance.now();
          const snapshot = await liveStateEngine.hydrateStateFromDb(orgId);
          const t1 = performance.now();
          return { snapshot, duration: t1 - t0 };
        })
      );
      const totalDuration = performance.now() - startTime;

      const durations = results.map((r) => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const sorted = [...durations].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      console.log(`[TIER 5 STRESS METRIC] LiveStateEngine 100 Concurrent DB Hydrations: Total=${totalDuration.toFixed(2)}ms, Avg=${avgDuration.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms, Max=${maxDuration.toFixed(2)}ms (SLA target: < 250ms)`);

      expect(results.length).toBe(100);
      expect(maxDuration).toBeLessThan(250); // Hard SLA constraint < 250ms
      expect(avgDuration).toBeLessThan(150);
      results.forEach((r) => {
        expect(r.snapshot).toBeDefined();
        expect(r.snapshot.organizationId).toBeDefined();
      });
    });

    it('1.2: DecisionEngine execution under 100 concurrent evaluations (< 500ms SLA)', async () => {
      const mockState: CFOState = {
        organizationId: tenantA_OrgId,
        founderPersona: 'aggressive',
        summary: {
          cashInBank: 1500000,
          monthlyExpenses: 400000,
          monthlyRevenue: 100000,
          netBurn: 300000,
          runwayMonths: 5.0,
          revenueTrend: 'growing',
        },
        dynamicConfidence: { score: 85, label: 'High', warnings: [] },
        decisionMemory: { pendingDecisions: 2 },
        changeDrivers: [
          { category: 'payroll', amount: 250000, percentage: 62.5, direction: 'UP' },
          { category: 'marketing', amount: 80000, percentage: 20, direction: 'UP' },
        ],
        negativeTrends: [
          { metricName: 'Burn Rate', currentVal: 300000, prevVal: 200000, pctChange: 50, direction: 'BAD' }
        ],
      } as any;

      const startTime = performance.now();
      const evaluations = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const t0 = performance.now();
          const result = decisionEngine.generateDecisions(mockState);
          const t1 = performance.now();
          return { result, duration: t1 - t0 };
        })
      );
      const totalDuration = performance.now() - startTime;

      const durations = evaluations.map((e) => e.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const sorted = [...durations].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      console.log(`[TIER 5 STRESS METRIC] DecisionEngine 100 Concurrent Evaluations: Total=${totalDuration.toFixed(2)}ms, Avg=${avgDuration.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms, Max=${maxDuration.toFixed(2)}ms (SLA target: < 500ms)`);

      expect(evaluations.length).toBe(100);
      expect(maxDuration).toBeLessThan(500); // Hard SLA constraint < 500ms
      expect(avgDuration).toBeLessThan(50);
      evaluations.forEach((e) => {
        expect(e.result).toBeDefined();
        expect(e.result.decisions).toBeDefined();
        expect(Array.isArray(e.result.decisions)).toBe(true);
      });
    });

    it('1.3: LiveStateEngine LRU cache bounding under high key eviction pressure', async () => {
      const totalOrgs = 600; // Exceeds MAX_CACHE_SIZE (500)
      for (let i = 0; i < totalOrgs; i++) {
        const dummyOrg = `lru-stress-org-${i}`;
        await liveStateEngine.getLiveState(dummyOrg);
      }

      // Map size must remain strictly bounded at 500
      const mapSize = (liveStateEngine as any).liveStateMap.size;
      expect(mapSize).toBeLessThanOrEqual(500);

      console.log(`[TIER 5 STRESS METRIC] LiveStateEngine Cache Bounding: Map size capped at ${mapSize} (Limit: 500) after ${totalOrgs} additions`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SSRF PROTECTION STRESS TESTING (TallyClient)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. SSRF Protection Stress Testing (tally-client.ts)', () => {
    it('2.1: Rejects loopback IP 127.0.0.1, localhost, ::1, and 0.0.0.0', async () => {
      const loopbacks = [
        'http://127.0.0.1:9000',
        'http://localhost:9000',
        'http://[::1]:9000',
        'http://0.0.0.0:9000',
      ];

      for (const target of loopbacks) {
        const check = await tallyClient.validateTallyHostUrl(target);
        expect(check.isValid).toBe(false);
        expect(check.reason).toBeDefined();

        await expect(
          tallyClient.sendTallyXmlRequest({ tallyHostUrl: target }, '<ENVELOPE/>')
        ).rejects.toThrow('SSRF Validation Failed');
      }
    });

    it('2.2: Rejects AWS Cloud Metadata IP 169.254.169.254 and link-local range 169.254.0.0/16', async () => {
      const metadataUrls = [
        'http://169.254.169.254/latest/meta-data/',
        'http://169.254.1.1:9000',
      ];

      for (const target of metadataUrls) {
        const check = await tallyClient.validateTallyHostUrl(target);
        expect(check.isValid).toBe(false);
        expect(check.reason).toContain('cloud metadata');

        await expect(
          tallyClient.sendTallyXmlRequest({ tallyHostUrl: target }, '<ENVELOPE/>')
        ).rejects.toThrow('SSRF Validation Failed');
      }
    });

    it('2.3: Rejects private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)', async () => {
      const privateIps = [
        'http://10.0.0.1:9000',
        'http://172.16.0.100:9000',
        'http://172.31.255.255:9000',
        'http://192.168.1.1:9000',
      ];

      for (const target of privateIps) {
        const check = await tallyClient.validateTallyHostUrl(target);
        expect(check.isValid).toBe(false);
        expect(check.reason).toContain('private IP range');

        await expect(
          tallyClient.sendTallyXmlRequest({ tallyHostUrl: target }, '<ENVELOPE/>')
        ).rejects.toThrow('SSRF Validation Failed');
      }
    });

    it('2.4: Rejects non-HTTP protocols (ftp, file, gopher, ssh)', async () => {
      const invalidProtocols = [
        'ftp://tally.example.com',
        'file:///etc/passwd',
        'gopher://tally.example.com',
      ];

      for (const target of invalidProtocols) {
        const check = await tallyClient.validateTallyHostUrl(target);
        expect(check.isValid).toBe(false);
        expect(check.reason).toContain('Invalid protocol scheme');
      }
    });

    it('2.5: Respects TALLY_ALLOWED_INTERNAL_HOSTS override for explicit local dev targets', async () => {
      process.env.TALLY_ALLOWED_INTERNAL_HOSTS = '127.0.0.1,localhost,internal-tally.local';
      
      const check1 = await tallyClient.validateTallyHostUrl('http://127.0.0.1:9000');
      const check2 = await tallyClient.validateTallyHostUrl('http://localhost:9000');
      const check3 = await tallyClient.validateTallyHostUrl('http://internal-tally.local:9000');

      expect(check1.isValid).toBe(true);
      expect(check2.isValid).toBe(true);
      expect(check3.isValid).toBe(true);

      // Clean up env override
      delete process.env.TALLY_ALLOWED_INTERNAL_HOSTS;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. JWT TENANT ISOLATION STRESS TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. JWT Tenant Isolation & Boundary Enforcements', () => {
    it('3.1: Enforces 403 Forbidden when Tenant A tries to query Tenant B live-state', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/cfo-engine/live-state/${tenantB_OrgId}`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('3.2: Enforces 403 Forbidden when Tenant A tries to query Tenant B financial-metrics endpoints', async () => {
      const endpoints = [
        `/api/financial-metrics/${tenantB_OrgId}/latest`,
        `/api/financial-metrics/${tenantB_OrgId}/dashboard`,
        `/api/financial-metrics/${tenantB_OrgId}/history`,
      ];

      for (const endpoint of endpoints) {
        const res = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${tenantA_Token}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Cross-tenant access forbidden');
      }
    });

    it('3.3: Prevents cross-tenant injection during invoice creation (POST /api/invoices)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_Token}`)
        .send({
          invoiceNumber: `INV-TIER5-${Date.now()}`,
          amount: 5000,
          customerName: 'Cross Tenant Target Customer',
          dueDate: new Date().toISOString(),
          organizationId: tenantB_OrgId, // Intentional malicious cross-tenant injection
        });

      if (res.status === 201) {
        // If created, backend must have overridden organizationId with tenantA_OrgId
        expect(res.body.organizationId).toBe(tenantA_OrgId);
        expect(res.body.organizationId).not.toBe(tenantB_OrgId);
      } else {
        // Or rejected with validation / forbidden
        expect([400, 403]).toContain(res.status);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CORRELATION ID RESPONSE HEADERS & LOGGING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Correlation ID Response Headers & Logging', () => {
    it('4.1: Generates UUID x-correlation-id header when none supplied in request', async () => {
      const res = await request(app.getHttpServer()).get('/api/tier5-non-existent-route');

      expect(res.status).toBe(404);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
      expect(res.headers['x-correlation-id'].length).toBeGreaterThan(15);
      expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
    });

    it('4.2: Echoes back custom x-correlation-id header supplied in request', async () => {
      const customCorrelationId = 'tier5-custom-correlation-id-998877';

      const res = await request(app.getHttpServer())
        .get('/api/tier5-non-existent-route')
        .set('x-correlation-id', customCorrelationId);

      expect(res.status).toBe(404);
      expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
      expect(res.body.correlationId).toBe(customCorrelationId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. 2-DECIMAL FINANCIAL ROUNDING & DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. 2-Decimal Financial Rounding & Floating-Point Determinism', () => {
    it('5.1: Eliminates IEEE 754 precision drift across 1,000 cumulative additions', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum = roundToTwoDecimals(sum + 0.1);
      }
      expect(sum).toBe(100.0);
      expect(sum.toString()).toBe('100');
    });

    it('5.2: Accurately rounds boundary values and fractional cents', () => {
      expect(roundToTwoDecimals(100.005)).toBe(100.01);
      expect(roundToTwoDecimals(100.004)).toBe(100.0);
      expect(roundToTwoDecimals(1234.56789)).toBe(1234.57);
      expect(roundToTwoDecimals(0.0000001)).toBe(0);
      expect(roundToTwoDecimals(-99.999)).toBe(-100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SHA-256 STABLE TRANSACTION IDS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6. SHA-256 Stable Transaction IDs & Deduplication', () => {
    it('6.1: Generates identical SHA-256 transaction ID for identical voucher details when MASTERID is missing', () => {
      const rawVoucher = {
        VOUCHERNUMBER: 'VCH-2026-999',
        AMOUNT: '15000',
        DATE: '20260728',
        PARTYLEDGERNAME: 'ACME Corp',
        VOUCHERTYPENAME: 'Payment',
      };
      const orgId = 'org-sha256-test';

      const tx1 = tallyTransformer.transformVoucherToCanonicalTransaction(rawVoucher, orgId);
      const tx2 = tallyTransformer.transformVoucherToCanonicalTransaction(rawVoucher, orgId);

      const expectedSeed = `${orgId}_VCH-2026-999_15000_20260728`;
      const expectedHash = createHash('sha256').update(expectedSeed).digest('hex');
      const expectedId = `TALLY-VCH-${expectedHash}`;

      expect(tx1.id).toBe(expectedId);
      expect(tx2.id).toBe(expectedId);
      expect(tx1.id).toBe(tx2.id); // Strict immutability and idempotency
    });

    it('6.2: Generates distinct SHA-256 transaction IDs for different voucher numbers or amounts', () => {
      const orgId = 'org-sha256-test';
      const vchA = { VOUCHERNUMBER: 'VCH-1', AMOUNT: '100', DATE: '20260728' };
      const vchB = { VOUCHERNUMBER: 'VCH-2', AMOUNT: '100', DATE: '20260728' };

      const txA = tallyTransformer.transformVoucherToCanonicalTransaction(vchA, orgId);
      const txB = tallyTransformer.transformVoucherToCanonicalTransaction(vchB, orgId);

      expect(txA.id).not.toBe(txB.id);
    });
  });
});
