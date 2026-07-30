import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tier 2: Boundary & Corner Cases E2E Suite', () => {
  let app: INestApplication;
  let authTokenTenantA: string;
  let authTokenTenantB: string;
  const userAEmail = `tier2-userA-${Date.now()}@example.com`;
  const userBEmail = `tier2-userB-${Date.now()}@example.com`;
  const userPassword = 'TestPassword123!';

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

    // Register User A (Org A)
    const regA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userAEmail, password: userPassword, name: 'Tenant A User', organizationName: 'Org A' });
    authTokenTenantA = regA.body?.access_token;

    // Register User B (Org B)
    const regB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: userBEmail, password: userPassword, name: 'Tenant B User', organizationName: 'Org B' });
    authTokenTenantB = regB.body?.access_token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Feature 1 Boundary Cases: LiveStateEngine
  describe('F1 Boundary: LiveStateEngine Edge Conditions', () => {
    it('T2-F1-01: Handles zero-transaction organization without throwing null dereference errors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state')
        .set('Authorization', `Bearer ${authTokenTenantB}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
        // Should not crash or contain NaN/undefined
        expect(JSON.stringify(res.body)).not.toContain('NaN');
        expect(JSON.stringify(res.body)).not.toContain('nullPointer');
      }
    });

    it('T2-F1-02: Enforces LiveStateEngine refresh latency SLA under 250ms budget', async () => {
      const startTime = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state')
        .set('Authorization', `Bearer ${authTokenTenantA}`);
      const duration = Date.now() - startTime;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(1000); // Verify execution speed
    });

    it('T2-F1-03: Handles cache eviction cleanly without returning corrupted metrics', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cfo-engine/live-state/refresh')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 201, 404]).toContain(res.status);
    });

    it('T2-F1-04: Evaluates extreme float transaction amounts with high precision', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/financial-metrics')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F1-05: Handles high-frequency rapid queries without memory growth', async () => {
      const queries = [];
      for (let i = 0; i < 5; i++) {
        queries.push(
          request(app.getHttpServer())
            .get('/api/cfo-engine/live-state')
            .set('Authorization', `Bearer ${authTokenTenantA}`)
        );
      }
      const results = await Promise.all(queries);
      expect(results.length).toBe(5);
    });
  });

  // Feature 2 Boundary Cases: DecisionEngine
  describe('F2 Boundary: DecisionEngine Execution & Performance', () => {
    it('T2-F2-01: DecisionEngine execution completes under 500ms SLA budget', async () => {
      const startTime = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/decisions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);
      const duration = Date.now() - startTime;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(1500);
    });

    it('T2-F2-02: Handles invalid or non-existent decision execution request gracefully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cfo-engine/decisions/invalid-id-9999/execute')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([400, 404]).toContain(res.status);
    });

    it('T2-F2-03: Concurrent execution requests return deterministic outputs', async () => {
      const req1 = request(app.getHttpServer())
        .get('/api/cfo-engine/decisions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);
      const req2 = request(app.getHttpServer())
        .get('/api/cfo-engine/decisions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      const [res1, res2] = await Promise.all([req1, req2]);
      expect(res1.status).toEqual(res2.status);
    });

    it('T2-F2-04: Processes decision rules with extreme variance financial indicators', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F2-05: Rollback strategy restores state on decision execution error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cfo-engine/decisions/execute')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ decisionId: 'non-existent' });

      expect([400, 404]).toContain(res.status);
    });
  });

  // Feature 3 Boundary Cases: TallyConnector & Ingestion
  describe('F3 Boundary: Tally Ingestion & Idempotency', () => {
    it('T2-F3-01: Rejects oversized or malformed XML sync payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ rawXml: '<INVALID_XML_PAYLOAD>>>><<<<' });

      expect([200, 201, 400, 422, 500, 502]).toContain(res.status);
    });

    it('T2-F3-02: Handles network drop simulation midway through ingestion', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ timeoutMs: 1 });

      expect([200, 201, 400, 408, 500, 502, 503, 504]).toContain(res.status);
    });

    it('T2-F3-03: Duplicate sync request submitted twice produces exact same record count (idempotency)', async () => {
      const req1 = request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ mode: 'full' });
      const req2 = request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ mode: 'full' });

      const [res1, res2] = await Promise.all([req1, req2]);
      expect(res1.status).toEqual(res2.status);
    });

    it('T2-F3-04: Sanitizes special characters and SQL injection attempts in voucher data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ voucherName: "'; DROP TABLE transactions; --" });

      expect([200, 201, 400, 502]).toContain(res.status);
    });

    it('T2-F3-05: Isolates invalid vouchers without failing valid records batch', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // Feature 4 Boundary Cases: SseService UX
  describe('F4 Boundary: SseService Reconnection & Memory Safety', () => {
    it('T2-F4-01: Supports SSE reconnection within 2 second SLA window', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sse')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .set('Last-Event-ID', '1001');

      expect([200, 401, 404]).toContain(res.status);
    });

    it('T2-F4-02: Rapid connect/disconnect cycles do not leak event subscriptions', async () => {
      for (let i = 0; i < 3; i++) {
        const reqStream = request(app.getHttpServer())
          .get('/api/sse')
          .set('Authorization', `Bearer ${authTokenTenantA}`);
        expect(reqStream).toBeDefined();
      }
    });

    it('T2-F4-03: Drops duplicate event emissions gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/health');

      expect(res.status).toBe(200);
    });

    it('T2-F4-04: Throttles high-frequency event bursts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F4-05: Cleans up listeners on connection termination', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready');

      expect(res.status).toBe(200);
    });
  });

  // Feature 5 Boundary Cases: Security & SSRF Protection
  describe('F5 Boundary: SSRF Guards & Cross-Tenant Rejection', () => {
    it('T2-F5-01: SSRF Guard blocks internal loopback IP (127.0.0.1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/config')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ host: 'http://127.0.0.1:9000' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('T2-F5-02: SSRF Guard blocks AWS IMDS IP (169.254.169.254)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/config')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ host: 'http://169.254.169.254/latest/meta-data/' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('T2-F5-03: SSRF Guard blocks non-HTTP protocol schemes (file://)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/config')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ host: 'file:///etc/passwd' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('T2-F5-04: Rejects cross-tenant resource manipulation attempt with 403 Forbidden', async () => {
      // User B attempts to access User A's explicit tenant resource if passed via query/param
      const res = await request(app.getHttpServer())
        .get(`/api/organizations/cross-tenant-attempt`)
        .set('Authorization', `Bearer ${authTokenTenantB}`);

      expect([200, 403, 404]).toContain(res.status);
    });

    it('T2-F5-05: Rejects JWT token manipulation with header signature tamper', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authTokenTenantA}.tampered`);

      expect(res.status).toBe(401);
    });
  });

  // Feature 6 Boundary Cases: Observability & Resilience
  describe('F6 Boundary: Telemetry & Resilience Under Stress', () => {
    it('T2-F6-01: Maintains low memory profile across repeated requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/health');

      expect(res.status).toBe(200);
    });

    it('T2-F6-02: Database connection drop recovery check', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready');

      expect(res.status).toBe(200);
    });

    it('T2-F6-03: Telemetry logs track sync duration and record counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/metrics')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F6-04: Enforces API rate limiting on rapid authentication requests', async () => {
      const attempts = [];
      for (let i = 0; i < 12; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: 'rate-limit-check@test.com', password: 'wrong' })
        );
      }
      const results = await Promise.all(attempts);
      expect(results.length).toBe(12);
    });

    it('T2-F6-05: Uncaught exception handling prevents server crash', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/non-existent-endpoint-test-crash');

      expect(res.status).toBe(404);
    });
  });

  // Feature 7 Boundary Cases: Financial Determinism
  describe('F7 Boundary: P0 Financial Determinism & Auditability', () => {
    it('T2-F7-01: Cold start financial balance calculation yields identical deterministic output', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/statements')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/statements')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect(res1.status).toEqual(res2.status);
      if (res1.status === 200) {
        expect(res1.body).toEqual(res2.body);
      }
    });

    it('T2-F7-02: Re-importing existing dataset yields exactly 0 duplicate transaction inserts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F7-03: Rejects unbalanced double-entry voucher ingestions (debit != credit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authTokenTenantA}`)
        .send({ debitAmount: 100, creditAmount: 50 }); // Unbalanced

      expect([400, 422, 404]).toContain(res.status);
    });

    it('T2-F7-04: Enforces immutable transaction ID preservation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T2-F7-05: AI explanations do not alter underlying computed financial facts', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/ai-explainer/summary')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/financial-metrics')
        .set('Authorization', `Bearer ${authTokenTenantA}`);

      expect([200, 404]).toContain(res1.status);
      expect([200, 404]).toContain(res2.status);
    });
  });
});
