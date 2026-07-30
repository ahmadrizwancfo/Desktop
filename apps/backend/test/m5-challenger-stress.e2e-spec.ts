import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { LiveStateEngineService } from '../src/cfo-engine/live-state.engine';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { CFOState } from '../src/cfo-engine/cfo-state.service';
import { PrismaService } from '../src/prisma/prisma.service';

const getFrontendFile = (relPath: string) => {
  const p1 = path.resolve(__dirname, '../../apps/frontend', relPath);
  if (fs.existsSync(p1)) return p1;
  return path.resolve(__dirname, '../../../apps/frontend', relPath);
};

describe('Milestone M5 Challenger Empirical Stress Test Suite', () => {
  let app: INestApplication;
  let liveStateEngine: LiveStateEngineService;
  let decisionEngine: DecisionEngineService;
  let prisma: PrismaService;

  let tenantToken: string;
  let tenantOrgId: string;

  const testEmail = `m5-challenger-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback'],
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0);

    liveStateEngine = app.get<LiveStateEngineService>(LiveStateEngineService);
    decisionEngine = app.get<DecisionEngineService>(DecisionEngineService);
    prisma = app.get<PrismaService>(PrismaService);

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'M5 Challenger User',
        organizationName: 'M5 Challenger Org',
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
  // REQUIREMENT 1: SSE QUERY PARAMETER TOKEN CONNECTION & RECONNECTION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. SSE Query Parameter Token Connection & Reconnection', () => {
    it('1.1: Successfully connects to SSE stream using ?token=<jwt_token> query parameter', (done) => {
      const server = app.getHttpServer();
      const address = server?.address();
      const port = address && typeof address === 'object' ? address.port : 3000;

      const req = http.get(`http://127.0.0.1:${port}/api/sse/stream?token=${tenantToken}`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        req.destroy();
        done();
      });

      req.on('error', (err) => {
        if (req.destroyed) return;
        done(err);
      });
    }, 10000);

    it('1.2: Rejects SSE connection with invalid ?token= parameter with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/api/sse/stream?token=invalid_token_xyz');
      expect(res.status).toBe(401);
    });

    it('1.3: Verifies frontend hook use-living-dashboard.ts configures sub-2s auto-reconnection (1500ms)', () => {
      const hookPath = getFrontendFile('src/hooks/use-living-dashboard.ts');
      expect(fs.existsSync(hookPath)).toBe(true);

      const content = fs.readFileSync(hookPath, 'utf8');
      expect(content).toContain('1500'); // 1500ms reconnect timer
      expect(content).toContain('?token='); // ?token= query parameter extraction
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENT 2: PERFORMANCE SLAs (LiveState Engine < 250ms, Decision Engine < 500ms)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Engine Performance SLAs', () => {
    it('2.1: LiveStateEngine DB hydration completes well under 250ms SLA', async () => {
      await liveStateEngine.hydrateStateFromDb(tenantOrgId);
      const startTime = performance.now();
      const snapshot = await liveStateEngine.hydrateStateFromDb(tenantOrgId);
      const duration = performance.now() - startTime;

      console.log(`[STRESS METRIC M5] LiveStateEngine DB Hydration: ${duration.toFixed(2)}ms (SLA: <250ms)`);
      expect(snapshot).toBeDefined();
      expect(duration).toBeLessThan(250);
    });

    it('2.2: DecisionEngine execution completes well under 500ms SLA', async () => {
      const mockState: CFOState = {
        organizationId: tenantOrgId,
        companyStatus: 'stable',
        founderPersona: 'disciplined',
        summary: {
          cashInBank: 5000000,
          monthlyRevenue: 800000,
          monthlyExpenses: 600000,
          netBurn: -200000,
          runwayMonths: 25,
          burnTrend: 'stable',
          revenueTrend: 'growing',
        },
        deathClock: { daysLeft: 750, isCritical: false, formattedDate: '2028-08-01' },
        trust: { dataQuality: 'high', score: 95, summary: 'Clean data' },
        primaryRisk: { type: 'none', message: 'No critical risk', severity: 'low' },
        receivables: { totalOutstanding: 50000, overdue: 0 },
        narrative: { headline: 'Healthy financial state', summary: 'Runway is robust.' },
        negativeTrends: [],
        decisionMemory: { pendingDecisions: 0 },
        dynamicConfidence: { score: 95, factors: [], warnings: [] },
      };

      const startTime = performance.now();
      const output = decisionEngine.generateDecisions(mockState);
      const duration = performance.now() - startTime;

      console.log(`[STRESS METRIC M5] DecisionEngine Execution: ${duration.toFixed(2)}ms (SLA: <500ms)`);
      expect(output).toBeDefined();
      expect(duration).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENT 3: ZERO FRONTEND MOCK DATA FALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Zero Frontend Mock Financial Data Verification', () => {

    it('3.1: Confirms MOCK_DASHBOARD_DATA constant is purged from financial-service.ts', () => {
      const filePath = getFrontendFile('src/services/financial-service.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('MOCK_DASHBOARD_DATA');
    });

    it('3.2: Confirms mockMetrics and mockReadiness are purged from investor-readiness/page.tsx', () => {
      const filePath = getFrontendFile('src/app/investor-readiness/page.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('mockMetrics');
      expect(content).not.toContain('mockReadiness');
    });

    it('3.3: Confirms mockAuditLogs is purged from settings/audit-trail/page.tsx', () => {
      const filePath = getFrontendFile('src/app/settings/audit-trail/page.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('mockAuditLogs');
    });

    it('3.4: Confirms DefaultCashFlowForecast mock wrapper is purged from cash-flow-forecast.tsx', () => {
      const filePath = getFrontendFile('src/components/dashboard/cash-flow-forecast.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('DefaultCashFlowForecast');
    });

    it('3.5: Confirms DefaultMonthlyComparison mock wrapper is purged from monthly-comparison.tsx', () => {
      const filePath = getFrontendFile('src/components/dashboard/monthly-comparison.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('DefaultMonthlyComparison');
    });

    it('3.6: Confirms generateDrillDownData mock function is purged from why-drill-down.tsx', () => {
      const filePath = getFrontendFile('src/components/dashboard/why-drill-down.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('generateDrillDownData');
      expect(content).toContain('fetchDrillDownData');
    });

    it('3.7: Confirms handleMockConnect is purged from integrations/page.tsx', () => {
      const filePath = getFrontendFile('src/app/(dashboard)/integrations/page.tsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('handleMockConnect');
    });
  });
});
