import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import { SimulationDecisionInput, SimulationResult } from './domain/simulation.types';
import { ScenarioEngineService } from './scenario/scenario-engine.service';
import { SimulationImpactService } from './impact/simulation-impact.service';
import { ScenarioComparisonService } from './comparison/scenario-comparison.service';
import { SimulationRecommendationService } from './recommendation/simulation-recommendation.service';
import { ValidationPlatformService } from '../validation/validation-platform.service';
import { FinancialMetricInputParams } from '../metrics/metrics-engine.service';

@Injectable()
export class SimulationPlatformService {
  private readonly logger = new Logger(SimulationPlatformService.name);

  constructor(
    private readonly scenarioEngine: ScenarioEngineService,
    private readonly impactService: SimulationImpactService,
    private readonly comparisonService: ScenarioComparisonService,
    private readonly recommendationService: SimulationRecommendationService,
    private readonly validationPlatform: ValidationPlatformService,
  ) {}

  /**
   * Main entry point for Decision Simulation Engine.
   * Runs a complete deterministic simulation for any supported decision type.
   */
  runSimulation(params: {
    organizationId: string;
    decision: SimulationDecisionInput;
    baselineParams?: FinancialMetricInputParams;
  }): SimulationResult {
    const startTime = Date.now();
    const simulationId = crypto.randomUUID();
    const { organizationId, decision } = params;

    // 1. Establish Baseline Financial Parameters (Default to realistic baseline if omitted)
    const baselineParams: FinancialMetricInputParams = params.baselineParams || {
      organizationId,
      cashInBank: 5000000,
      monthlyExpenses: 1200000,
      monthlyRevenue: 1500000,
      accountsReceivable: 1000000,
      accountsPayable: 600000,
    };

    // 2. Build Scenario Definition
    const scenario = this.scenarioEngine.createScenario(decision);

    // 3. Propagate Impact across Business Dynamics & Metrics
    const impact = this.impactService.evaluateImpact(organizationId, baselineParams, scenario);

    // 4. Compare Baseline vs Simulated Metric States
    const financialMetricChanges = this.comparisonService.compareStates(impact);

    // 5. Generate Deterministic Recommendation
    const recommendation = this.recommendationService.generateRecommendation(scenario, impact, financialMetricChanges);

    // 6. Validate Simulation Output via Phase 6E FIVF Validation Platform
    const validationCheck = this.validationPlatform.validateConsistency(
      impact.baselineMetrics.get('CASH_BALANCE')?.value,
      impact.simulatedMetrics.get('CASH_BALANCE')?.value
    );

    // 7. Construct Business Health Changes
    const baselineScore = impact.baselineDynamics.healthReport.overallHealthScore;
    const simulatedScore = impact.simulatedDynamics.healthReport.overallHealthScore;
    const healthDelta = Number((simulatedScore - baselineScore).toFixed(1));

    const impactSummary = `Decision [${decision.type}] (${decision.value}) alters Health Score by ${healthDelta >= 0 ? '+' : ''}${healthDelta} points (${baselineScore} -> ${simulatedScore}). Simulated runway: ${financialMetricChanges['RUNWAY_MONTHS']?.simulatedValue ?? 'N/A'} mos.`;

    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `Simulation Completed [ID: ${simulationId}] for Org ${organizationId} in ${executionTimeMs}ms. Recommended: ${recommendation.isRecommended}`
    );

    return {
      simulationId,
      organizationId,
      decision,
      assumptions: scenario.assumptions,
      affectedSystems: scenario.affectedSystems,
      impactSummary,
      businessHealthChanges: {
        baselineScore,
        simulatedScore,
        delta: healthDelta,
        baselineTier: impact.baselineDynamics.healthReport.healthTier,
        simulatedTier: impact.simulatedDynamics.healthReport.healthTier,
      },
      financialMetricChanges,
      recommendation,
      confidence: 1.0,
      validationResult: {
        passed: validationCheck.passed,
        details: validationCheck.details,
      },
      executionTimeMs,
      timestamp: new Date(),
    };
  }
}
