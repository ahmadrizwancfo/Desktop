import { Injectable, Logger } from '@nestjs/common';
import { StructuredExplanation, StructuredExplanationSchema, ExplanationUrgency, ExplanationOwner } from '../domain/explanation.types';
import { SemanticInsight } from '../domain/insight.types';
import crypto from 'crypto';

@Injectable()
export class ExplainabilityEngineService {
  private readonly logger = new Logger(ExplainabilityEngineService.name);

  /**
   * Generates a complete, structured, step-by-step explanation for a given Semantic Insight.
   */
  explainInsight(insight: SemanticInsight): StructuredExplanation {
    let urgency: ExplanationUrgency = 'MONITOR';
    let recommendedOwner: ExplanationOwner = 'FOUNDER';

    if (insight.severity === 'CRITICAL') {
      urgency = 'IMMEDIATE';
      recommendedOwner = 'FOUNDER';
    } else if (insight.severity === 'HIGH') {
      urgency = 'HIGH';
      recommendedOwner = insight.triggeredRules.includes('RULE_TAX_OVERDUE') ? 'ACCOUNTANT' : 'CFO';
    } else if (insight.severity === 'MEDIUM') {
      urgency = 'MEDIUM';
      recommendedOwner = insight.triggeredRules.includes('RULE_RECEIVABLE_GROWTH_FAST') ? 'COLLECTIONS_TEAM' : 'CFO';
    }

    const explanationObj = {
      explanationId: crypto.randomUUID(),
      insightId: insight.insightId,
      organizationId: insight.organizationId,
      whatHappened: insight.title,
      whyItHappened: insight.detailedNarrative,
      comparedToWhat: 'Evaluated against FounderCFO 90-day baseline metrics and Indian statutory thresholds.',
      evidence: [
        `Triggered Business Rules: [${insight.triggeredRules.join(', ') || 'NONE'}]`,
        `Supporting Fact Identifiers: [${insight.supportingFacts.join(', ') || 'NONE'}]`,
      ],
      supportingMetrics: insight.supportingMetrics,
      supportingFacts: insight.supportingFacts,
      supportingRules: insight.triggeredRules,
      businessImpact: insight.businessMeaning,
      confidence: insight.confidence,
      urgency,
      recommendedOwner,
      timestamp: new Date(),
    };

    this.logger.log(`Generated Structured Explanation for Insight [${insight.insightId}] (Urgency: ${urgency}, Owner: ${recommendedOwner})`);
    return Object.freeze(StructuredExplanationSchema.parse(explanationObj));
  }

  /**
   * Generate structured explanations for a list of insights.
   */
  explainBatch(insights: ReadonlyArray<SemanticInsight>): StructuredExplanation[] {
    return insights.map(i => this.explainInsight(i));
  }
}
