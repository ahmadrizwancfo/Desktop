import { Injectable, Logger } from '@nestjs/common';
import { SimulationComparisonResult } from '../domain/simulation.types';
import { SimulationImpactOutput } from '../impact/simulation-impact.service';
import { MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class ScenarioComparisonService {
  private readonly logger = new Logger(ScenarioComparisonService.name);

  /**
   * Compares Baseline vs Simulated Metrics and determines impact status per key metric.
   */
  compareStates(impact: SimulationImpactOutput): Record<string, SimulationComparisonResult> {
    const comparison: Record<string, SimulationComparisonResult> = {};

    const keysToCompare: MetricKey[] = [
      'CASH_BALANCE',
      'RUNWAY_MONTHS',
      'NET_BURN',
      'GROSS_BURN',
      'MRR',
      'WORKING_CAPITAL',
      'DSO',
      'DPO',
    ];

    for (const key of keysToCompare) {
      const baseM = impact.baselineMetrics.get(key);
      const simM = impact.simulatedMetrics.get(key);

      const baseVal = baseM?.value ?? 0;
      const simVal = simM?.value ?? 0;
      const absDelta = Number((simVal - baseVal).toFixed(2));
      let pctDelta = 0;
      if (baseVal !== 0) {
        pctDelta = Number((((simVal - baseVal) / Math.abs(baseVal)) * 100).toFixed(1));
      }

      let impactStatus: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CRITICAL' = 'NEUTRAL';

      if (key === 'RUNWAY_MONTHS') {
        if (simVal < 3) impactStatus = 'CRITICAL';
        else if (absDelta < 0) impactStatus = 'NEGATIVE';
        else if (absDelta > 0) impactStatus = 'POSITIVE';
      } else if (key === 'NET_BURN' || key === 'GROSS_BURN' || key === 'DSO') {
        // Higher burn or higher DSO is negative
        if (absDelta > 0) impactStatus = 'NEGATIVE';
        else if (absDelta < 0) impactStatus = 'POSITIVE';
      } else {
        // Higher cash, revenue, working capital, DPO is positive
        if (absDelta > 0) impactStatus = 'POSITIVE';
        else if (absDelta < 0) impactStatus = 'NEGATIVE';
      }

      comparison[key] = {
        metricName: key,
        baselineValue: baseVal,
        simulatedValue: simVal,
        absoluteDelta: absDelta,
        percentageDelta: pctDelta,
        impactStatus,
      };
    }

    this.logger.log(`Generated state comparison across ${Object.keys(comparison).length} key metrics.`);
    return comparison;
  }
}
