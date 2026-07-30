import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from './rules/rule-registry.service';
import { BusinessRulesEngineService, RuleEvaluationResult } from './rules/business-rules-engine.service';
import { FinancialInsightEngineService } from './insights/financial-insight-engine.service';
import { ExplainabilityEngineService } from './explainability/explainability-engine.service';
import { FinancialOntologyService } from './ontology/financial-ontology.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';
import { FinancialFact } from '../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../domain/financial-metric.schema';
import { SemanticInsight } from './domain/insight.types';
import { StructuredExplanation } from './domain/explanation.types';

export interface SemanticProcessingResult {
  organizationId: string;
  evaluatedRulesCount: number;
  triggeredRulesCount: number;
  generatedInsightsCount: number;
  insights: SemanticInsight[];
  explanations: StructuredExplanation[];
  executionTimeMs: number;
}

@Injectable()
export class SemanticPlatformService {
  private readonly logger = new Logger(SemanticPlatformService.name);

  constructor(
    private readonly ruleRegistry: RuleRegistryService,
    private readonly rulesEngine: BusinessRulesEngineService,
    private readonly insightEngine: FinancialInsightEngineService,
    private readonly explainabilityEngine: ExplainabilityEngineService,
    private readonly ontologyService: FinancialOntologyService,
    private readonly intelligenceBus: IntelligenceBusService,
  ) {}

  /**
   * Facade Orchestrator Flow:
   * Facts + Metrics ──► Evaluate Rules ──► Generate Insights ──► Explain ──► Publish to Bus
   */
  processSemanticReasoning(
    organizationId: string,
    facts: ReadonlyArray<FinancialFact>,
    metrics: Map<MetricKey, FinancialMetric>
  ): SemanticProcessingResult {
    const startTime = Date.now();

    // Step 1: Evaluate Business Rules
    const ruleResults = this.rulesEngine.evaluateRules(facts, metrics);
    const triggeredRules = ruleResults.filter(r => r.triggered).map(r => r.rule);

    // Step 2: Generate Deterministic Semantic Insights
    const insights = this.insightEngine.generateInsights(organizationId, facts, metrics, triggeredRules);

    // Step 3: Generate Structured Explanations
    const explanations = this.explainabilityEngine.explainBatch(insights);

    // Step 4: Publish Insights to Intelligence Bus for Downstream Consumers (Decision Lab, Daily Brief, AI, Action Center)
    for (const insight of insights) {
      this.intelligenceBus.publishFact({
        factId: insight.insightId,
        organizationId: insight.organizationId,
        factType: 'CASH_DECREASED', // Maps to nearest fact type for bus topic
        severity: insight.severity,
        confidence: insight.confidence,
        supportingEvents: insight.supportingFacts,
        supportingMetrics: insight.supportingMetrics,
        businessNarrative: `${insight.title}: ${insight.summary}`,
        timestamp: insight.timestamp,
      });
    }

    const executionTimeMs = Date.now() - startTime;
    this.logger.log(
      `Semantic Reasoning Completed for Org ${organizationId}: [Rules Triggered: ${triggeredRules.length}/${ruleResults.length} | Insights: ${insights.length}] (${executionTimeMs}ms)`
    );

    return {
      organizationId,
      evaluatedRulesCount: ruleResults.length,
      triggeredRulesCount: triggeredRules.length,
      generatedInsightsCount: insights.length,
      insights,
      explanations,
      executionTimeMs,
    };
  }

  // Getters for individual engines
  getRuleRegistry(): RuleRegistryService {
    return this.ruleRegistry;
  }

  getRulesEngine(): BusinessRulesEngineService {
    return this.rulesEngine;
  }

  getInsightEngine(): FinancialInsightEngineService {
    return this.insightEngine;
  }

  getExplainabilityEngine(): ExplainabilityEngineService {
    return this.explainabilityEngine;
  }

  getOntologyService(): FinancialOntologyService {
    return this.ontologyService;
  }
}
