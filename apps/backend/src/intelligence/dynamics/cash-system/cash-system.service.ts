import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class CashSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const cash = metricsMap.get('CASH_BALANCE')?.value || 0;
    const netBurn = metricsMap.get('NET_BURN')?.value || 0;
    const runway = metricsMap.get('RUNWAY_MONTHS')?.value || 999;

    let healthScore = 100;
    if (runway < 3) healthScore = 20;
    else if (runway < 6) healthScore = 60;
    else if (runway < 12) healthScore = 85;

    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_CASH',
      systemName: 'Cash & Liquidity System',
      purpose: 'Models cash reserves, collections inflow, burn velocity, and runway horizon.',
      inputs: { netBurn },
      outputs: { cashBalance: cash, runwayMonths: runway },
      upstreamSystems: ['SYS_REVENUE', 'SYS_EXPENSE', 'SYS_WORKING_CAPITAL'],
      downstreamSystems: ['SYS_FUNDING', 'SYS_HIRING', 'SYS_GROWTH'],
      criticalMetrics: ['CASH_BALANCE', 'NET_BURN', 'RUNWAY_MONTHS'],
      healthScore,
      stabilityScore: Math.min(100, Math.max(0, runway * 8)),
      timestamp: new Date(),
    }));
  }
}
