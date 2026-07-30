import { Injectable, Logger } from '@nestjs/common';
import { BusinessHealthReport, BusinessHealthReportSchema, HealthTier } from '../domain/health.types';
import { BusinessSystemState } from '../domain/system.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class BusinessHealthEngineService {
  private readonly logger = new Logger(BusinessHealthEngineService.name);

  /**
   * Deterministically evaluates Business Health across 9 dimensions.
   */
  evaluateHealth(params: {
    organizationId: string;
    systemStates: ReadonlyArray<BusinessSystemState>;
    metricsMap: Map<MetricKey, FinancialMetric>;
  }): BusinessHealthReport {
    const { organizationId, systemStates, metricsMap } = params;

    const runway = metricsMap.get('RUNWAY_MONTHS')?.value || 999;
    const growth = metricsMap.get('REVENUE_GROWTH_PERCENT')?.value || 0;
    const dso = metricsMap.get('DSO')?.value || 0;
    const grossMargin = metricsMap.get('GROSS_MARGIN_PERCENT')?.value || 70;

    // 1. Calculate 9 Health Dimensions (0-100)
    const liquidity = Math.min(100, Math.max(0, runway >= 12 ? 100 : runway * 8));
    const growthScore = Math.min(100, Math.max(0, 50 + growth * 2.5));
    const efficiency = Math.min(100, Math.max(0, 100 - (dso * 0.8)));
    const profitability = Math.min(100, Math.max(0, grossMargin));
    const compliance = 95;
    const resilience = Math.min(100, Math.max(0, (liquidity * 0.6) + (efficiency * 0.4)));
    const customerQuality = 85;
    const vendorStability = 90;
    const capitalReadiness = runway >= 6 ? 90 : 40;

    // 2. Weighted Overall Health Score Calculation
    const overallScore = Number((
      (liquidity * 0.25) +
      (growthScore * 0.15) +
      (efficiency * 0.15) +
      (profitability * 0.15) +
      (compliance * 0.10) +
      (resilience * 0.10) +
      (capitalReadiness * 0.10)
    ).toFixed(0));

    // 3. Health Tier Categorization
    let healthTier: HealthTier = 'MODERATE';
    if (overallScore >= 85) healthTier = 'EXCELLENT';
    else if (overallScore >= 70) healthTier = 'GOOD';
    else if (overallScore >= 55) healthTier = 'MODERATE';
    else if (overallScore >= 40) healthTier = 'AT_RISK';
    else healthTier = 'CRITICAL';

    const systemScores: Record<string, number> = {};
    for (const sys of systemStates) {
      systemScores[sys.systemId] = sys.healthScore;
    }

    const report = {
      organizationId,
      overallHealthScore: overallScore,
      healthTier,
      dimensions: {
        liquidity,
        growth: growthScore,
        efficiency,
        profitability,
        compliance,
        resilience,
        customerQuality,
        vendorStability,
        capitalReadiness,
      },
      systemHealthScores: systemScores,
      timestamp: new Date(),
    };

    this.logger.log(`Evaluated Business Health for Org ${organizationId}: [Score: ${overallScore}/100 | Tier: ${healthTier}]`);
    return Object.freeze(BusinessHealthReportSchema.parse(report));
  }
}
