import { Module } from '@nestjs/common';
import { ScenarioEngineService } from './scenario/scenario-engine.service';
import { SimulationImpactService } from './impact/simulation-impact.service';
import { ScenarioComparisonService } from './comparison/scenario-comparison.service';
import { SimulationRecommendationService } from './recommendation/simulation-recommendation.service';
import { SimulationPlatformService } from './simulation-platform.service';

import { MetricsEngineService } from '../metrics/metrics-engine.service';
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

import { ValidationModule } from '../validation/validation.module';
import { ValidationPlatformService } from '../validation/validation-platform.service';

@Module({
  imports: [ValidationModule],
  providers: [
    ScenarioEngineService,
    SimulationImpactService,
    ScenarioComparisonService,
    SimulationRecommendationService,
    SimulationPlatformService,

    MetricsEngineService,
    DynamicsPlatformService,
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
    IntelligenceBusService,
  ],
  exports: [
    ScenarioEngineService,
    SimulationImpactService,
    ScenarioComparisonService,
    SimulationRecommendationService,
    SimulationPlatformService,
  ],
})
export class SimulationModule {}
