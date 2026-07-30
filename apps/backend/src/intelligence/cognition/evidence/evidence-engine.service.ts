import { Injectable, Logger } from '@nestjs/common';
import { EvidenceItem, EvidenceItemSchema } from '../domain/evidence.types';
import { FinancialMetric } from '../../domain/financial-metric.schema';
import { FinancialFact } from '../../domain/financial-fact.schema';
import { SemanticInsight } from '../../semantic/domain/insight.types';
import { BusinessRule } from '../../semantic/domain/rule.types';
import crypto from 'crypto';

@Injectable()
export class EvidenceEngineService {
  private readonly logger = new Logger(EvidenceEngineService.name);

  /**
   * Consolidate evidence items from supporting metrics, facts, rules, and insights into a unified audit trail.
   */
  collectEvidence(params: {
    metricsMap: Map<string, FinancialMetric>;
    facts: ReadonlyArray<FinancialFact>;
    rules: ReadonlyArray<BusinessRule>;
    insights: ReadonlyArray<SemanticInsight>;
  }): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];

    // 1. Collect Metric Evidence
    for (const [key, metric] of params.metricsMap.entries()) {
      evidence.push(Object.freeze(EvidenceItemSchema.parse({
        evidenceId: crypto.randomUUID(),
        source: 'METRIC',
        sourceId: key,
        description: `Metric [${key}]: ${metric.formattedValue} (${metric.formula})`,
        weight: 0.9,
        relevance: 1.0,
        confidence: metric.confidence || 1.0,
        freshnessHours: 0,
        traceabilityKey: `METRIC:${metric.organizationId}:${key}`,
      })));
    }

    // 2. Collect Fact Evidence
    for (const fact of params.facts) {
      evidence.push(Object.freeze(EvidenceItemSchema.parse({
        evidenceId: crypto.randomUUID(),
        source: 'FACT',
        sourceId: fact.factId,
        description: `Fact [${fact.factType}]: ${fact.businessNarrative}`,
        weight: 0.95,
        relevance: 1.0,
        confidence: fact.confidence || 1.0,
        freshnessHours: 0,
        traceabilityKey: `FACT:${fact.organizationId}:${fact.factType}`,
      })));
    }

    // 3. Collect Rule Evidence
    for (const rule of params.rules) {
      evidence.push(Object.freeze(EvidenceItemSchema.parse({
        evidenceId: crypto.randomUUID(),
        source: 'RULE',
        sourceId: rule.ruleId,
        description: `Rule [${rule.ruleId}]: ${rule.description}`,
        weight: 1.0,
        relevance: 1.0,
        confidence: rule.confidence || 1.0,
        freshnessHours: 0,
        traceabilityKey: `RULE:${rule.ruleId}`,
      })));
    }

    // 4. Collect Insight Evidence
    for (const insight of params.insights) {
      evidence.push(Object.freeze(EvidenceItemSchema.parse({
        evidenceId: crypto.randomUUID(),
        source: 'INSIGHT',
        sourceId: insight.insightId,
        description: `Insight [${insight.title}]: ${insight.summary}`,
        weight: 1.0,
        relevance: 1.0,
        confidence: insight.confidence || 1.0,
        freshnessHours: 0,
        traceabilityKey: `INSIGHT:${insight.organizationId}:${insight.insightId}`,
      })));
    }

    this.logger.log(`Collected ${evidence.length} Evidence Items for Cognitive Reasoning`);
    return evidence;
  }
}
