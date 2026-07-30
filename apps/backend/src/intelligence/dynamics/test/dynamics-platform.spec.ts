import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CashSystemService } from '../cash-system/cash-system.service';
import { RevenueSystemService } from '../revenue-system/revenue-system.service';
import { GrowthSystemService } from '../growth-system/growth-system.service';
import { WorkingCapitalSystemService } from '../working-capital-system/working-capital-system.service';
import { ExpenseSystemService } from '../expense-system/expense-system.service';
import { HiringSystemService } from '../hiring-system/hiring-system.service';
import { FundingSystemService } from '../funding-system/funding-system.service';
import { ComplianceSystemService } from '../compliance-system/compliance-system.service';
import { CustomerEconomicsService } from '../customer-economics/customer-economics.service';
import { VendorEconomicsService } from '../vendor-economics/vendor-economics.service';
import { DependencyGraphService } from '../dependency-graph/dependency-graph.service';
import { FinancialLawsEngineService } from '../financial-laws/financial-laws-engine.service';
import { BusinessHealthEngineService } from '../business-health/business-health-engine.service';
import { DynamicsPlatformService } from '../dynamics-platform.service';
import { IntelligenceBusService } from '../../bus/intelligence-bus.service';
import { MetricsEngineService } from '../../metrics/metrics-engine.service';
import crypto from 'crypto';

describe('Phase 6D Business Dynamics Engine Test Suite', () => {
  let dynamicsPlatform: DynamicsPlatformService;
  let cashSystem: CashSystemService;
  let revenueSystem: RevenueSystemService;
  let dependencyGraph: DependencyGraphService;
  let lawsEngine: FinancialLawsEngineService;
  let healthEngine: BusinessHealthEngineService;
  let metricsEngine: MetricsEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        IntelligenceBusService,
        CashSystemService,
        RevenueSystemService,
        GrowthSystemService,
        WorkingCapitalSystemService,
        ExpenseSystemService,
        HiringSystemService,
        FundingSystemService,
        ComplianceSystemService,
        CustomerEconomicsService,
        VendorEconomicsService,
        DependencyGraphService,
        FinancialLawsEngineService,
        BusinessHealthEngineService,
        DynamicsPlatformService,
        MetricsEngineService,
      ],
    }).compile();

    dynamicsPlatform = module.get<DynamicsPlatformService>(DynamicsPlatformService);
    cashSystem = module.get<CashSystemService>(CashSystemService);
    revenueSystem = module.get<RevenueSystemService>(RevenueSystemService);
    dependencyGraph = module.get<DependencyGraphService>(DependencyGraphService);
    lawsEngine = module.get<FinancialLawsEngineService>(FinancialLawsEngineService);
    healthEngine = module.get<BusinessHealthEngineService>(BusinessHealthEngineService);
    metricsEngine = module.get<MetricsEngineService>(MetricsEngineService);

    dependencyGraph.onModuleInit();
  });

  describe('1. 10 Business System Evaluation', () => {
    it('should evaluate CashSystem and RevenueSystem deterministically', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 5000000,
        monthlyExpenses: 1000000,
        monthlyRevenue: 1500000,
      });

      const cashState = cashSystem.evaluateSystem(metricsMap);
      expect(cashState.systemId).toBe('SYS_CASH');
      expect(cashState.outputs.cashBalance).toBe(5000000);
      expect(cashState.healthScore).toBe(100);

      const revState = revenueSystem.evaluateSystem(metricsMap);
      expect(revState.systemId).toBe('SYS_REVENUE');
      expect(revState.outputs.mrr).toBe(1500000);
    });
  });

  describe('2. Dependency Graph & Cascading Impact Traversal', () => {
    it('should trace cascading impacts from Hiring to Expense to Cash to Funding', () => {
      const steps = dependencyGraph.traceCascadingImpact('SYS_HIRING', 'Payroll Expansion');
      expect(steps.length).toBeGreaterThan(1);
      expect(steps[0].systemId).toBe('SYS_HIRING');
      expect(steps.some(s => s.systemId === 'SYS_EXPENSE')).toBe(true);
      expect(steps.some(s => s.systemId === 'SYS_CASH')).toBe(true);
    });
  });

  describe('3. Financial Laws Engine', () => {
    it('should evaluate 7 immutable laws and flag active law violations', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 300000,
        monthlyExpenses: 200000,
        monthlyRevenue: 50000,
        accountsReceivable: 500000,
      });

      const laws = lawsEngine.evaluateLaws(metricsMap);
      expect(laws.length).toBe(7);

      const burnLaw = laws.find(l => l.identifier === 'LAW_BURN_REDUCES_RUNWAY');
      expect(burnLaw?.isViolated).toBe(true);

      const arLaw = laws.find(l => l.identifier === 'LAW_AR_NOT_LIQUIDITY');
      expect(arLaw?.isViolated).toBe(true);
    });
  });

  describe('4. Business Health Engine', () => {
    it('should compute 9 health dimensions and composite score', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 10000000,
        monthlyExpenses: 1000000,
        monthlyRevenue: 2000000,
      });

      const sysState = cashSystem.evaluateSystem(metricsMap);
      const report = healthEngine.evaluateHealth({
        organizationId: orgId,
        systemStates: [sysState],
        metricsMap,
      });

      expect(report.overallHealthScore).toBeGreaterThanOrEqual(70);
      expect(report.healthTier).toBe('EXCELLENT');
      expect(report.dimensions.liquidity).toBe(100);
    });
  });

  describe('5. Dynamics Platform Orchestrator', () => {
    it('should execute end-to-end Business Dynamics processing and publish health score', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 8000000,
        monthlyExpenses: 1200000,
        monthlyRevenue: 2000000,
      });

      const result = dynamicsPlatform.processBusinessDynamics({
        organizationId: orgId,
        metricsMap,
        triggerSystemId: 'SYS_HIRING',
        impactDescription: 'Software Engineer Hiring Ramp',
      });

      expect(result.organizationId).toBe(orgId);
      expect(result.systemStates.length).toBe(10);
      expect(result.laws.length).toBe(7);
      expect(result.healthReport.overallHealthScore).toBeGreaterThan(0);
      expect(result.cascadingImpacts.length).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
