import { Injectable, Logger } from '@nestjs/common';
import { FinancialFact, FinancialFactSchema } from '../domain/financial-fact.schema';
import { FinancialEvent } from '../domain/financial-event.schema';
import { FinancialMetric, MetricKey } from '../domain/financial-metric.schema';
import crypto from 'crypto';

@Injectable()
export class FinancialFactsEngineService {
  private readonly logger = new Logger(FinancialFactsEngineService.name);

  /**
   * Deterministically derive Financial Facts from events and computed metrics.
   * NO AI, NO LLM inference — purely deterministic logic.
   */
  evaluateFacts(
    organizationId: string,
    events: ReadonlyArray<FinancialEvent>,
    metricsMap: Map<MetricKey, FinancialMetric>
  ): FinancialFact[] {
    const facts: FinancialFact[] = [];
    const eventIds = events.map(e => e.eventId);

    const cashMetric = metricsMap.get('CASH_BALANCE');
    const netBurnMetric = metricsMap.get('NET_BURN');
    const grossBurnMetric = metricsMap.get('GROSS_BURN');
    const runwayMetric = metricsMap.get('RUNWAY_MONTHS');
    const growthMetric = metricsMap.get('REVENUE_GROWTH_PERCENT');
    const dsoMetric = metricsMap.get('DSO');

    // 1. Runway Facts
    if (runwayMetric) {
      if (runwayMetric.value < 3) {
        facts.push(this.createFact({
          organizationId,
          factType: 'RUNWAY_REDUCED',
          severity: 'CRITICAL',
          supportingEvents: eventIds,
          supportingMetrics: { RUNWAY_MONTHS: runwayMetric.value },
          businessNarrative: `Runway is critically low at ${runwayMetric.value} months. Cash exhaustion is imminent without intervention.`,
        }));
      } else if (runwayMetric.value > 12) {
        facts.push(this.createFact({
          organizationId,
          factType: 'RUNWAY_EXTENDED',
          severity: 'LOW',
          supportingEvents: eventIds,
          supportingMetrics: { RUNWAY_MONTHS: runwayMetric.value },
          businessNarrative: `Company has an extended runway safety buffer of ${runwayMetric.value} months.`,
        }));
      }
    }

    // 2. Burn Facts
    if (netBurnMetric && grossBurnMetric) {
      if (netBurnMetric.value > 0) {
        facts.push(this.createFact({
          organizationId,
          factType: 'BURN_INCREASED',
          severity: netBurnMetric.value > 500000 ? 'HIGH' : 'MEDIUM',
          supportingEvents: eventIds,
          supportingMetrics: { NET_BURN: netBurnMetric.value, GROSS_BURN: grossBurnMetric.value },
          businessNarrative: `Monthly net burn is ₹${netBurnMetric.value.toLocaleString('en-IN')}/mo with gross operating spend of ₹${grossBurnMetric.value.toLocaleString('en-IN')}.`,
        }));
      } else {
        facts.push(this.createFact({
          organizationId,
          factType: 'BURN_REDUCED',
          severity: 'LOW',
          supportingEvents: eventIds,
          supportingMetrics: { NET_BURN: 0 },
          businessNarrative: `Organization is cash-flow sustainable with zero net burn.`,
        }));
      }
    }

    // 3. Revenue Growth Facts
    if (growthMetric) {
      if (growthMetric.value > 10) {
        facts.push(this.createFact({
          organizationId,
          factType: 'REVENUE_ACCELERATING',
          severity: 'LOW',
          supportingEvents: eventIds,
          supportingMetrics: { REVENUE_GROWTH_PERCENT: growthMetric.value },
          businessNarrative: `Revenue is accelerating at +${growthMetric.value}% month-over-month.`,
        }));
      } else if (growthMetric.value < -10) {
        facts.push(this.createFact({
          organizationId,
          factType: 'REVENUE_DECLINING',
          severity: 'HIGH',
          supportingEvents: eventIds,
          supportingMetrics: { REVENUE_GROWTH_PERCENT: growthMetric.value },
          businessNarrative: `Revenue declined by ${growthMetric.value}% month-over-month.`,
        }));
      }
    }

    // 4. Receivables & DSO Facts
    if (dsoMetric && dsoMetric.value > 45) {
      facts.push(this.createFact({
        organizationId,
        factType: 'RECEIVABLES_INCREASED',
        severity: 'MEDIUM',
        supportingEvents: eventIds,
        supportingMetrics: { DSO: dsoMetric.value },
        businessNarrative: `Days Sales Outstanding (DSO) expanded to ${dsoMetric.value} days, indicating collection delays.`,
      }));
    }

    // 5. Ingested Events Correlation Facts
    const payrollEvents = events.filter(e => e.eventCategory === 'PAYROLL');
    if (payrollEvents.length > 0) {
      const totalPayroll = payrollEvents.reduce((acc, e) => acc + (e.metadata.amount || 0), 0);
      facts.push(this.createFact({
        organizationId,
        factType: 'PAYROLL_INCREASED',
        severity: 'MEDIUM',
        supportingEvents: payrollEvents.map(e => e.eventId),
        supportingMetrics: { PAYROLL_TOTAL: totalPayroll },
        businessNarrative: `Processed payroll disbursements totaling ₹${totalPayroll.toLocaleString('en-IN')}.`,
      }));
    }

    this.logger.log(`Evaluated ${facts.length} Deterministic Financial Facts for Org ${organizationId}`);
    return facts;
  }

  private createFact(input: {
    organizationId: string;
    factType: any;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    supportingEvents: string[];
    supportingMetrics: Record<string, number>;
    businessNarrative: string;
  }): FinancialFact {
    const rawObj = {
      factId: crypto.randomUUID(),
      organizationId: input.organizationId,
      factType: input.factType,
      severity: input.severity,
      confidence: 1.0,
      supportingEvents: input.supportingEvents,
      supportingMetrics: input.supportingMetrics,
      businessNarrative: input.businessNarrative,
      timestamp: new Date(),
    };

    return Object.freeze(FinancialFactSchema.parse(rawObj)); // Enforce runtime immutability
  }
}
