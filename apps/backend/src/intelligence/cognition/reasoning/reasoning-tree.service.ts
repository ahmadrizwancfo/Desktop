import { Injectable, Logger } from '@nestjs/common';
import { EvidenceItem } from '../domain/evidence.types';
import { ConfidenceEvaluation } from '../domain/confidence.types';
import { BusinessContext } from '../domain/context.types';
import { CausalChain } from '../domain/causal.types';
import { SemanticInsight } from '../../semantic/domain/insight.types';
import { BusinessRule } from '../../semantic/domain/rule.types';

export interface ReasoningTreeNode {
  step: 'OBSERVATION' | 'EVIDENCE' | 'RULES' | 'INSIGHTS' | 'CONTEXT' | 'CAUSE' | 'EFFECT' | 'DECISION' | 'EXPECTED_OUTCOME' | 'MONITORING';
  title: string;
  detail: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ReasoningTreeService {
  private readonly logger = new Logger(ReasoningTreeService.name);

  /**
   * Constructs a 100% deterministic, step-by-step Reasoning Tree from cognitive components.
   */
  buildReasoningTree(params: {
    insight: SemanticInsight;
    evidence: ReadonlyArray<EvidenceItem>;
    rules: ReadonlyArray<BusinessRule>;
    context: BusinessContext;
    causalChain: CausalChain;
    confidence: ConfidenceEvaluation;
  }): ReasoningTreeNode[] {
    const { insight, evidence, rules, context, causalChain, confidence } = params;

    const tree: ReasoningTreeNode[] = [
      {
        step: 'OBSERVATION',
        title: `Financial Observation: ${insight.title}`,
        detail: insight.summary,
      },
      {
        step: 'EVIDENCE',
        title: `Audit Evidence Collection (${evidence.length} items)`,
        detail: `Verified with ${(confidence.confidenceScore * 100).toFixed(0)}% confidence (${confidence.confidenceBand}).`,
        metadata: { confidenceScore: confidence.confidenceScore },
      },
      {
        step: 'RULES',
        title: `Triggered Business Rules (${rules.length} rules)`,
        detail: rules.map(r => `[${r.ruleId}] ${r.ruleName}`).join(', ') || 'No critical rules triggered',
      },
      {
        step: 'INSIGHTS',
        title: 'Semantic Business Understanding',
        detail: insight.businessMeaning,
      },
      {
        step: 'CONTEXT',
        title: `Tailored Business Context (${context.stage} / ${context.businessModel})`,
        detail: `Evaluated with target runway buffer of ${context.targetRunwayMonths} months.`,
      },
      {
        step: 'CAUSE',
        title: 'Root Cause Identification',
        detail: causalChain.rootCause,
      },
      {
        step: 'EFFECT',
        title: 'Ultimate Financial Effect',
        detail: causalChain.ultimateEffect,
      },
      {
        step: 'DECISION',
        title: 'Strategic CFO Decision Recommendation',
        detail: `Execute recommended action plan to address ${insight.title}.`,
      },
      {
        step: 'EXPECTED_OUTCOME',
        title: 'Expected Financial Outcome',
        detail: `Stabilize cash runway and prevent financial loss of ₹${causalChain.financialImpactEstimate.toLocaleString('en-IN')}.`,
      },
      {
        step: 'MONITORING',
        title: 'Post-Execution Telemetry & Monitoring',
        detail: 'Track CASH_BALANCE, NET_BURN, and RUNWAY_MONTHS weekly.',
      },
    ];

    this.logger.log(`Constructed 10-step Reasoning Tree for Insight [${insight.insightId}]`);
    return tree;
  }
}
