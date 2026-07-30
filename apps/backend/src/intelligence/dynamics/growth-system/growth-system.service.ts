import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class GrowthSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const growth = metricsMap.get('REVENUE_GROWTH_PERCENT')?.value || 0;
    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_GROWTH',
      systemName: 'Growth & Expansion Engine',
      purpose: 'Models growth velocity, sales capacity, and marketing ROI efficiency.',
      inputs: { revenueGrowthPercent: growth },
      outputs: { growthEfficiencyScore: Math.min(100, Math.max(0, growth * 3)) },
      upstreamSystems: ['SYS_HIRING', 'SYS_EXPENSE'],
      downstreamSystems: ['SYS_REVENUE'],
      criticalMetrics: ['REVENUE_GROWTH_PERCENT', 'CONTRIBUTION_MARGIN_PERCENT'],
      healthScore: Math.min(100, Math.max(20, 60 + growth * 2)),
      stabilityScore: 85,
      timestamp: new Date(),
    }));
  }
}
