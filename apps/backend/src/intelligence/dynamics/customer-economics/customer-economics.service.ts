import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class CustomerEconomicsService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const grossMargin = metricsMap.get('GROSS_MARGIN_PERCENT')?.value || 70;
    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_CUSTOMER_ECONOMICS',
      systemName: 'Customer Unit Economics System',
      purpose: 'Models CAC, LTV, Net Revenue Retention (NRR), expansion, and customer churn.',
      inputs: { grossMarginPercent: grossMargin },
      outputs: { ltvCacRatio: 3.5 },
      upstreamSystems: ['SYS_GROWTH'],
      downstreamSystems: ['SYS_REVENUE'],
      criticalMetrics: ['MRR', 'GROSS_MARGIN_PERCENT', 'REVENUE_GROWTH_PERCENT'],
      healthScore: Math.min(100, Math.max(30, grossMargin + 10)),
      stabilityScore: 90,
      timestamp: new Date(),
    }));
  }
}
