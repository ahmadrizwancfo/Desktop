import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../apps/backend/src/app.module';
import { TallyClient } from '../apps/backend/src/integrations/tally/tally-client';
import { SseService } from '../apps/backend/src/sse/sse.service';
import { DecisionEngineService } from '../apps/backend/src/cfo-engine/decision-engine.service';
import { TallyConnectorService } from '../apps/backend/src/integrations/tally/tally-connector.service';
import { LiveStateEngineService } from '../apps/backend/src/cfo-engine/live-state.engine';
import { GlobalExceptionFilter } from '../apps/backend/src/common/filters/global-exception.filter';

async function runEmpiricalTests() {
  console.log('================================================================');
  console.log('EMPIRICAL STRESS TEST SUITE — MILESTONE M6 OBSERVABILITY & READINESS');
  console.log('================================================================\n');

  const capturedLogs: string[] = [];
  const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation((msg: string) => {
    capturedLogs.push(String(msg));
  });
  const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation((msg: string) => {
    capturedLogs.push(String(msg));
  });
  const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((msg: string) => {
    capturedLogs.push(String(msg));
  });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(0);

  const tallyClient = app.get<TallyClient>(TallyClient);
  const sseService = app.get<SseService>(SseService);
  const decisionEngine = app.get<DecisionEngineService>(DecisionEngineService);
  const tallyConnector = app.get<TallyConnectorService>(TallyConnectorService);
  const liveStateEngine = app.get<LiveStateEngineService>(LiveStateEngineService);

  // ---------------------------------------------------------------------------
  // CHECK 2: CORRELATION ID IN HTTP RESPONSE HEADERS
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 2: Correlation ID Header Verification ---');

  // Test 2A: Exception Response (404)
  const errRes = await request(app.getHttpServer()).get('/health/non-existent-route-999');
  console.log(`404 Exception Response Status: ${errRes.status}`);
  console.log(`404 Exception Response x-correlation-id Header: ${errRes.headers['x-correlation-id']}`);
  console.log(`404 Exception Response Body correlationId: ${errRes.body?.correlationId}`);

  // Test 2B: Successful Response (200 OK on GET /health)
  const okRes = await request(app.getHttpServer()).get('/health');
  console.log(`200 OK Response Status: ${okRes.status}`);
  console.log(`200 OK Response x-correlation-id Header: ${okRes.headers['x-correlation-id']}`);

  const check2Pass = !!errRes.headers['x-correlation-id'] && !!okRes.headers['x-correlation-id'];
  console.log(`--> CHECK 2 RESULT: ${check2Pass ? 'PASS' : 'FAIL (Missing x-correlation-id on 200 OK responses!)'}\n`);

  // ---------------------------------------------------------------------------
  // CHECK 3: TALLY CLIENT RETRY BACKOFF ON TRANSIENT ERRORS
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 3: Tally Client Retry Backoff Verification ---');
  process.env.TALLY_ALLOWED_INTERNAL_HOSTS = '127.0.0.1:59999';
  const dummyHost = 'http://127.0.0.1:59999';

  const startTime = Date.now();
  let tallyError: any = null;
  try {
    await tallyClient.sendTallyXmlRequest({ tallyHostUrl: dummyHost }, '<ENVELOPE></ENVELOPE>');
  } catch (err: any) {
    tallyError = err;
  }
  const elapsed = Date.now() - startTime;
  console.log(`Tally Client request error thrown: ${tallyError?.message}`);
  console.log(`Tally Client retry total elapsed time: ${elapsed}ms`);

  const attempt1Log = capturedLogs.find((l) => l.includes('Tally Connection Attempt 1/3 failed'));
  const attempt2Log = capturedLogs.find((l) => l.includes('Tally Connection Attempt 2/3 failed'));
  console.log(`Attempt 1 log found: ${!!attempt1Log}`);
  console.log(`Attempt 2 log found: ${!!attempt2Log}`);

  const check3Pass = elapsed >= 250 && !!attempt1Log && !!attempt2Log;
  console.log(`--> CHECK 3 RESULT: ${check3Pass ? 'PASS' : 'FAIL'}\n`);

  // ---------------------------------------------------------------------------
  // CHECK 4: STRUCTURED [TELEMETRY] LOGS EMISSION
  // ---------------------------------------------------------------------------
  console.log('--- CHECK 4: Structured [TELEMETRY] Logs Verification ---');
  capturedLogs.length = 0; // reset logs

  // 4A. Decision Engine telemetry
  const dummyOrgId = 'telemetry-test-org-123';
  await decisionEngine.runwayRecalculated({ organizationId: dummyOrgId });

  // 4B. LiveState Engine telemetry
  await liveStateEngine.getLiveState(dummyOrgId);

  // 4C. Tally Sync telemetry
  await tallyConnector.syncTallyVouchers(dummyOrgId, { tallyHostUrl: 'http://localhost:9000' });

  // 4D. SSE Telemetry
  const mockRes = { setHeader: () => {}, write: () => {} } as any;
  const mockReq = { on: () => {} } as any;
  sseService.addClient(dummyOrgId, mockRes, mockReq);
  sseService.emitToOrganization(dummyOrgId, 'state.updated', { test: true });

  const telemetryLogs = capturedLogs.filter((l) => l.includes('[TELEMETRY]'));
  console.log(`Captured ${telemetryLogs.length} [TELEMETRY] log lines:`);
  telemetryLogs.forEach((l) => console.log(`  - ${l}`));

  const check4Pass = telemetryLogs.length >= 3;
  console.log(`--> CHECK 4 RESULT: ${check4Pass ? 'PASS' : 'FAIL'}\n`);

  await app.close();
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
}

runEmpiricalTests().catch(console.error);
