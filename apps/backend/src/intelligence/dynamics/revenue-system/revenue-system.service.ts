import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class RevenueSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const mrr = metricsMap.get('MRR')?.value || 0;
    const arr = metricsMap.get('ARR')?.value || 0;
    const growth = metricsMap.get('REVENUE_GROWTH_PERCENT')?.value || 0;

    let healthScore = 80;
    if (growth > 15) healthScore = 100;
    else if (growth < 0) healthScore = 40;

    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_REVENUE',
      systemName: 'Revenue & Top-Line Engine',
      purpose: 'Models monthly recurring revenue, growth velocity, and gross margins.',
      inputs: { previousRevenue: arr / 12 },
      outputs: { mrr, arr, revenueGrowthPercent: growth },
      upstreamSystems: ['SYS_CUSTOMER_ECONOMICS', 'SYS_GROWTH'],
      downstreamSystems: ['SYS_CASH', 'SYS_WORKING_CAPITAL'],
      criticalMetrics: ['MRR', 'ARR', 'REVENUE_GROWTH_PERCENT', 'GROSS_MARGIN_PERCENT'],
      healthScore,
      stabilityScore: Math.min(100, Math.max(0, 50 + growth * 2)),
      timestamp: new Date(),
    }));
  }
}
