import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { DependencyGraphService } from './dependency-graph/dependency-graph.service';
import { FinancialLawsEngineService } from './financial-laws/financial-laws-engine.service';
import { BusinessHealthEngineService } from './business-health/business-health-engine.service';
import { DynamicsPlatformService } from './dynamics-platform.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [
    IntelligenceBusService,
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
})
export class DynamicsModule {}
