import { Injectable, Logger } from '@nestjs/common';
import { ScenariosService } from '../scenario-library/scenarios.service';
import { TruthDatasetService } from '../truth-dataset/truth-dataset.service';
import { ValidationResult } from '../domain/validation.types';
import { MetricsEngineService } from '../../metrics/metrics-engine.service';
import { DynamicsPlatformService } from '../../dynamics/dynamics-platform.service';
import crypto from 'crypto';

@Injectable()
export class RegressionEngineService {
  private readonly logger = new Logger(RegressionEngineService.name);

  constructor(
    private readonly scenariosService: ScenariosService,
    private readonly truthDatasetService: TruthDatasetService,
    private readonly metricsEngine: MetricsEngineService,
    private readonly dynamicsPlatform: DynamicsPlatformService,
  ) {}

  /**
   * Re-run all scenario benchmarks and verify expected runway & health outputs against truth dataset.
   */
  runRegressionSuite(): ValidationResult {
    const scenarios = this.scenariosService.getAllScenarios();
    let passedCount = 0;

    for (const sc of scenarios) {
      const truth = this.truthDatasetService.getExpectedOutput(sc.scenarioId);
      if (!truth) continue;

      const orgId = crypto.randomUUID();
      const metricsMap = this.metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: sc.inputs.cashInBank,
        monthlyExpenses: sc.inputs.monthlyExpenses,
        monthlyRevenue: sc.inputs.monthlyRevenue,
        accountsReceivable: sc.inputs.accountsReceivable,
        accountsPayable: sc.inputs.accountsPayable,
        inventoryValue: sc.inputs.inventoryValue,
        cogs: sc.inputs.cogs,
      });

      const dynamicsResult = this.dynamicsPlatform.processBusinessDynamics({
        organizationId: orgId,
        metricsMap,
      });

      const runwayVal = metricsMap.get('RUNWAY_MONTHS')?.value || 0;
      const healthTier = dynamicsResult.healthReport.healthTier;

      // Verify tolerance range
      const runwayMatch = Math.abs(runwayVal - truth.expectedRunwayMonths) < 1.0 || (runwayVal > 100 && truth.expectedRunwayMonths > 100);
      const tierMatch = healthTier === truth.expectedHealthTier;

      if (runwayMatch && tierMatch) {
        passedCount++;
      } else {
        console.log(`[REGRESSION MISMATCH] Scenario [${sc.scenarioId}]: Runway (${runwayVal} vs expected ${truth.expectedRunwayMonths}), Tier (${healthTier} vs expected ${truth.expectedHealthTier})`);
        this.logger.warn(`Regression Mismatch on Scenario [${sc.scenarioId}]: Runway (${runwayVal} vs expected ${truth.expectedRunwayMonths}), Tier (${healthTier} vs expected ${truth.expectedHealthTier})`);
      }
    }

    const passRate = (passedCount / scenarios.length) * 100;
    this.logger.log(`Ran Regression Suite across ${scenarios.length} scenarios -> Pass Rate: ${passRate.toFixed(1)}%`);

    return {
      checkName: 'REGRESSION_SUITE',
      passed: passRate === 100,
      details: `Regression Pass Rate: ${passRate.toFixed(1)}% (${passedCount}/${scenarios.length} scenarios passed truth dataset match).`,
    };
  }
}
