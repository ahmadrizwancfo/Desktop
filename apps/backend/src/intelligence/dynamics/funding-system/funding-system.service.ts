import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class FundingSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const runway = metricsMap.get('RUNWAY_MONTHS')?.value || 999;
    const netBurn = metricsMap.get('NET_BURN')?.value || 0;
    const capitalNeed = Math.max(0, netBurn * (18 - runway));

    let readinessScore = 90;
    if (runway < 6) readinessScore = 100; // Urgent fundraising readiness needed

    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_FUNDING',
      systemName: 'Capital & Treasury Funding System',
      purpose: 'Models capital need, fundraising readiness, dilution inputs, and debt capacity.',
      inputs: { runwayMonths: runway, netBurn },
      outputs: { estimatedCapitalNeed: capitalNeed, fundraisingReadinessScore: readinessScore },
      upstreamSystems: ['SYS_CASH'],
      downstreamSystems: ['SYS_CASH', 'SYS_GROWTH'],
      criticalMetrics: ['RUNWAY_MONTHS', 'NET_BURN', 'CASH_BALANCE'],
      healthScore: runway >= 12 ? 95 : (runway >= 6 ? 70 : 30),
      stabilityScore: 80,
      timestamp: new Date(),
    }));
  }
}
