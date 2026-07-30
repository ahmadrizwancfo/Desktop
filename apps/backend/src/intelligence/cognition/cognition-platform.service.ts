import { Injectable, Logger } from '@nestjs/common';
import { EvidenceEngineService } from './evidence/evidence-engine.service';
import { ConfidenceEngineService } from './confidence/confidence-engine.service';
import { CausalReasoningEngineService } from './causal/causal-reasoning-engine.service';
import { BusinessContextEngineService } from './context/business-context.service';
import { ReasoningTreeService, ReasoningTreeNode } from './reasoning/reasoning-tree.service';
import { UniversalDecisionService } from './decision/universal-decision.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';
import { FinancialFact } from '../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../domain/financial-metric.schema';
import { BusinessRule } from '../semantic/domain/rule.types';
import { SemanticInsight } from '../semantic/domain/insight.types';
import { UniversalDecisionObject } from './domain/decision.types';
import { EvidenceItem } from './domain/evidence.types';
import { ConfidenceEvaluation } from './domain/confidence.types';
import { BusinessContext } from './domain/context.types';
import { CausalChain } from './domain/causal.types';

export interface CognitionProcessingResult {
  organizationId: string;
  decisions: UniversalDecisionObject[];
  reasoningTrees: ReasoningTreeNode[][];
  evidenceCount: number;
  confidence: ConfidenceEvaluation;
  context: BusinessContext;
  executionTimeMs: number;
}

@Injectable()
export class CognitionPlatformService {
  private readonly logger = new Logger(CognitionPlatformService.name);

  constructor(
    private readonly evidenceEngine: EvidenceEngineService,
    private readonly confidenceEngine: ConfidenceEngineService,
    private readonly causalEngine: CausalReasoningEngineService,
    private readonly contextEngine: BusinessContextEngineService,
    private readonly reasoningTreeService: ReasoningTreeService,
    private readonly decisionService: UniversalDecisionService,
    private readonly intelligenceBus: IntelligenceBusService,
  ) {}

  /**
   * Main Cognition Facade Flow:
   * Facts + Metrics + Insights ──► Evidence ──► Confidence ──► Causal Chain ──► Context ──► Decision Objects
   */
  processCognitiveReasoning(params: {
    organizationId: string;
    facts: ReadonlyArray<FinancialFact>;
    metricsMap: Map<MetricKey, FinancialMetric>;
    triggeredRules: ReadonlyArray<BusinessRule>;
    insights: ReadonlyArray<SemanticInsight>;
    businessContext?: Partial<BusinessContext>;
  }): CognitionProcessingResult {
    const startTime = Date.now();
    const { organizationId, facts, metricsMap, triggeredRules, insights } = params;

    // 1. Evaluate Business Context
    const context = this.contextEngine.evaluateContext(params.businessContext);

    // 2. Collect & Weight Evidence Items
    const evidence: EvidenceItem[] = this.evidenceEngine.collectEvidence({
      metricsMap,
      facts,
      rules: triggeredRules,
      insights,
    });

    // 3. Evaluate Universal Confidence Score & Band
    const confidence: ConfidenceEvaluation = this.confidenceEngine.evaluateConfidence({
      evidence,
      hasConflictingSignals: false,
    });

    // 4. Derive Causal Cause-and-Effect Chain
    const causalChain: CausalChain = this.causalEngine.deriveCausalChain({
      triggeredRules,
      metricsMap,
    });

    const decisions: UniversalDecisionObject[] = [];
    const reasoningTrees: ReasoningTreeNode[][] = [];

    // 5. Synthesize Universal Decision Objects & Reasoning Trees for each Insight
    for (const insight of insights) {
      const decision = this.decisionService.constructDecision({
        organizationId,
        insight,
        evidence,
        confidence,
        context,
        causalChain,
        triggeredRules,
        facts,
        metricsMap,
      });

      const tree = this.reasoningTreeService.buildReasoningTree({
        insight,
        evidence,
        rules: triggeredRules,
        context,
        causalChain,
        confidence,
      });

      decisions.push(decision);
      reasoningTrees.push(tree);

      // Publish Universal Decision Object to Intelligence Bus for downstream consumers (Decision Lab, Action Center, AI)
      this.intelligenceBus.publishFact({
        factId: decision.decisionId,
        organizationId: decision.organizationId,
        factType: 'CASH_DECREASED',
        severity: decision.severity,
        confidence: decision.confidence.confidenceScore,
        supportingEvents: decision.supportingFacts,
        supportingMetrics: decision.supportingMetrics,
        businessNarrative: `DECISION OBJECT [${decision.title}]: ${decision.expectedOutcome}`,
        timestamp: decision.timestamp,
      });
    }

    const executionTimeMs = Date.now() - startTime;
    this.logger.log(
      `Financial Cognition Processing Completed for Org ${organizationId}: [Decisions: ${decisions.length} | Evidence Items: ${evidence.length} | Confidence: ${confidence.confidenceBand}] (${executionTimeMs}ms)`
    );

    return {
      organizationId,
      decisions,
      reasoningTrees,
      evidenceCount: evidence.length,
      confidence,
      context,
      executionTimeMs,
    };
  }

  // Getters for individual engines
  getEvidenceEngine(): EvidenceEngineService { return this.evidenceEngine; }
  getConfidenceEngine(): ConfidenceEngineService { return this.confidenceEngine; }
  getCausalEngine(): CausalReasoningEngineService { return this.causalEngine; }
  getContextEngine(): BusinessContextEngineService { return this.contextEngine; }
  getReasoningTreeService(): ReasoningTreeService { return this.reasoningTreeService; }
  getDecisionService(): UniversalDecisionService { return this.decisionService; }
}
