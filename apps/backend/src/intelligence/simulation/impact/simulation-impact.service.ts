import { Injectable, Logger } from '@nestjs/common';
import { MetricsEngineService, FinancialMetricInputParams } from '../../metrics/metrics-engine.service';
import { DynamicsPlatformService, BusinessDynamicsProcessResult } from '../../dynamics/dynamics-platform.service';
import { EvaluatedScenarioParams } from '../scenario/scenario-engine.service';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

export interface SimulationImpactOutput {
  baselineParams: FinancialMetricInputParams;
  simulatedParams: FinancialMetricInputParams;
  baselineMetrics: Map<MetricKey, FinancialMetric>;
  simulatedMetrics: Map<MetricKey, FinancialMetric>;
  baselineDynamics: BusinessDynamicsProcessResult;
  simulatedDynamics: BusinessDynamicsProcessResult;
}

@Injectable()
export class SimulationImpactService {
  private readonly logger = new Logger(SimulationImpactService.name);

  constructor(
    private readonly metricsEngine: MetricsEngineService,
    private readonly dynamicsPlatform: DynamicsPlatformService,
  ) {}

  /**
   * Evaluates the baseline vs simulated states using Business Dynamics & Metrics Engine.
   */
  evaluateImpact(
    orgId: string,
    baselineInput: FinancialMetricInputParams,
    scenario: EvaluatedScenarioParams
  ): SimulationImpactOutput {
    // 1. Compute Baseline State
    const baselineMetrics = this.metricsEngine.calculateAllMetrics(baselineInput);
    const baselineDynamics = this.dynamicsPlatform.processBusinessDynamics({
      organizationId: orgId,
      metricsMap: baselineMetrics,
      triggerSystemId: scenario.affectedSystems[0] || 'SYS_CASH',
      impactDescription: `Baseline state evaluation for ${scenario.decision.type}`,
    });

    // 2. Construct Simulated Input Params by applying Scenario Deltas
    const deltas = scenario.deltaInputs;
    let newMonthlyExpenses = baselineInput.monthlyExpenses;
    let newMonthlyRevenue = baselineInput.monthlyRevenue;
    let newCashInBank = baselineInput.cashInBank;
    let newAr = baselineInput.accountsReceivable ?? 0;
    let newAp = baselineInput.accountsPayable ?? 0;

    // Apply Salary % or fixed Expense Delta
    if (deltas.monthlyExpensesDelta !== undefined) {
      if (scenario.decision.type === 'SALARY_CHANGE') {
        const payrollPortion = baselineInput.monthlyExpenses * 0.6; // Assumes ~60% payroll ratio
        const payrollDelta = payrollPortion * (deltas.monthlyExpensesDelta / 100);
        newMonthlyExpenses = Math.max(0, baselineInput.monthlyExpenses + payrollDelta);
      } else {
        newMonthlyExpenses = Math.max(0, baselineInput.monthlyExpenses + deltas.monthlyExpensesDelta);
      }
    }

    // Apply Pricing % or fixed Revenue Delta
    if (deltas.monthlyRevenueDelta !== undefined) {
      if (scenario.decision.type === 'PRICING') {
        newMonthlyRevenue = Math.max(0, baselineInput.monthlyRevenue * (1 + deltas.monthlyRevenueDelta / 100));
      } else {
        newMonthlyRevenue = Math.max(0, baselineInput.monthlyRevenue + deltas.monthlyRevenueDelta);
      }
    }

    // Apply Cash In Bank Delta (Debt / Equity)
    if (deltas.cashInBankDelta !== undefined) {
      newCashInBank = Math.max(0, baselineInput.cashInBank + deltas.cashInBankDelta);
    }

    // Apply DSO Delta (Collections Improvement)
    if (deltas.dsoDeltaDays !== undefined && baselineInput.monthlyRevenue > 0) {
      const currentDso = (newAr / (baselineInput.monthlyRevenue / 30));
      const targetDso = Math.max(1, currentDso + deltas.dsoDeltaDays);
      newAr = Math.round(targetDso * (baselineInput.monthlyRevenue / 30));
    }

    // Apply DPO Delta (Vendor Payment Terms Extension)
    if (deltas.dpoDeltaDays !== undefined && baselineInput.monthlyExpenses > 0) {
      const currentDpo = (newAp / (baselineInput.monthlyExpenses / 30));
      const targetDpo = currentDpo + deltas.dpoDeltaDays;
      newAp = Math.round(targetDpo * (baselineInput.monthlyExpenses / 30));
    }

    const simulatedInput: FinancialMetricInputParams = {
      ...baselineInput,
      monthlyExpenses: newMonthlyExpenses,
      monthlyRevenue: newMonthlyRevenue,
      cashInBank: newCashInBank,
      accountsReceivable: newAr,
      accountsPayable: newAp,
    };

    // 3. Compute Simulated State
    const simulatedMetrics = this.metricsEngine.calculateAllMetrics(simulatedInput);
    const simulatedDynamics = this.dynamicsPlatform.processBusinessDynamics({
      organizationId: orgId,
      metricsMap: simulatedMetrics,
      triggerSystemId: scenario.affectedSystems[0] || 'SYS_CASH',
      impactDescription: `Simulated impact execution for ${scenario.decision.type} (${scenario.decision.value})`,
    });

    this.logger.log(
      `Evaluated Impact for Org ${orgId} [Decision: ${scenario.decision.type}]: Baseline Health (${baselineDynamics.healthReport.overallHealthScore}) -> Simulated Health (${simulatedDynamics.healthReport.overallHealthScore})`
    );

    return {
      baselineParams: baselineInput,
      simulatedParams: simulatedInput,
      baselineMetrics,
      simulatedMetrics,
      baselineDynamics,
      simulatedDynamics,
    };
  }
}
