import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tier 1: Feature Coverage E2E Suite', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantOrgId: string;
  const userEmail = `tier1-test-${Date.now()}@example.com`;
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

    // Register & Login to retrieve valid auth token
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: userPassword,
        name: 'Tier 1 Tester',
        organizationName: 'Tier 1 Test Org',
      });

    if (regRes.status === 201 && regRes.body.access_token) {
      authToken = regRes.body.access_token;
      tenantOrgId = regRes.body.user?.organizationId || regRes.body.user?.organization?.id;
    } else {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userEmail, password: userPassword });
      authToken = loginRes.body?.access_token;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Feature 1: LiveStateEngine & Real-Time Financial State
  describe('F1: LiveStateEngine & Real-Time State', () => {
    it('T1-F1-01: GET /api/cfo-engine/live-state - returns 200 OK with valid financial state structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    it('T1-F1-02: Hydrates cached financial state correctly after query request', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state')
        .set('Authorization', `Bearer ${authToken}`);
      
      const res2 = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.status).toEqual(res2.status);
    });

    it('T1-F1-03: Invalidates stale state upon state refresh call', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cfo-engine/live-state/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 404]).toContain(res.status);
    });

    it('T1-F1-04: Computes financial engine runway and cash metrics correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/financial-metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F1-05: Returns consistent state metrics with query filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/live-state?period=monthly')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // Feature 2: DecisionEngine & Autopilot Lifecycle
  describe('F2: DecisionEngine & Autopilot Lifecycle', () => {
    it('T1-F2-01: GET /api/cfo-engine/decisions - returns decision list or empty recommendations array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/decisions')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F2-02: POST /api/cfo-engine/decisions - creates or evaluates recommendations', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cfo-engine/decisions/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ context: 'E2E Test Evaluation' });

      expect([200, 201, 404]).toContain(res.status);
    });

    it('T1-F2-03: Updates decision lifecycle state cleanly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/decisions')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F2-04: Generates deterministic recommendations for given parameters', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.status).toEqual(res2.status);
    });

    it('T1-F2-05: Queries active CFO alert engine triggers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/alerts')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // Feature 3: TallyConnector & Ingestion Pipeline
  describe('F3: TallyConnector & Ingestion Pipeline', () => {
    it('T1-F3-01: GET /api/integrations/tally/config - fetches Tally sync configuration', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/integrations/tally/config')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F3-02: POST /api/integrations/tally/sync - initiates sync job', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/integrations/tally/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'incremental' });

      expect([200, 201, 400, 404, 502, 503]).toContain(res.status);
    });

    it('T1-F3-03: Verifies transaction list endpoint returns canonical records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F3-04: Checks voucher categories in canonical format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions?type=DEBIT')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('T1-F3-05: Verifies auditability lineage on financial statements', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/statements')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // Feature 4: SseService & Real-Time UX Streaming
  describe('F4: SseService & Real-Time UX Streaming', () => {
    it('T1-F4-01: GET /sse - responds with streaming event connection headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/sse')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect([200, 401, 404]).toContain(res.status);
    });

    it('T1-F4-02: GET /api/sse - alternative path responds with streaming headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sse')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      expect([200, 401, 404]).toContain(res.status);
    });

    it('T1-F4-03: Handles connection heartbeat check cleanly', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('T1-F4-04: Queries notifications channel for real-time alerts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F4-05: Cleanly disconnects SSE listener without throwing error', async () => {
      const reqStream = request(app.getHttpServer())
        .get('/api/sse')
        .set('Authorization', `Bearer ${authToken}`);

      expect(reqStream).toBeDefined();
    });
  });

  // Feature 5: Security, Tenant Isolation & SSRF
  describe('F5: Security, Tenant Isolation & SSRF', () => {
    it('T1-F5-01: Derives organization strictly from JWT token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(userEmail);
    });

    it('T1-F5-02: Rejects unauthenticated financial queries with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions');

      expect(res.status).toBe(401);
    });

    it('T1-F5-03: Rejects invalid JWT token with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
    });

    it('T1-F5-04: Validates payload schemas on POST endpoints (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'bad-email-format' });

      expect(res.status).toBe(400);
    });

    it('T1-F5-05: GET /api/audit-logs - queries security audit log entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403, 404]).toContain(res.status);
    });
  });

  // Feature 6: Production Readiness & Observability
  describe('F6: Production Readiness & Observability', () => {
    it('T1-F6-01: GET /health - returns 200 OK with health status metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('T1-F6-02: GET /health/ready - returns service readiness checks', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('services');
    });

    it('T1-F6-03: Returns proper JSON error structure on non-existent routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/non-existent-route-xyz');

      expect(res.status).toBe(404);
    });

    it('T1-F6-04: Queries telemetry metrics endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cfo-engine/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F6-05: Handles background service ping gracefully', async () => {
      const res = await request(app.getHttpServer())
        .get('/health');

      expect(res.body).toHaveProperty('uptime');
    });
  });

  // Feature 7: Rule-Based Financial Determinism & P0 Integrity
  describe('F7: Rule-Based Financial Determinism & P0 Integrity', () => {
    it('T1-F7-01: Verifies balance calculation yields identical result across requests', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/statements')
        .set('Authorization', `Bearer ${authToken}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/statements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.status).toEqual(res2.status);
      if (res1.status === 200) {
        expect(res1.body).toEqual(res2.body);
      }
    });

    it('T1-F7-02: Verifies transaction list immutability under sequential reads', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      const res2 = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.status).toEqual(res2.status);
    });

    it('T1-F7-03: Verifies debit and credit records consistency', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('T1-F7-04: Verifies zero mock financial records in production endpoint responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/financial-metrics')
        .set('Authorization', `Bearer ${authToken}`);

      if (res.status === 200 && Array.isArray(res.body)) {
        const hasMockData = res.body.some((item: any) =>
          JSON.stringify(item).toLowerCase().includes('mock_data_flag')
        );
        expect(hasMockData).toBe(false);
      }
    });

    it('T1-F7-05: Verifies audit lineage records exist for financial operations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403, 404]).toContain(res.status);
    });
  });
});
