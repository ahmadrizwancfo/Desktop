import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScenariosService } from '../scenario-library/scenarios.service';
import { TruthDatasetService } from '../truth-dataset/truth-dataset.service';
import { DecisionValidatorService } from '../decision-validator/decision-validator.service';
import { ExplainabilityValidatorService } from '../explainability-validator/explainability-validator.service';
import { ConsistencyValidatorService } from '../consistency-validator/consistency-validator.service';
import { LawValidatorService } from '../law-validator/law-validator.service';
import { DynamicsValidatorService } from '../dynamics-validator/dynamics-validator.service';
import { RegressionEngineService } from '../regression/regression-engine.service';
import { BenchmarkEngineService } from '../benchmark/benchmark-engine.service';
import { PerformanceValidatorService } from '../performance/performance-validator.service';
import { QualityDashboardService } from '../dashboard/quality-dashboard.service';
import { ValidationPlatformService } from '../validation-platform.service';

import { MetricsEngineService } from '../../metrics/metrics-engine.service';
import { FinancialFactsEngineService } from '../../facts/financial-facts.service';
import { RuleRegistryService } from '../../semantic/rules/rule-registry.service';
import { BusinessRulesEngineService } from '../../semantic/rules/business-rules-engine.service';
import { FinancialInsightEngineService } from '../../semantic/insights/financial-insight-engine.service';
import { ExplainabilityEngineService } from '../../semantic/explainability/explainability-engine.service';
import { EvidenceEngineService } from '../../cognition/evidence/evidence-engine.service';
import { ConfidenceEngineService } from '../../cognition/confidence/confidence-engine.service';
import { CausalReasoningEngineService } from '../../cognition/causal/causal-reasoning-engine.service';
import { BusinessContextEngineService } from '../../cognition/context/business-context.service';
import { UniversalDecisionService } from '../../cognition/decision/universal-decision.service';
import { DynamicsPlatformService } from '../../dynamics/dynamics-platform.service';
import { CashSystemService } from '../../dynamics/cash-system/cash-system.service';
import { RevenueSystemService } from '../../dynamics/revenue-system/revenue-system.service';
import { GrowthSystemService } from '../../dynamics/growth-system/growth-system.service';
import { WorkingCapitalSystemService } from '../../dynamics/working-capital-system/working-capital-system.service';
import { ExpenseSystemService } from '../../dynamics/expense-system/expense-system.service';
import { HiringSystemService } from '../../dynamics/hiring-system/hiring-system.service';
import { FundingSystemService } from '../../dynamics/funding-system/funding-system.service';
import { ComplianceSystemService } from '../../dynamics/compliance-system/compliance-system.service';
import { CustomerEconomicsService } from '../../dynamics/customer-economics/customer-economics.service';
import { VendorEconomicsService } from '../../dynamics/vendor-economics/vendor-economics.service';
import { DependencyGraphService } from '../../dynamics/dependency-graph/dependency-graph.service';
import { FinancialLawsEngineService } from '../../dynamics/financial-laws/financial-laws-engine.service';
import { BusinessHealthEngineService } from '../../dynamics/business-health/business-health-engine.service';
import { ValidationModule } from '../validation.module';
import crypto from 'crypto';

describe('Phase 6E Financial Intelligence Validation Framework (FIVF) Test Suite', () => {
  let validationPlatform: ValidationPlatformService;
  let scenariosService: ScenariosService;
  let truthDataset: TruthDatasetService;
  let decisionValidator: DecisionValidatorService;
  let explainabilityValidator: ExplainabilityValidatorService;
  let consistencyValidator: ConsistencyValidatorService;
  let performanceValidator: PerformanceValidatorService;
  let regressionEngine: RegressionEngineService;
  let ruleRegistry: RuleRegistryService;
  let dependencyGraph: DependencyGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ValidationModule],
    }).compile();

    validationPlatform = module.get<ValidationPlatformService>(ValidationPlatformService);
    scenariosService = module.get<ScenariosService>(ScenariosService);
    truthDataset = module.get<TruthDatasetService>(TruthDatasetService);
    decisionValidator = module.get<DecisionValidatorService>(DecisionValidatorService);
    explainabilityValidator = module.get<ExplainabilityValidatorService>(ExplainabilityValidatorService);
    consistencyValidator = module.get<ConsistencyValidatorService>(ConsistencyValidatorService);
    performanceValidator = module.get<PerformanceValidatorService>(PerformanceValidatorService);
    regressionEngine = module.get<RegressionEngineService>(RegressionEngineService);
    ruleRegistry = module.get<RuleRegistryService>(RuleRegistryService);
    dependencyGraph = module.get<DependencyGraphService>(DependencyGraphService);

    scenariosService.onModuleInit();
    truthDataset.onModuleInit();
    ruleRegistry.onModuleInit();
    dependencyGraph.onModuleInit();
  });

  describe('1. Scenario Library & Truth Dataset', () => {
    it('should return deterministic scenarios and truth expectations', () => {
      const scenarios = scenariosService.getAllScenarios();
      expect(scenarios.length).toBeGreaterThan(0);

      const truth = truthDataset.getExpectedOutput('SCEN_SAAS_001');
      expect(truth).toBeDefined();
      expect(truth?.expectedHealthTier).toBe('GOOD');
    });
  });

  describe('2. Decision Validator', () => {
    it('should validate Universal Decision Object completeness and evidence presence', () => {
      const results = decisionValidator.validateDecision({
        decisionId: crypto.randomUUID(),
        organizationId: crypto.randomUUID(),
        title: 'Runway Extension Plan',
        businessProblem: 'Net burn is unsustainable',
        evidence: [
          {
            evidenceId: crypto.randomUUID(),
            source: 'METRIC',
            sourceId: 'NET_BURN',
            description: 'Net Burn = 200k',
            weight: 1.0,
            relevance: 1.0,
            confidence: 1.0,
            freshnessHours: 0,
            traceabilityKey: 'METRIC:NET_BURN',
          },
        ],
        confidence: {
          confidenceScore: 0.95,
          confidenceBand: 'VERY_HIGH',
          factors: {
            dataCompleteness: 1.0,
            dataFreshness: 1.0,
            historicalConsistency: 1.0,
            evidenceQuality: 1.0,
            ruleCertainty: 1.0,
            metricReliability: 1.0,
            coverage: 1.0,
            conflictingEvidencePenalty: 0,
          },
          confidenceExplanation: 'High confidence',
        },
        context: {
          stage: 'SEED',
          businessModel: 'ENTERPRISE_SAAS',
          riskTolerance: 'BALANCED',
          targetRunwayMonths: 12,
          maxAcceptableBurn: 1000000,
          contextMultiplier: 1.0,
        },
        supportingMetrics: { NET_BURN: 200000 },
        supportingFacts: ['RUNWAY_REDUCED'],
        supportingRules: ['RULE_RUNWAY_CRITICAL'],
        supportingInsights: ['insight_1'],
        causalChain: {
          chainFormula: 'Burn -> Cash -> Runway',
          rootCause: 'High burn',
          intermediateCauses: ['Cash down'],
          ultimateEffect: 'Runway down',
          financialImpactEstimate: 600000,
          confidenceScore: 1.0,
        },
        financialImpact: 600000,
        businessImpactNarrative: 'Critical cash impact',
        priority: 10,
        severity: 'CRITICAL',
        recommendedActions: ['Cut discretionary spend'],
        alternativeActions: ['Raise venture debt'],
        recommendedOwner: 'FOUNDER',
        executionTimeline: 'Immediate',
        expectedOutcome: 'Runway extended to 12 months',
        monitoringMetrics: ['NET_BURN'],
        dependencies: ['Board approval'],
        status: 'PROPOSED',
        timestamp: new Date(),
      });

      expect(results.length).toBe(4);
      expect(results.every(r => r.passed)).toBe(true);
    });
  });

  describe('3. Consistency & Performance Validators', () => {
    it('should verify 100% output determinism and performance budget', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 1, b: 'test' };

      const consistencyRes = consistencyValidator.validateConsistency(obj1, obj2);
      expect(consistencyRes.passed).toBe(true);

      const perfRes = performanceValidator.validatePerformanceBudget(15, 100);
      expect(perfRes.passed).toBe(true);
    });
  });

  describe('4. Regression Engine', () => {
    it('should run regression suite across all scenarios with 100% pass rate', () => {
      const regressionRes = regressionEngine.runRegressionSuite();
      expect(regressionRes.passed).toBe(true);
      expect(regressionRes.details).toContain('100.0%');
    });
  });

  describe('5. Full FIVF Platform Suite Execution', () => {
    it('should run full validation suite, generate dashboard, and verify overall suite pass', () => {
      const suiteReport = validationPlatform.runFullValidationSuite('SCEN_SAAS_001');

      expect(suiteReport.overallPassed).toBe(true);
      expect(suiteReport.totalChecksCount).toBeGreaterThan(5);
      expect(suiteReport.dashboardSummary).toContain('FOUNDERCFO FINANCIAL INTELLIGENCE QUALITY DASHBOARD');
      expect(suiteReport.executionTimeMs).toBeLessThan(500);
    });
  });
});
