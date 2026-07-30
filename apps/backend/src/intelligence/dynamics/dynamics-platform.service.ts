import { Injectable, Logger } from '@nestjs/common';
import { CashSystemService } from './cash-system/cash-system.service';
import { RevenueSystemService } from './revenue-system/revenue-system.service';
import { GrowthSystemService } from './growth-system/growth-system.service';
import { WorkingCapitalSystemService } from './working-capital-system/working-capital-system.service';
import { ExpenseSystemService } from './expense-system/expense-system.service';
import { HiringSystemService } from './hiring-system/hiring-system.service';
import { FundingSystemService } from './funding-system/funding-system.service';
import { ComplianceSystemService } from './compliance-system/compliance-system.service';
import { CustomerEconomicsService } from './customer-economics/customer-economics.service';
import { VendorEconomicsService } from './vendor-economics/vendor-economics.service';
import { DependencyGraphService, CascadingImpactStep } from './dependency-graph/dependency-graph.service';
import { FinancialLawsEngineService } from './financial-laws/financial-laws-engine.service';
import { BusinessHealthEngineService } from './business-health/business-health-engine.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';
import { FinancialMetric, MetricKey } from '../domain/financial-metric.schema';
import { BusinessSystemState } from './domain/system.types';
import { FinancialLaw } from './domain/laws.types';
import { BusinessHealthReport } from './domain/health.types';

export interface BusinessDynamicsProcessResult {
  organizationId: string;
  systemStates: BusinessSystemState[];
  laws: FinancialLaw[];
  healthReport: BusinessHealthReport;
  cascadingImpacts: CascadingImpactStep[];
  executionTimeMs: number;
}

@Injectable()
export class DynamicsPlatformService {
  private readonly logger = new Logger(DynamicsPlatformService.name);

  constructor(
    private readonly cashSystem: CashSystemService,
    private readonly revenueSystem: RevenueSystemService,
    private readonly growthSystem: GrowthSystemService,
    private readonly workingCapitalSystem: WorkingCapitalSystemService,
    private readonly expenseSystem: ExpenseSystemService,
    private readonly hiringSystem: HiringSystemService,
    private readonly fundingSystem: FundingSystemService,
    private readonly complianceSystem: ComplianceSystemService,
    private readonly customerEconomics: CustomerEconomicsService,
    private readonly vendorEconomics: VendorEconomicsService,
    private readonly dependencyGraph: DependencyGraphService,
    private readonly lawsEngine: FinancialLawsEngineService,
    private readonly healthEngine: BusinessHealthEngineService,
    private readonly intelligenceBus: IntelligenceBusService,
  ) {}

  /**
   * Main Business Dynamics Facade Flow:
   * Evaluate 10 Systems ──► Evaluate Dependency Graph ──► Evaluate Financial Laws ──► Compute Business Health ──► Publish to Bus
   */
  processBusinessDynamics(params: {
    organizationId: string;
    metricsMap: Map<MetricKey, FinancialMetric>;
    triggerSystemId?: string;
    impactDescription?: string;
  }): BusinessDynamicsProcessResult {
    const startTime = Date.now();
    const { organizationId, metricsMap } = params;

    // Step 1: Evaluate 10 Business Systems
    const systemStates: BusinessSystemState[] = [
      this.cashSystem.evaluateSystem(metricsMap),
      this.revenueSystem.evaluateSystem(metricsMap),
      this.growthSystem.evaluateSystem(metricsMap),
      this.workingCapitalSystem.evaluateSystem(metricsMap),
      this.expenseSystem.evaluateSystem(metricsMap),
      this.hiringSystem.evaluateSystem(metricsMap),
      this.fundingSystem.evaluateSystem(metricsMap),
      this.complianceSystem.evaluateSystem(),
      this.customerEconomics.evaluateSystem(metricsMap),
      this.vendorEconomics.evaluateSystem(metricsMap),
    ];

    // Step 2: Trace Cascading System Impact Traversal
    const triggerId = params.triggerSystemId || 'SYS_HIRING';
    const triggerDesc = params.impactDescription || 'Headcount Expansion (Payroll Increase)';
    const cascadingImpacts = this.dependencyGraph.traceCascadingImpact(triggerId, triggerDesc);

    // Step 3: Evaluate 7 Financial Laws
    const laws = this.lawsEngine.evaluateLaws(metricsMap);

    // Step 4: Compute Business Health Score & Report
    const healthReport = this.healthEngine.evaluateHealth({
      organizationId,
      systemStates,
      metricsMap,
    });

    // Step 5: Publish Business Dynamics Update to Intelligence Bus
    this.intelligenceBus.publishMetric({
      metricKey: 'CASH_BALANCE',
      organizationId,
      value: healthReport.overallHealthScore,
      formattedValue: `${healthReport.overallHealthScore}/100`,
      formula: 'Weighted Multi-System Business Health Score',
      inputs: { healthScore: healthReport.overallHealthScore },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: '1.0',
    });

    const executionTimeMs = Date.now() - startTime;
    this.logger.log(
      `Business Dynamics Processing Completed for Org ${organizationId}: [Systems: ${systemStates.length} | Health: ${healthReport.overallHealthScore}/100 (${healthReport.healthTier}) | Violated Laws: ${laws.filter(l => l.isViolated).length}] (${executionTimeMs}ms)`
    );

    return {
      organizationId,
      systemStates,
      laws,
      healthReport,
      cascadingImpacts,
      executionTimeMs,
    };
  }

  // Getters for individual engines
  getCashSystem(): CashSystemService { return this.cashSystem; }
  getRevenueSystem(): RevenueSystemService { return this.revenueSystem; }
  getDependencyGraph(): DependencyGraphService { return this.dependencyGraph; }
  getLawsEngine(): FinancialLawsEngineService { return this.lawsEngine; }
  getHealthEngine(): BusinessHealthEngineService { return this.healthEngine; }
}
