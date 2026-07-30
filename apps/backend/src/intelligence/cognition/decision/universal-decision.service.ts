import { Injectable, Logger } from '@nestjs/common';
import { UniversalDecisionObject, UniversalDecisionObjectSchema } from '../domain/decision.types';
import { EvidenceItem } from '../domain/evidence.types';
import { ConfidenceEvaluation } from '../domain/confidence.types';
import { BusinessContext } from '../domain/context.types';
import { CausalChain } from '../domain/causal.types';
import { SemanticInsight } from '../../semantic/domain/insight.types';
import { BusinessRule } from '../../semantic/domain/rule.types';
import { FinancialFact } from '../../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';
import crypto from 'crypto';

@Injectable()
export class UniversalDecisionService {
  private readonly logger = new Logger(UniversalDecisionService.name);

  /**
   * Synthesizes all cognitive modules into a single, master Universal Decision Object.
   */
  constructDecision(params: {
    organizationId: string;
    insight: SemanticInsight;
    evidence: ReadonlyArray<EvidenceItem>;
    confidence: ConfidenceEvaluation;
    context: BusinessContext;
    causalChain: CausalChain;
    triggeredRules: ReadonlyArray<BusinessRule>;
    facts: ReadonlyArray<FinancialFact>;
    metricsMap: Map<MetricKey, FinancialMetric>;
  }): UniversalDecisionObject {
    const {
      organizationId,
      insight,
      evidence,
      confidence,
      context,
      causalChain,
      triggeredRules,
      facts,
      metricsMap,
    } = params;

    const metricsRecord: Record<string, number> = {};
    for (const [key, metric] of metricsMap.entries()) {
      metricsRecord[key] = metric.value;
    }

    const recommendedActions: string[] = [];
    const alternativeActions: string[] = [];

    for (const rule of triggeredRules) {
      if (rule.recommendationTemplate) {
        recommendedActions.push(rule.recommendationTemplate);
      }
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push('Maintain current financial controls and monitor runway buffer weekly.');
    }

    alternativeActions.push('Explore non-dilutive venture debt or working capital credit lines.');
    alternativeActions.push('Negotiate extended 60-day payment terms with top key vendors.');

    let recommendedOwner: 'FOUNDER' | 'CFO' | 'ACCOUNTANT' | 'COLLECTIONS_TEAM' = 'FOUNDER';
    if (insight.severity === 'HIGH' && triggeredRules.some(r => r.category === 'TAX')) {
      recommendedOwner = 'ACCOUNTANT';
    } else if (triggeredRules.some(r => r.category === 'RECEIVABLES')) {
      recommendedOwner = 'COLLECTIONS_TEAM';
    } else if (insight.severity === 'HIGH' || insight.severity === 'CRITICAL') {
      recommendedOwner = 'CFO';
    }

    const rawDecision = {
      decisionId: crypto.randomUUID(),
      organizationId,
      title: insight.title,
      businessProblem: insight.summary,
      evidence: Array.from(evidence),
      confidence,
      context,
      supportingMetrics: metricsRecord,
      supportingFacts: facts.map(f => f.factType),
      supportingRules: triggeredRules.map(r => r.ruleId),
      supportingInsights: [insight.insightId],
      causalChain,
      financialImpact: causalChain.financialImpactEstimate,
      businessImpactNarrative: insight.businessMeaning,
      priority: insight.priority,
      severity: insight.severity,
      recommendedActions,
      alternativeActions,
      recommendedOwner,
      executionTimeline: insight.severity === 'CRITICAL' ? 'Immediate (24 hours)' : '1-2 weeks',
      expectedOutcome: `Stabilize cash runway and mitigate financial risk exposure of ₹${causalChain.financialImpactEstimate.toLocaleString('en-IN')}.`,
      monitoringMetrics: ['CASH_BALANCE', 'NET_BURN', 'RUNWAY_MONTHS', 'DSO'],
      dependencies: ['Board / Founder Approval', 'Finance Team Execution'],
      status: 'PROPOSED' as const,
      timestamp: new Date(),
    };

    this.logger.log(`Constructed Universal Decision Object [${rawDecision.decisionId}] (Severity: ${insight.severity}, Owner: ${recommendedOwner})`);
    return Object.freeze(UniversalDecisionObjectSchema.parse(rawDecision));
  }
}
