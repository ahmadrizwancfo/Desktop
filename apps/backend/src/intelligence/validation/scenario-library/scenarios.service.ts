import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ScenarioDefinition } from '../domain/validation.types';

@Injectable()
export class ScenariosService implements OnModuleInit {
  private readonly logger = new Logger(ScenariosService.name);
  private readonly scenarios = new Map<string, ScenarioDefinition>();

  onModuleInit() {
    this.seedScenarios();
    this.logger.log(`⚡ ScenariosService Initialized with ${this.scenarios.size} deterministic financial scenarios.`);
  }

  getScenario(scenarioId: string): ScenarioDefinition | undefined {
    return this.scenarios.get(scenarioId);
  }

  getAllScenarios(): ScenarioDefinition[] {
    return Array.from(this.scenarios.values());
  }

  private seedScenarios(): void {
    const seedData: ScenarioDefinition[] = [
      // 1. SaaS - High Growth & Spiking DSO
      {
        scenarioId: 'SCEN_SAAS_001',
        name: 'Enterprise SaaS Rapid Growth with Receivables Expansion',
        businessModel: 'SaaS',
        inputs: {
          cashInBank: 5000000,
          monthlyExpenses: 1200000,
          monthlyRevenue: 1500000,
          accountsReceivable: 3500000, // DSO > 60 days
        },
      },
      // 2. Agency - Low Cash Buffer & Payroll Heavy
      {
        scenarioId: 'SCEN_AGENCY_001',
        name: 'Services Agency Tight Liquidity & High Headcount Cost',
        businessModel: 'Agency',
        inputs: {
          cashInBank: 400000,
          monthlyExpenses: 300000, // Runway = 1.3 mos (CRITICAL)
          monthlyRevenue: 200000,
        },
      },
      // 3. Manufacturing - Inventory Lockup
      {
        scenarioId: 'SCEN_MFG_001',
        name: 'Manufacturing Working Capital Locked in Finished Stock',
        businessModel: 'Manufacturing',
        inputs: {
          cashInBank: 2000000,
          monthlyExpenses: 800000,
          monthlyRevenue: 900000,
          inventoryValue: 4500000,
          cogs: 500000,
        },
      },
      // 4. Crisis - Revenue Drop & Rapid Burn Acceleration
      {
        scenarioId: 'SCEN_CRISIS_001',
        name: 'Emergency Revenue Collapse & Critical Burn Surge',
        businessModel: 'Crisis',
        inputs: {
          cashInBank: 300000,
          monthlyExpenses: 500000, // Runway < 1 month
          monthlyRevenue: 0,
        },
      },
      // 5. Fundraising - High Runway & Sustainable Operations
      {
        scenarioId: 'SCEN_FUNDING_001',
        name: 'Series-A Scaleup High Cash Buffer & Healthy Metrics',
        businessModel: 'Fundraising',
        inputs: {
          cashInBank: 25000000,
          monthlyExpenses: 1500000,
          monthlyRevenue: 2000000,
        },
      },
    ];

    for (const sc of seedData) {
      this.scenarios.set(sc.scenarioId, sc);
    }
  }
}
