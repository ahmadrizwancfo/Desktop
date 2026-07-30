import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class HiringSystemService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const grossBurn = metricsMap.get('GROSS_BURN')?.value || 0;
    const estPayroll = grossBurn * 0.45; // ~45% average payroll allocation
    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_HIRING',
      systemName: 'Headcount & Payroll System',
      purpose: 'Models headcount capacity, hiring velocity, and fixed payroll commitments.',
      inputs: { estimatedPayroll: estPayroll },
      outputs: { payrollCommitment: estPayroll },
      upstreamSystems: ['SYS_CASH'],
      downstreamSystems: ['SYS_EXPENSE', 'SYS_GROWTH'],
      criticalMetrics: ['GROSS_BURN'],
      healthScore: 85,
      stabilityScore: 88,
      timestamp: new Date(),
    }));
  }
}
