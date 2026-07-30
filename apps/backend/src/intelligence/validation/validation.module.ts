import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScenariosService } from './scenario-library/scenarios.service';
import { TruthDatasetService } from './truth-dataset/truth-dataset.service';
import { DecisionValidatorService } from './decision-validator/decision-validator.service';
import { ExplainabilityValidatorService } from './explainability-validator/explainability-validator.service';
import { ConsistencyValidatorService } from './consistency-validator/consistency-validator.service';
import { LawValidatorService } from './law-validator/law-validator.service';
import { DynamicsValidatorService } from './dynamics-validator/dynamics-validator.service';
import { RegressionEngineService } from './regression/regression-engine.service';
import { BenchmarkEngineService } from './benchmark/benchmark-engine.service';
import { PerformanceValidatorService } from './performance/performance-validator.service';
import { QualityDashboardService } from './dashboard/quality-dashboard.service';
import { ValidationPlatformService } from './validation-platform.service';

import { MetricsEngineService } from '../metrics/metrics-engine.service';
import { FinancialFactsEngineService } from '../facts/financial-facts.service';
import { RuleRegistryService } from '../semantic/rules/rule-registry.service';
import { BusinessRulesEngineService } from '../semantic/rules/business-rules-engine.service';
import { FinancialInsightEngineService } from '../semantic/insights/financial-insight-engine.service';
import { ExplainabilityEngineService } from '../semantic/explainability/explainability-engine.service';
import { EvidenceEngineService } from '../cognition/evidence/evidence-engine.service';
import { ConfidenceEngineService } from '../cognition/confidence/confidence-engine.service';
import { CausalReasoningEngineService } from '../cognition/causal/causal-reasoning-engine.service';
import { BusinessContextEngineService } from '../cognition/context/business-context.service';
import { UniversalDecisionService } from '../cognition/decision/universal-decision.service';
import { DynamicsPlatformService } from '../dynamics/dynamics-platform.service';
import { CashSystemService } from '../dynamics/cash-system/cash-system.service';
import { RevenueSystemService } from '../dynamics/revenue-system/revenue-system.service';
import { GrowthSystemService } from '../dynamics/growth-system/growth-system.service';
import { WorkingCapitalSystemService } from '../dynamics/working-capital-system/working-capital-system.service';
import { ExpenseSystemService } from '../dynamics/expense-system/expense-system.service';
import { HiringSystemService } from '../dynamics/hiring-system/hiring-system.service';
import { FundingSystemService } from '../dynamics/funding-system/funding-system.service';
import { ComplianceSystemService } from '../dynamics/compliance-system/compliance-system.service';
import { CustomerEconomicsService } from '../dynamics/customer-economics/customer-economics.service';
import { VendorEconomicsService } from '../dynamics/vendor-economics/vendor-economics.service';
import { DependencyGraphService } from '../dynamics/dependency-graph/dependency-graph.service';
import { FinancialLawsEngineService } from '../dynamics/financial-laws/financial-laws-engine.service';
import { BusinessHealthEngineService } from '../dynamics/business-health/business-health-engine.service';

import { IntelligenceBusService } from '../bus/intelligence-bus.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [
    IntelligenceBusService,
    ScenariosService,
    TruthDatasetService,
    DecisionValidatorService,
    ExplainabilityValidatorService,
    ConsistencyValidatorService,
    LawValidatorService,
    DynamicsValidatorService,
    RegressionEngineService,
    BenchmarkEngineService,
    PerformanceValidatorService,
    QualityDashboardService,
    ValidationPlatformService,

    MetricsEngineService,
    FinancialFactsEngineService,
    RuleRegistryService,
    BusinessRulesEngineService,
    FinancialInsightEngineService,
    ExplainabilityEngineService,
    EvidenceEngineService,
    ConfidenceEngineService,
    CausalReasoningEngineService,
    BusinessContextEngineService,
    UniversalDecisionService,
    CashSystemService,
    RevenueSystemService,
    GrowthSystemService,
    WorkingCapitalSystemService,
    ExpenseSystemService,
    HiringSystemService,
    FundingSystemService,
    ComplianceSystemService,
    CustomerEconomicsService,
    VendorEconomicsService,
    DependencyGraphService,
    FinancialLawsEngineService,
    BusinessHealthEngineService,
    DynamicsPlatformService,
  ],
  exports: [
    ScenariosService,
    TruthDatasetService,
    DecisionValidatorService,
    ExplainabilityValidatorService,
    ConsistencyValidatorService,
    LawValidatorService,
    DynamicsValidatorService,
    RegressionEngineService,
    BenchmarkEngineService,
    PerformanceValidatorService,
    QualityDashboardService,
    ValidationPlatformService,
  ],
})
export class ValidationModule {}
