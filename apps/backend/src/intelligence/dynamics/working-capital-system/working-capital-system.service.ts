import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class WorkingCapitalSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const wc = metricsMap.get('WORKING_CAPITAL')?.value || 0;
    const dso = metricsMap.get('DSO')?.value || 0;
    const dpo = metricsMap.get('DPO')?.value || 0;
    const ccc = metricsMap.get('CASH_CONVERSION_CYCLE')?.value || 0;

    let healthScore = 85;
    if (dso > 60) healthScore = 40;
    if (wc < 0) healthScore = 25;

    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_WORKING_CAPITAL',
      systemName: 'Working Capital & Liquidity Cycle System',
      purpose: 'Models DSO, DPO, Inventory Days, and Cash Conversion Cycle velocity.',
      inputs: { dso, dpo },
      outputs: { workingCapital: wc, cashConversionCycle: ccc },
      upstreamSystems: ['SYS_REVENUE', 'SYS_VENDOR_ECONOMICS'],
      downstreamSystems: ['SYS_CASH'],
      criticalMetrics: ['WORKING_CAPITAL', 'CURRENT_RATIO', 'DSO', 'DPO', 'CASH_CONVERSION_CYCLE'],
      healthScore,
      stabilityScore: Math.min(100, Math.max(10, 100 - dso)),
      timestamp: new Date(),
    }));
  }
}
