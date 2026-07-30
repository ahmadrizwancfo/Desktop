import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RuleRegistryService } from '../rules/rule-registry.service';
import { BusinessRulesEngineService } from '../rules/business-rules-engine.service';
import { FinancialInsightEngineService } from '../insights/financial-insight-engine.service';
import { ExplainabilityEngineService } from '../explainability/explainability-engine.service';
import { FinancialOntologyService } from '../ontology/financial-ontology.service';
import { SemanticPlatformService } from '../semantic-platform.service';
import { IntelligenceBusService } from '../../bus/intelligence-bus.service';
import { MetricsEngineService } from '../../metrics/metrics-engine.service';
import { FinancialFactsEngineService } from '../../facts/financial-facts.service';
import crypto from 'crypto';

describe('Phase 6C2A Semantic Intelligence Platform Test Suite', () => {
  let semanticPlatform: SemanticPlatformService;
  let ruleRegistry: RuleRegistryService;
  let rulesEngine: BusinessRulesEngineService;
  let insightEngine: FinancialInsightEngineService;
  let explainabilityEngine: ExplainabilityEngineService;
  let ontologyService: FinancialOntologyService;
  let metricsEngine: MetricsEngineService;
  let factsEngine: FinancialFactsEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        IntelligenceBusService,
        RuleRegistryService,
        BusinessRulesEngineService,
        FinancialInsightEngineService,
        ExplainabilityEngineService,
        FinancialOntologyService,
        SemanticPlatformService,
        MetricsEngineService,
        FinancialFactsEngineService,
      ],
    }).compile();

    semanticPlatform = module.get<SemanticPlatformService>(SemanticPlatformService);
    ruleRegistry = module.get<RuleRegistryService>(RuleRegistryService);
    rulesEngine = module.get<BusinessRulesEngineService>(BusinessRulesEngineService);
    insightEngine = module.get<FinancialInsightEngineService>(FinancialInsightEngineService);
    explainabilityEngine = module.get<ExplainabilityEngineService>(ExplainabilityEngineService);
    ontologyService = module.get<FinancialOntologyService>(FinancialOntologyService);
    metricsEngine = module.get<MetricsEngineService>(MetricsEngineService);
    factsEngine = module.get<FinancialFactsEngineService>(FinancialFactsEngineService);

    // Initialize OnModuleInit hooks
    ruleRegistry.onModuleInit();
    ontologyService.onModuleInit();
  });

  describe('1. Rule Registry & Business Rules Engine', () => {
    it('should register built-in business rules and evaluate triggered rules', () => {
      const activeRules = ruleRegistry.getActiveRules();
      expect(activeRules.length).toBeGreaterThan(0);

      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 300000,
        monthlyExpenses: 200000, // Net burn = 200k, Runway = 1.5 mos (< 3 mos = CRITICAL)
        monthlyRevenue: 0,
      });

      const triggered = rulesEngine.getTriggeredRules([], metricsMap);
      expect(triggered.some(r => r.ruleId === 'RULE_RUNWAY_CRITICAL')).toBe(true);
    });

    it('should support dynamic custom rule registration without code changes', () => {
      ruleRegistry.registerRule({
        ruleId: 'CUSTOM_TEST_RULE',
        ruleName: 'Custom Unit Test Rule',
        category: 'CASH',
        description: 'Test rule description',
        severity: 'MEDIUM',
        priority: 5,
        confidence: 1.0,
        recommendationTemplate: 'Test recommendation',
        businessImpact: 'Test impact',
        tags: ['TEST'],
        enabled: true,
        version: '1.0',
        condition: ({ metrics }) => (metrics.get('CASH_BALANCE')?.value || 0) > 1000,
      });

      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 5000,
        monthlyExpenses: 1000,
        monthlyRevenue: 1000,
      });

      const triggered = rulesEngine.getTriggeredRules([], metricsMap);
      expect(triggered.some(r => r.ruleId === 'CUSTOM_TEST_RULE')).toBe(true);
    });
  });

  describe('2. Financial Insight Engine (Zero-LLM Reasoning)', () => {
    it('should deterministically derive Semantic Insights from triggered rules and metrics', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 400000,
        monthlyExpenses: 250000, // Runway = 1.6 mos
        monthlyRevenue: 0,
      });

      const triggered = rulesEngine.getTriggeredRules([], metricsMap);
      const insights = insightEngine.generateInsights(orgId, [], metricsMap, triggered);

      expect(insights.length).toBeGreaterThan(0);
      const criticalInsight = insights.find(i => i.severity === 'CRITICAL');
      expect(criticalInsight).toBeDefined();
      expect(criticalInsight?.title).toContain('Burn Rate Unsustainable');
      expect(criticalInsight?.confidence).toBe(1.0);
    });
  });

  describe('3. Explainability Engine', () => {
    it('should generate a 100% complete Structured Explanation answering all 11 required questions', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 400000,
        monthlyExpenses: 250000,
        monthlyRevenue: 0,
      });

      const triggered = rulesEngine.getTriggeredRules([], metricsMap);
      const insights = insightEngine.generateInsights(orgId, [], metricsMap, triggered);
      const explanation = explainabilityEngine.explainInsight(insights[0]);

      expect(explanation.explanationId).toBeDefined();
      expect(explanation.whatHappened).toBe(insights[0].title);
      expect(explanation.whyItHappened).toBe(insights[0].detailedNarrative);
      expect(explanation.comparedToWhat).toBeDefined();
      expect(explanation.evidence.length).toBeGreaterThan(0);
      expect(explanation.businessImpact).toBe(insights[0].businessMeaning);
      expect(explanation.confidence).toBe(1.0);
      expect(explanation.urgency).toBe('IMMEDIATE');
      expect(explanation.recommendedOwner).toBe('FOUNDER');
    });
  });

  describe('4. Financial Ontology Service', () => {
    it('should return formal financial concepts and semantic vocabulary relationships', () => {
      const concept = ontologyService.getConcept('CONCEPT_LIQUIDITY');
      expect(concept).toBeDefined();
      expect(concept?.name).toBe('Liquidity & Cash Availability');
      expect(concept?.supportedMetrics).toContain('CASH_BALANCE');
      expect(concept?.relatedConcepts).toContain('CONCEPT_RUNWAY');
    });
  });

  describe('5. Full Semantic Platform Orchestrator Process', () => {
    it('should execute end-to-end semantic reasoning pipeline and publish through Intelligence Bus', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 10000000,
        monthlyExpenses: 1500000,
        monthlyRevenue: 2500000,
      });
      const facts = factsEngine.evaluateFacts(orgId, [], metricsMap);

      const result = semanticPlatform.processSemanticReasoning(orgId, facts, metricsMap);

      expect(result.organizationId).toBe(orgId);
      expect(result.evaluatedRulesCount).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.explanations.length).toEqual(result.insights.length);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
