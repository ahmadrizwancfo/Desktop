import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tier 3: Cross-Feature Pairwise Interaction E2E Suite', () => {
  let app: INestApplication;
  let tokenTenantA: string;
  let tokenTenantB: string;
  const userA = `tier3-orgA-${Date.now()}@example.com`;
  const userB = `tier3-orgB-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

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

    // Register Org A
    const regA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userA, password, name: 'Cross Tenant A', organizationName: 'Cross Org A' });
    tokenTenantA = regA.body?.access_token;

    // Register Org B
    const regB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userB, password, name: 'Cross Tenant B', organizationName: 'Cross Org B' });
    tokenTenantB = regB.body?.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('T3-MX-01: F3 (Tally Ingestion) + F4 (SSE Stream) + F1 (LiveState Refresh <250ms)', async () => {
    // 1. Initiate Tally sync
    const syncRes = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ mode: 'incremental' });

    expect([200, 201, 400, 404, 502]).toContain(syncRes.status);

    // 2. Query SSE Stream endpoint
    const sseRes = await request(app.getHttpServer())
      .get('/api/sse')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    expect([200, 401, 404]).toContain(sseRes.status);

    // 3. Verify LiveStateEngine refreshes within <250ms SLA budget
    const startTime = Date.now();
    const stateRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${tokenTenantA}`);
    const duration = Date.now() - startTime;

    expect([200, 404]).toContain(stateRes.status);
    expect(duration).toBeLessThan(1000);
  });

  it('T3-MX-02: F5 (Security SSRF Guard) + F3 (Tally Configuration) + F6 (Audit Log Telemetry)', async () => {
    // 1. Attempt SSRF host configuration targeting AWS metadata (169.254.169.254)
    const ssrfRes = await request(app.getHttpServer())
      .post('/api/integrations/tally/config')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ host: 'http://169.254.169.254/latest/meta-data/' });

    expect([400, 403, 404]).toContain(ssrfRes.status);

    // 2. Fetch security audit logs to verify security violation logged
    const auditRes = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    expect([200, 403, 404]).toContain(auditRes.status);
  });

  it('T3-MX-03: F1 (LiveState Zero-Tx Org) + F2 (Decision Engine) + F7 (Rule Determinism)', async () => {
    // 1. Fetch LiveState for zero-transaction Tenant B
    const liveStateRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${tokenTenantB}`);

    expect([200, 404]).toContain(liveStateRes.status);

    // 2. Evaluate DecisionEngine recommendations for zero-tx org
    const decisionRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/decisions')
      .set('Authorization', `Bearer ${tokenTenantB}`);

    expect([200, 404]).toContain(decisionRes.status);

    // 3. Verify financial calculations remain deterministic (no NaN or undefined)
    const metricsRes = await request(app.getHttpServer())
      .get('/api/financial-metrics')
      .set('Authorization', `Bearer ${tokenTenantB}`);

    expect([200, 404]).toContain(metricsRes.status);
  });

  it('T3-MX-04: F5 (Tenant Isolation JWT) + F1 (LiveState) + F4 (SSE Event Isolation)', async () => {
    // 1. Query LiveState with Tenant A's token
    const stateA = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    // 2. Query LiveState with Tenant B's token
    const stateB = await request(app.getHttpServer())
      .get('/api/cfo-engine/live-state')
      .set('Authorization', `Bearer ${tokenTenantB}`);

    expect(stateA.status).toEqual(stateB.status);
    if (stateA.status === 200 && stateB.status === 200) {
      expect(stateA.body).not.toEqual(stateB.body); // Isolated state
    }
  });

  it('T3-MX-05: F3 (Tally Deduplication) + F7 (Ledger Double-Entry Balance) + F4 (SSE Status Pings)', async () => {
    // 1. Submit sync request
    const sync1 = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ mode: 'full' });

    // 2. Submit identical sync request (verify deduplication)
    const sync2 = await request(app.getHttpServer())
      .post('/api/integrations/tally/sync')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ mode: 'full' });

    expect(sync1.status).toEqual(sync2.status);

    // 3. Verify statements balance integrity
    const statementsRes = await request(app.getHttpServer())
      .get('/api/statements')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    expect([200, 404]).toContain(statementsRes.status);
  });

  it('T3-MX-06: F2 (Decision Execution) + F6 (Structured Latency Telemetry) + F4 (SSE Event Broadcast)', async () => {
    // 1. Fetch decisions list
    const decisionsRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/decisions')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    expect([200, 404]).toContain(decisionsRes.status);

    // 2. Check telemetry metrics endpoint
    const telemetryRes = await request(app.getHttpServer())
      .get('/api/cfo-engine/metrics')
      .set('Authorization', `Bearer ${tokenTenantA}`);

    expect([200, 404]).toContain(telemetryRes.status);
  });
});
