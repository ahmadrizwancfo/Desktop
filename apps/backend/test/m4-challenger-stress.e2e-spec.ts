import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { AppModule } from '../src/app.module';
import { TallyClient } from '../src/integrations/tally/tally-client';

describe('Milestone M4 Challenger Security & SSRF Empirical Stress Test Suite', () => {
  let app: INestApplication;
  let tallyClient: TallyClient;

  let tenantA_Token: string;
  let tenantA_OrgId: string;

  let tenantB_Token: string;
  let tenantB_OrgId: string;

  let tenantA_BankAccountId: string;
  let tenantA_InvoiceId: string;

  const emailA = `m4-orgA-${Date.now()}@example.com`;
  const emailB = `m4-orgB-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback', 'sse', 'sse/stream'],
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);

    tallyClient = app.get<TallyClient>(TallyClient);

    // 1. Register Org A
    const regA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailA, password, name: 'Tenant A User', organizationName: 'Org A' });

    tenantA_Token = regA.body?.access_token;
    tenantA_OrgId = regA.body?.user?.organizationId || regA.body?.user?.organization?.id;

    // 2. Register Org B
    const regB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: emailB, password, name: 'Tenant B User', organizationName: 'Org B' });

    tenantB_Token = regB.body?.access_token;
    tenantB_OrgId = regB.body?.user?.organizationId || regB.body?.user?.organization?.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENT 2: CROSS-TENANT AUTHORIZATION CHECKS (403 FORBIDDEN VERIFICATION)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Cross-Tenant Authorization Checks', () => {
    it('2.1: Rejects Org-A JWT accessing Org-B Live State endpoint (/api/cfo-engine/live-state/:orgBId) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/cfo-engine/live-state/${tenantB_OrgId}`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.2: Rejects Org-A JWT accessing Org-B Financial Metrics latest (/api/financial-metrics/:orgBId/latest) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/financial-metrics/${tenantB_OrgId}/latest`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.3: Rejects Org-A JWT accessing Org-B Financial Metrics dashboard (/api/financial-metrics/:orgBId/dashboard) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/financial-metrics/${tenantB_OrgId}/dashboard`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.4: Rejects Org-A JWT accessing Org-B Financial Metrics history (/api/financial-metrics/:orgBId/history) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/financial-metrics/${tenantB_OrgId}/history`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.5: Rejects Org-A JWT overriding query parameter organizationId in Bank Accounts (/api/bank-accounts?organizationId=:orgBId) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/bank-accounts?organizationId=${tenantB_OrgId}`)
        .set('Authorization', `Bearer ${tenantA_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.6: Creating bank account with foreign organizationId overrides to authenticated orgId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bank-accounts')
        .set('Authorization', `Bearer ${tenantA_Token}`)
        .send({
          name: 'Primary HDFC Account',
          bankName: 'HDFC Bank',
          accountNumber: '1234567890',
          balance: 100000,
          currency: 'INR',
          organizationId: tenantB_OrgId, // Maliciously attempting to inject into Org-B
        });

      expect(res.status).toBe(201);
      expect(res.body.organizationId).toBe(tenantA_OrgId);
      expect(res.body.organizationId).not.toBe(tenantB_OrgId);
      tenantA_BankAccountId = res.body.id;
    });

    it('2.7: Creating invoice with foreign organizationId overrides to authenticated orgId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_Token}`)
        .send({
          invoiceNumber: `INV-CROSS-${Date.now()}`,
          amount: 5000,
          status: 'DRAFT',
          dueDate: new Date().toISOString(),
          organizationId: tenantB_OrgId, // Maliciously attempting to assign invoice to Org-B
        });

      expect(res.status).toBe(201);
      expect(res.body.organizationId).toBe(tenantA_OrgId);
      expect(res.body.organizationId).not.toBe(tenantB_OrgId);
      tenantA_InvoiceId = res.body.id;
    });

    it('2.8: Rejects Org-B JWT accessing Org-A single bank account (/api/bank-accounts/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/bank-accounts/${tenantA_BankAccountId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.9: Rejects Org-B JWT updating Org-A single bank account (/api/bank-accounts/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/bank-accounts/${tenantA_BankAccountId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.10: Rejects Org-B JWT deleting Org-A single bank account (/api/bank-accounts/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/bank-accounts/${tenantA_BankAccountId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.11: Rejects Org-B JWT accessing Org-A single invoice (/api/invoices/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/invoices/${tenantA_InvoiceId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.12: Rejects Org-B JWT updating Org-A single invoice (/api/invoices/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/invoices/${tenantA_InvoiceId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`)
        .send({ amount: 99999 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });

    it('2.13: Rejects Org-B JWT deleting Org-A single invoice (/api/invoices/:id) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/invoices/${tenantA_InvoiceId}`)
        .set('Authorization', `Bearer ${tenantB_Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cross-tenant access forbidden');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENT 3: SSRF PROTECTION IN tally-client.ts
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. SSRF Protection Stress-Testing in tally-client.ts', () => {
    it('3.1: Blocks Cloud Metadata IP (169.254.169.254)', async () => {
      const target = 'http://169.254.169.254/latest/meta-data/';
      const check = await tallyClient.validateTallyHostUrl(target);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Forbidden cloud metadata');

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: target, enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });

    it('3.2: Blocks Loopback IP (127.0.0.1) and localhost', async () => {
      const loopbackIp = 'http://127.0.0.1:9000';
      const checkIp = await tallyClient.validateTallyHostUrl(loopbackIp);
      expect(checkIp.isValid).toBe(false);
      expect(checkIp.reason).toContain('Forbidden loopback IP');

      const localhostName = 'http://localhost:9000';
      const checkHost = await tallyClient.validateTallyHostUrl(localhostName);
      expect(checkHost.isValid).toBe(false);
      expect(checkHost.reason).toContain('Forbidden loopback target');

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: loopbackIp, enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });

    it('3.3: Blocks Private IP range (10.0.0.1)', async () => {
      const privateIp = 'http://10.0.0.1:9000';
      const check = await tallyClient.validateTallyHostUrl(privateIp);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain('Forbidden private IP range');

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: privateIp, enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });

    it('3.4: Blocks forbidden protocol scheme (gopher://)', async () => {
      const gopherUrl = 'gopher://10.0.0.1:70/1';
      const check = await tallyClient.validateTallyHostUrl(gopherUrl);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain("Invalid protocol scheme 'gopher:'");

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: gopherUrl, enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });

    it('3.5: Blocks forbidden protocol scheme (file://)', async () => {
      const fileUrl = 'file:///etc/passwd';
      const check = await tallyClient.validateTallyHostUrl(fileUrl);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain("Invalid protocol scheme 'file:'");

      await expect(
        tallyClient.sendTallyXmlRequest({ tallyHostUrl: fileUrl, enabled: true }, '<ENVELOPE/>')
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENT 4: SSE AUTHENTICATION QUERY PARAMETER TOKEN EXTRACTION (?token=)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. SSE Authentication Query Parameter Token Extraction', () => {
    it('4.1: Successfully authenticates SSE connection using ?token=<jwt_token> query param', (done) => {
      const server = app.getHttpServer();
      const address = server?.address();
      const port = address && typeof address === 'object' ? address.port : 3000;

      const req = http.get(`http://127.0.0.1:${port}/sse/stream?token=${tenantA_Token}`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        res.destroy();
        req.destroy();
        done();
      });
      req.on('error', (err) => {
        if (req.destroyed) return;
        done(err);
      });
    });

    it('4.2: Rejects SSE connection with invalid ?token= parameter with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/sse/stream?token=invalid_jwt_token_payload');

      expect(res.status).toBe(401);
    });

    it('4.3: Rejects SSE connection missing authorization header and query token with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/sse/stream');

      expect(res.status).toBe(401);
    });
  });
});
