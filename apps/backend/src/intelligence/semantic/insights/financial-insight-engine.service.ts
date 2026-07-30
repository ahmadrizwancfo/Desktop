import { Injectable, Logger } from '@nestjs/common';
import { SemanticInsight, SemanticInsightSchema } from '../domain/insight.types';
import { BusinessRule } from '../domain/rule.types';
import { FinancialFact } from '../../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';
import crypto from 'crypto';

@Injectable()
export class FinancialInsightEngineService {
  private readonly logger = new Logger(FinancialInsightEngineService.name);

  /**
   * Deterministically derive Semantic Insights from Facts, Metrics, and Triggered Business Rules.
   * Zero LLM / AI dependencies.
   */
  generateInsights(
    organizationId: string,
    facts: ReadonlyArray<FinancialFact>,
    metrics: Map<MetricKey, FinancialMetric>,
    triggeredRules: ReadonlyArray<BusinessRule>
  ): SemanticInsight[] {
    const insights: SemanticInsight[] = [];
    const ruleIds = triggeredRules.map(r => r.ruleId);
    const factTypes = facts.map(f => f.factType);

    const metricsRecord: Record<string, number> = {};
    for (const [key, metric] of metrics.entries()) {
      metricsRecord[key] = metric.value;
    }

    // 1. Critical Runway & Burn Unsustainability
    if (ruleIds.includes('RULE_RUNWAY_CRITICAL')) {
      const runwayVal = metrics.get('RUNWAY_MONTHS')?.value || 0;
      const netBurnVal = metrics.get('NET_BURN')?.value || 0;

      insights.push(this.createInsight({
        organizationId,
        title: 'Burn Rate Unsustainable & Critical Runway Buffer',
        summary: `Cash runway has dropped to ${runwayVal} months with a net burn of ₹${netBurnVal.toLocaleString('en-IN')}/mo.`,
        detailedNarrative: `Operating expenditures are outpacing current cash reserves. At the current net burn velocity, cash balance will reach zero in under 90 days unless discretionary spend is reduced.`,
        supportingFacts: factTypes.filter(f => f === 'RUNWAY_REDUCED' || f === 'BURN_INCREASED'),
        supportingMetrics: metricsRecord,
        triggeredRules: ['RULE_RUNWAY_CRITICAL'],
        businessMeaning: 'High probability of cash depletion requiring immediate operational intervention.',
        severity: 'CRITICAL',
        confidence: 1.0,
        priority: 10,
      }));
    }

    // 2. Collections & DSO Slowdown
    if (ruleIds.includes('RULE_RECEIVABLE_GROWTH_FAST')) {
      const dsoVal = metrics.get('DSO')?.value || 0;

      insights.push(this.createInsight({
        organizationId,
        title: 'Customer Collections Slowing Down',
        summary: `Days Sales Outstanding (DSO) has expanded to ${dsoVal} days.`,
        detailedNarrative: `Invoices are remaining unpaid significantly longer than standard 30-day payment cycles, creating an artificial working capital drain.`,
        supportingFacts: factTypes.filter(f => f === 'RECEIVABLES_INCREASED'),
        supportingMetrics: metricsRecord,
        triggeredRules: ['RULE_RECEIVABLE_GROWTH_FAST'],
        businessMeaning: 'Uncollected customer invoices are starving the business of spendable cash.',
        severity: 'HIGH',
        confidence: 0.95,
        priority: 8,
      }));
    }

    // 3. Tax Pressure & Compliance Risk
    if (ruleIds.includes('RULE_TAX_OVERDUE')) {
      insights.push(this.createInsight({
        organizationId,
        title: 'Statutory Tax Compliance Pressure Increasing',
        summary: 'Active GST or TDS statutory tax liabilities require immediate remittance.',
        detailedNarrative: 'Pending tax obligations have been created. Delaying remittance beyond official due dates risks interest penalties under Indian Income Tax / GST statutory rules.',
        supportingFacts: factTypes.filter(f => f === 'GST_LIABILITY_CREATED'),
        supportingMetrics: metricsRecord,
        triggeredRules: ['RULE_TAX_OVERDUE'],
        businessMeaning: 'Statutory compliance exposure risks legal penalties and audit flags.',
        severity: 'HIGH',
        confidence: 1.0,
        priority: 9,
      }));
    }

    // 4. Working Capital Tightening
    if (ruleIds.includes('RULE_WORKING_CAPITAL_DETERIORATION')) {
      const currentRatio = metrics.get('CURRENT_RATIO')?.value || 0;

      insights.push(this.createInsight({
        organizationId,
        title: 'Working Capital Deficit Tightening Liquidity',
        summary: `Current ratio is ${currentRatio}x (below 1.0x safety threshold).`,
        detailedNarrative: 'Short-term obligations due within 30–90 days exceed liquid assets, placing stress on daily vendor payments.',
        supportingFacts: factTypes,
        supportingMetrics: metricsRecord,
        triggeredRules: ['RULE_WORKING_CAPITAL_DETERIORATION'],
        businessMeaning: 'Short-term solvency is constrained by vendor payables exceeding current assets.',
        severity: 'HIGH',
        confidence: 0.95,
        priority: 8,
      }));
    }

    // 5. Healthy Cash Discipline (Default positive fallback if no critical rules triggered)
    if (insights.length === 0) {
      const runwayVal = metrics.get('RUNWAY_MONTHS')?.value || 999;
      const cashVal = metrics.get('CASH_BALANCE')?.value || 0;

      insights.push(this.createInsight({
        organizationId,
        title: 'Healthy Cash Discipline & Stable Solvency',
        summary: `Current cash position of ₹${cashVal.toLocaleString('en-IN')} maintains a healthy ${runwayVal} month runway.`,
        detailedNarrative: 'Financial operations exhibit strong liquidity, controlled burn velocity, and compliant tax remittance.',
        supportingFacts: factTypes,
        supportingMetrics: metricsRecord,
        triggeredRules: [],
        businessMeaning: 'Business maintains strong financial health and capital resilience.',
        severity: 'LOW',
        confidence: 1.0,
        priority: 1,
      }));
    }

    this.logger.log(`Generated ${insights.length} Deterministic Semantic Insights for Org ${organizationId}`);
    return insights;
  }

  private createInsight(input: {
    organizationId: string;
    title: string;
    summary: string;
    detailedNarrative: string;
    supportingFacts: string[];
    supportingMetrics: Record<string, number>;
    triggeredRules: string[];
    businessMeaning: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confidence: number;
    priority: number;
  }): SemanticInsight {
    const rawObj = {
      insightId: crypto.randomUUID(),
      organizationId: input.organizationId,
      title: input.title,
      summary: input.summary,
      detailedNarrative: input.detailedNarrative,
      supportingFacts: input.supportingFacts,
      supportingMetrics: input.supportingMetrics,
      triggeredRules: input.triggeredRules,
      businessMeaning: input.businessMeaning,
      severity: input.severity,
      confidence: input.confidence,
      priority: input.priority,
      timestamp: new Date(),
    };

    return Object.freeze(SemanticInsightSchema.parse(rawObj)); // Enforce runtime immutability
  }
}
