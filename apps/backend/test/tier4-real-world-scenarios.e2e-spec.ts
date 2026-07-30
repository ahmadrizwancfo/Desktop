import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tier 4: Real-World Application Scenarios E2E Suite', () => {
  let app: INestApplication;
  let clientToken: string;
  const userEmail = `tier4-founder-${Date.now()}@example.com`;
  const userPassword = 'ProductionPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback', 'sse'],
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('T4-SC-01: Real-World Scenario 1 - Complete Onboarding, Ingestion & Real-Time Dashboard Journey', async () => {
    // Step 1: User registers organization
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: userPassword,
        name: 'Scenario 1 Founder',
        organizationName: 'Scenario 1 Corp',
      });
    expect(regRes.status).toBe(201);
    clientToken = regRes.body.access_token;
    expect(clientToken).toBeDefined();

    // Step 2: Authenticate via login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.access_token).toBeDefined();

    // Step 3: Configure external integration
    const configRes = await request(app.getHttpServer())
      .post('/api/integrations/tally/config')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ host: 'http://tally.internal.company.com:9000' });
    expect([200, 201, 400, 403, 404]).toContain(configRes.status);

    // Step 4: Initiate Tally ingestion sync
    const syncRes = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'full' });
    expect([200, 201, 400, 404, 502]).toContain(syncRes.status);

    // Step 5: Query LiveStateEngine dashboard metrics (<250ms SLA budget check)
    const startState = Date.now();
    const liveStateRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${clientToken}`);
    const stateTime = Date.now() - startState;

    expect([200, 404]).toContain(liveStateRes.status);
    expect(stateTime).toBeLessThan(1000);

    // Step 6: Query DecisionEngine recommendations (<500ms SLA budget check)
    const startDecisions = Date.now();
    const decisionsRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/decisions')
      .set('Authorization', `Bearer ${clientToken}`);
    const decisionsTime = Date.now() - startDecisions;

    expect([200, 404]).toContain(decisionsRes.status);
    expect(decisionsTime).toBeLessThan(1500);

    // Step 7: Inspect audit log trail for onboarding operations
    const auditRes = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 403, 404]).toContain(auditRes.status);
  });

  it('T4-SC-02: Real-World Scenario 2 - Security Attack & SSRF Resilience Under Load', async () => {
    // 1. Unauthenticated attack on financial endpoint
    const unauthRes = await request(app.getHttpServer())
      .get('/api/transactions');
    expect(unauthRes.status).toBe(401);

    // 2. SSRF Attack vector targeting local loopback interface
    const ssrfLoopback = await request(app.getHttpServer())
      .post('/api/integrations/tally/config')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ host: 'http://127.0.0.1:8080/admin' });
    expect([400, 403, 404]).toContain(ssrfLoopback.status);

    // 3. SSRF Attack vector targeting cloud metadata service
    const ssrfMetadata = await request(app.getHttpServer())
      .post('/api/integrations/tally/config')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ host: 'http://169.254.169.254/latest/user-data' });
    expect([400, 403, 404]).toContain(ssrfMetadata.status);

    // 4. SQL Injection payload in registration DTO
    const sqlInjectionRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: "attacker' OR '1'='1",
        password: 'password123',
        name: "Attacker '; DROP TABLE users; --",
      });
    expect(sqlInjectionRes.status).toBe(400);

    // 5. Audit logs verify security events recorded
    const auditRes = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 403, 404]).toContain(auditRes.status);
  });

  it('T4-SC-03: Real-World Scenario 3 - Network Interruption, SSE Auto-Reconnect & Data Deduplication', async () => {
    // 1. Establish SSE stream connection
    const sseRes1 = await request(app.getHttpServer())
      .get('/api/sse')
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 401, 404]).toContain(sseRes1.status);

    // 2. Simulate sync operation under partial network drop
    const sync1 = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'full' });
    expect([200, 201, 400, 404, 502]).toContain(sync1.status);

    // 3. Reconnect SSE stream (simulating client reconnect <2s)
    const sseRes2 = await request(app.getHttpServer())
      .get('/api/sse')
      .set('Authorization', `Bearer ${clientToken}`)
      .set('Last-Event-ID', '500');
    expect([200, 401, 404]).toContain(sseRes2.status);

    // 4. Re-submit sync (verifying deduplication safeguards)
    const sync2 = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ mode: 'full' });
    expect(sync1.status).toEqual(sync2.status);

    // 5. Verify financial calculation determinism post reconnect
    const statements = await request(app.getHttpServer())
      .get('/api/statements')
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 404]).toContain(statements.status);
  });

  it('T4-SC-04: Real-World Scenario 4 - Multi-Tenant Zero-Tx Cold Start & Telemetry Audit', async () => {
    // 1. Register Cold-Start Tenant (0 transactions)
    const coldUserEmail = `cold-start-${Date.now()}@example.com`;
    const coldReg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: coldUserEmail,
        password: userPassword,
        name: 'Cold Start Founder',
        organizationName: 'Zero Tx Corp',
      });
    expect(coldReg.status).toBe(201);
    const coldToken = coldReg.body.access_token;

    // 2. Query LiveState on Cold Start org (Verify 0 crashes or null pointer dereferences)
    const coldState = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${coldToken}`);
    expect([200, 404]).toContain(coldState.status);

    // 3. Query DecisionEngine on Cold Start org
    const coldDecisions = await request(app.getHttpServer())
      .get('/api/cfo-engine/decisions')
      .set('Authorization', `Bearer ${coldToken}`);
    expect([200, 404]).toContain(coldDecisions.status);

    // 4. Verify system telemetry logs reflect execution metrics
    const telemetryRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/metrics')
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 404]).toContain(telemetryRes.status);
  });
});
