import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TallyClient } from '../src/integrations/tally/tally-client';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { TallyConnectorService } from '../src/integrations/tally/tally-connector.service';
import { SseService } from '../src/sse/sse.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Milestone M6 Challenger Empirical Stress & Verification Test Suite', () => {
  let app: INestApplication;
  let tallyClient: TallyClient;
  let decisionEngine: DecisionEngineService;
  let tallyConnector: TallyConnectorService;
  let sseService: SseService;
  let prisma: PrismaService;

  let tenantToken: string;
  let tenantOrgId: string;

  const testEmail = `m6-challenger-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback'],
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);

    tallyClient = app.get<TallyClient>(TallyClient);
    decisionEngine = app.get<DecisionEngineService>(DecisionEngineService);
    tallyConnector = app.get<TallyConnectorService>(TallyConnectorService);
    sseService = app.get<SseService>(SseService);
    prisma = app.get<PrismaService>(PrismaService);

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'M6 Challenger User',
        organizationName: 'M6 Challenger Org',
      });

    tenantToken = regRes.body?.access_token;
    tenantOrgId = regRes.body?.user?.organizationId || regRes.body?.user?.organization?.id;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CORRELATION ID & STRUCTURED JSON ERROR LOGGING VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Correlation ID Header & Structured JSON Error Logging', () => {
    it('1.1: Returns x-correlation-id UUID in response header when request has no x-correlation-id', async () => {
      const res = await request(app.getHttpServer()).get('/api/invalid-m6-test-route');
      expect(res.status).toBe(404);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
      expect(res.headers['x-correlation-id'].length).toBeGreaterThan(10);
      expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
    });

    it('1.2: Preserves incoming x-correlation-id header in HTTP response and error body', async () => {
      const customId = 'm6-custom-correlation-uuid-98765';
      const res = await request(app.getHttpServer())
        .get('/api/invalid-m6-test-route')
        .set('x-correlation-id', customId);

      expect(res.status).toBe(404);
      expect(res.headers['x-correlation-id']).toBe(customId);
      expect(res.body.correlationId).toBe(customId);
    });

    it('1.3: Emits structured JSON log containing timestamp, correlationId, statusCode, method, path', async () => {
      const customId = 'm6-json-log-check-112233';
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      await request(app.getHttpServer())
        .get('/api/invalid-m6-test-route')
        .set('x-correlation-id', customId);

      const calls = loggerSpy.mock.calls.map((c) => c[0]);
      const jsonLogStr = calls.find((l: any) => typeof l === 'string' && l.includes(customId));

      expect(jsonLogStr).toBeDefined();
      const parsed = JSON.parse(jsonLogStr!);
      expect(parsed.correlationId).toBe(customId);
      expect(parsed.statusCode).toBe(404);
      expect(parsed.method).toBe('GET');
      expect(parsed.timestamp).toBeDefined();

      loggerSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TALLY CLIENT RETRY BACKOFF & SSRF GAURD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Tally Client Exponential Backoff Retry & Fail-Fast SSRF Protection', () => {
    it('2.1: Exponential backoff retries 3 attempts on transient network failures', async () => {
      process.env.TALLY_ALLOWED_INTERNAL_HOSTS = '127.0.0.1:59998';
      const dummyHost = 'http://127.0.0.1:59998';

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
      const startTime = Date.now();

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: dummyHost }, '<ENVELOPE/>'),
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(250);

      const calls = loggerSpy.mock.calls.map((c) => c[0]);
      const retryLog1 = calls.find((l: any) => typeof l === 'string' && l.includes('Attempt 1/3 failed'));
      const retryLog2 = calls.find((l: any) => typeof l === 'string' && l.includes('Attempt 2/3 failed'));

      expect(retryLog1).toBeDefined();
      expect(retryLog2).toBeDefined();

      loggerSpy.mockRestore();
      delete process.env.TALLY_ALLOWED_INTERNAL_HOSTS;
    });

    it('2.2: Rejects SSRF target immediately without retrying (fail-fast)', async () => {
      const startTime = Date.now();
      await expect(
        tallyClient.sendTallyXmlRequest(
          { tallyHostUrl: 'http://169.254.169.254/latest/meta-data', enabled: true },
          '<ENVELOPE/>',
        ),
      ).rejects.toThrow(BadRequestException);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. STRUCTURED TELEMETRY LOGGING VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Structured Telemetry Logging Verification', () => {
    it('3.1: Verifies SSE Service telemetry for active connection counts & event lifecycle', (done) => {
      const initialCount = sseService.getActiveConnectionCount();
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      const subscription = sseService.subscribe(tenantOrgId).subscribe(() => {});

      const activeCount = sseService.getActiveConnectionCount();
      expect(activeCount).toBeGreaterThan(initialCount);

      const calls = loggerSpy.mock.calls.map((c) => c[0]);
      const connectLog = calls.find((l: any) =>
        typeof l === 'string' && l.includes('[TELEMETRY] SSE Active Connections:') && l.includes('Client Connected'),
      );
      expect(connectLog).toBeDefined();

      subscription.unsubscribe();
      loggerSpy.mockRestore();
      done();
    });

    it('3.2: Verifies DecisionEngine telemetry log format on decision calculation', async () => {
      // Seed OrgFinancialState so decision engine evaluates state
      await prisma.orgFinancialState.upsert({
        where: { organizationId: tenantOrgId },
        create: {
          organizationId: tenantOrgId,
          cashInBank: 1000000,
          monthlyBurn: 100000,
          runwayDays: 300,
        },
        update: {},
      });

      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await decisionEngine.evaluateStatefulDecisions(tenantOrgId);

      const calls = loggerSpy.mock.calls.map((c) => c[0]);
      const telemetryLog = calls.find((l: any) => typeof l === 'string' && l.includes('[TELEMETRY] DecisionEngine:'));

      expect(telemetryLog).toBeDefined();
      expect(telemetryLog).toContain('duration');
      expect(telemetryLog).toContain('decisionsCount=');
      expect(telemetryLog).toContain(`orgId=${tenantOrgId}`);

      loggerSpy.mockRestore();
    });

    it('3.3: Verifies TallySync telemetry log format on sync execution', async () => {
      process.env.ENABLE_TALLY_INTEGRATION = 'true';
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      const sendSpy = jest.spyOn(tallyClient, 'sendTallyXmlRequest').mockResolvedValue(
        '<ENVELOPE><BODY></BODY></ENVELOPE>'
      );

      await tallyConnector.syncTallyVouchers(tenantOrgId, {
        tallyHostUrl: 'http://tally-telemetry-test.internal:9000',
        enabled: true,
      });

      sendSpy.mockRestore();

      const calls = loggerSpy.mock.calls.map((c) => c[0]);
      const syncTelemetryLog = calls.find((l: any) => typeof l === 'string' && l.includes('[TELEMETRY] TallySync:'));

      expect(syncTelemetryLog).toBeDefined();
      expect(syncTelemetryLog).toContain('duration');
      expect(syncTelemetryLog).toContain('imported 0 records');

      loggerSpy.mockRestore();
      delete process.env.ENABLE_TALLY_INTEGRATION;
    });
  });
});
