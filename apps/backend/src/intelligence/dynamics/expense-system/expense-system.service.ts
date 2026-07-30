import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class ExpenseSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const grossBurn = metricsMap.get('GROSS_BURN')?.value || 0;
    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_EXPENSE',
      systemName: 'Operating Expense & Cost Structure System',
      purpose: 'Models payroll commitments, fixed opex, variable costs, and vendor spend.',
      inputs: { grossBurn },
      outputs: { monthlyOperatingExpenses: grossBurn },
      upstreamSystems: ['SYS_HIRING', 'SYS_VENDOR_ECONOMICS'],
      downstreamSystems: ['SYS_CASH', 'SYS_GROWTH'],
      criticalMetrics: ['GROSS_BURN', 'NET_BURN', 'GROSS_MARGIN_PERCENT'],
      healthScore: 85,
      stabilityScore: 90,
      timestamp: new Date(),
    }));
  }
}
