import { Injectable } from '@nestjs/common';
import { BusinessSystemState, BusinessSystemStateSchema } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class VendorEconomicsService {
  evaluateSystem(metricsMap: Map<MetricKey, FinancialMetric>): BusinessSystemState {
    const dpo = metricsMap.get('DPO')?.value || 30;
    return Object.freeze(BusinessSystemStateSchema.parse({
      systemId: 'SYS_VENDOR_ECONOMICS',
      systemName: 'Vendor Dependency & Supply Chain System',
      purpose: 'Models vendor concentration, payment behavior, supplier risk, and credit terms.',
      inputs: { dpo },
      outputs: { supplierRiskIndex: 15 },
      upstreamSystems: ['SYS_EXPENSE'],
      downstreamSystems: ['SYS_WORKING_CAPITAL'],
      criticalMetrics: ['DPO', 'WORKING_CAPITAL'],
      healthScore: 88,
      stabilityScore: 92,
      timestamp: new Date(),
    }));
  }
}
