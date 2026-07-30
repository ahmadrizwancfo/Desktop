import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EvidenceEngineService } from '../evidence/evidence-engine.service';
import { ConfidenceEngineService } from '../confidence/confidence-engine.service';
import { CausalReasoningEngineService } from '../causal/causal-reasoning-engine.service';
import { BusinessContextEngineService } from '../context/business-context.service';
import { ReasoningTreeService } from '../reasoning/reasoning-tree.service';
import { UniversalDecisionService } from '../decision/universal-decision.service';
import { CognitionPlatformService } from '../cognition-platform.service';
import { IntelligenceBusService } from '../../bus/intelligence-bus.service';
import { MetricsEngineService } from '../../metrics/metrics-engine.service';
import { FinancialFactsEngineService } from '../../facts/financial-facts.service';
import { RuleRegistryService } from '../../semantic/rules/rule-registry.service';
import { BusinessRulesEngineService } from '../../semantic/rules/business-rules-engine.service';
import { FinancialInsightEngineService } from '../../semantic/insights/financial-insight-engine.service';
import crypto from 'crypto';

describe('Phase 6C2B Financial Cognitive Engine Test Suite', () => {
  let cognitionPlatform: CognitionPlatformService;
  let evidenceEngine: EvidenceEngineService;
  let confidenceEngine: ConfidenceEngineService;
  let causalEngine: CausalReasoningEngineService;
  let contextEngine: BusinessContextEngineService;
  let reasoningTreeService: ReasoningTreeService;
  let decisionService: UniversalDecisionService;
  let metricsEngine: MetricsEngineService;
  let factsEngine: FinancialFactsEngineService;
  let ruleRegistry: RuleRegistryService;
  let rulesEngine: BusinessRulesEngineService;
  let insightEngine: FinancialInsightEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        IntelligenceBusService,
        EvidenceEngineService,
        ConfidenceEngineService,
        CausalReasoningEngineService,
        BusinessContextEngineService,
        ReasoningTreeService,
        UniversalDecisionService,
        CognitionPlatformService,
        MetricsEngineService,
        FinancialFactsEngineService,
        RuleRegistryService,
        BusinessRulesEngineService,
        FinancialInsightEngineService,
      ],
    }).compile();

    cognitionPlatform = module.get<CognitionPlatformService>(CognitionPlatformService);
    evidenceEngine = module.get<EvidenceEngineService>(EvidenceEngineService);
    confidenceEngine = module.get<ConfidenceEngineService>(ConfidenceEngineService);
    causalEngine = module.get<CausalReasoningEngineService>(CausalReasoningEngineService);
    contextEngine = module.get<BusinessContextEngineService>(BusinessContextEngineService);
    reasoningTreeService = module.get<ReasoningTreeService>(ReasoningTreeService);
    decisionService = module.get<UniversalDecisionService>(UniversalDecisionService);
    metricsEngine = module.get<MetricsEngineService>(MetricsEngineService);
    factsEngine = module.get<FinancialFactsEngineService>(FinancialFactsEngineService);
    ruleRegistry = module.get<RuleRegistryService>(RuleRegistryService);
    rulesEngine = module.get<BusinessRulesEngineService>(BusinessRulesEngineService);
    insightEngine = module.get<FinancialInsightEngineService>(FinancialInsightEngineService);

    ruleRegistry.onModuleInit();
  });

  describe('1. Evidence Engine', () => {
    it('should collect and format evidence items from metrics, facts, rules, and insights', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 300000,
        monthlyExpenses: 200000, // Runway = 1.5 mos -> triggers RULE_RUNWAY_CRITICAL
        monthlyRevenue: 0,
      });

      const facts = factsEngine.evaluateFacts(orgId, [], metricsMap);
      const rules = rulesEngine.getTriggeredRules(facts, metricsMap);
      const insights = insightEngine.generateInsights(orgId, facts, metricsMap, rules);

      const evidence = evidenceEngine.collectEvidence({
        metricsMap,
        facts,
        rules,
        insights,
      });

      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence.some(e => e.source === 'METRIC')).toBe(true);
      expect(evidence.some(e => e.source === 'RULE')).toBe(true);
    });
  });

  describe('2. Universal Confidence Engine', () => {
    it('should evaluate 8 confidence factors and derive score & band', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 5000000,
        monthlyExpenses: 1000000,
        monthlyRevenue: 1500000,
      });

      const evidence = evidenceEngine.collectEvidence({
        metricsMap,
        facts: [],
        rules: [],
        insights: [],
      });

      const evalResult = confidenceEngine.evaluateConfidence({ evidence });

      expect(evalResult.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(evalResult.confidenceBand).toBe('VERY_HIGH');
      expect(evalResult.factors.dataCompleteness).toBe(1.0);
    });
  });

  describe('3. Causal Reasoning Engine', () => {
    it('should generate deterministic cause-and-effect chains for critical runway', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 300000,
        monthlyExpenses: 200000,
        monthlyRevenue: 0,
      });
      const rules = rulesEngine.getTriggeredRules([], metricsMap);

      const chain = causalEngine.deriveCausalChain({
        triggeredRules: rules,
        metricsMap,
      });

      expect(chain.chainFormula).toContain('Net Burn Accelerated');
      expect(chain.rootCause).toBeDefined();
      expect(chain.ultimateEffect).toContain('Imminent cash exhaustion');
    });
  });

  describe('4. Business Context Engine', () => {
    it('should calculate tailored context multipliers for Seed vs Profitable stages', () => {
      const seedCtx = contextEngine.evaluateContext({ stage: 'SEED', businessModel: 'ENTERPRISE_SAAS' });
      expect(seedCtx.targetRunwayMonths).toBe(18);
      expect(seedCtx.contextMultiplier).toBe(1.2);

      const profitableCtx = contextEngine.evaluateContext({ stage: 'PROFITABLE', businessModel: 'ENTERPRISE_SAAS' });
      expect(profitableCtx.targetRunwayMonths).toBe(6);
      expect(profitableCtx.contextMultiplier).toBe(0.8);
    });
  });

  describe('5. Reasoning Tree & Universal Decision Service', () => {
    it('should construct a 10-step Reasoning Tree and a complete UniversalDecisionObject', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 400000,
        monthlyExpenses: 250000,
        monthlyRevenue: 0,
      });

      const facts = factsEngine.evaluateFacts(orgId, [], metricsMap);
      const rules = rulesEngine.getTriggeredRules(facts, metricsMap);
      const insights = insightEngine.generateInsights(orgId, facts, metricsMap, rules);
      const evidence = evidenceEngine.collectEvidence({ metricsMap, facts, rules, insights });
      const confidence = confidenceEngine.evaluateConfidence({ evidence });
      const context = contextEngine.evaluateContext();
      const causalChain = causalEngine.deriveCausalChain({ triggeredRules: rules, metricsMap });

      const decision = decisionService.constructDecision({
        organizationId: orgId,
        insight: insights[0],
        evidence,
        confidence,
        context,
        causalChain,
        triggeredRules: rules,
        facts,
        metricsMap,
      });

      expect(decision.decisionId).toBeDefined();
      expect(decision.title).toBe(insights[0].title);
      expect(decision.confidence.confidenceBand).toBe('VERY_HIGH');
      expect(decision.recommendedOwner).toBe('CFO');

      const tree = reasoningTreeService.buildReasoningTree({
        insight: insights[0],
        evidence,
        rules,
        context,
        causalChain,
        confidence,
      });

      expect(tree.length).toBe(10);
      expect(tree[0].step).toBe('OBSERVATION');
      expect(tree[9].step).toBe('MONITORING');
    });
  });

  describe('6. Full Cognition Platform Process Integration', () => {
    it('should execute end-to-end financial cognitive reasoning pipeline', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 8000000,
        monthlyExpenses: 1200000,
        monthlyRevenue: 2000000,
      });

      const facts = factsEngine.evaluateFacts(orgId, [], metricsMap);
      const rules = rulesEngine.getTriggeredRules(facts, metricsMap);
      const insights = insightEngine.generateInsights(orgId, facts, metricsMap, rules);

      const result = cognitionPlatform.processCognitiveReasoning({
        organizationId: orgId,
        facts,
        metricsMap,
        triggeredRules: rules,
        insights,
      });

      expect(result.organizationId).toBe(orgId);
      expect(result.decisions.length).toBeGreaterThan(0);
      expect(result.reasoningTrees.length).toEqual(result.decisions.length);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
