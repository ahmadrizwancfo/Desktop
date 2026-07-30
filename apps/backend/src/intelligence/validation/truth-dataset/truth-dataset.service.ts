import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TruthDatasetEntry } from '../domain/validation.types';

@Injectable()
export class TruthDatasetService implements OnModuleInit {
  private readonly logger = new Logger(TruthDatasetService.name);
  private readonly truthDataset = new Map<string, TruthDatasetEntry>();

  onModuleInit() {
    this.seedTruthData();
    this.logger.log(`⚡ TruthDatasetService Initialized with ${this.truthDataset.size} gold-standard CFO benchmarks.`);
  }

  getExpectedOutput(scenarioId: string): TruthDatasetEntry | undefined {
    return this.truthDataset.get(scenarioId);
  }

  private seedTruthData(): void {
    const truthData: TruthDatasetEntry[] = [
      {
        scenarioId: 'SCEN_SAAS_001',
        expectedRunwayMonths: 999, // Net Burn = 0 (Rev > Exp)
        expectedHealthTier: 'GOOD',
        expectedViolatedLawsCount: 1, // Receivables law violated due to high DSO
        expectedMinInsightsCount: 1,
      },
      {
        scenarioId: 'SCEN_AGENCY_001',
        expectedRunwayMonths: 4, // 400k / 100k net burn = 4 mos
        expectedHealthTier: 'MODERATE',
        expectedViolatedLawsCount: 0,
        expectedMinInsightsCount: 1,
      },
      {
        scenarioId: 'SCEN_MFG_001',
        expectedRunwayMonths: 999,
        expectedHealthTier: 'GOOD',
        expectedViolatedLawsCount: 0,
        expectedMinInsightsCount: 1,
      },
      {
        scenarioId: 'SCEN_CRISIS_001',
        expectedRunwayMonths: 0.6, // 300k / 500k = 0.6 mos (< 1 mo)
        expectedHealthTier: 'AT_RISK',
        expectedViolatedLawsCount: 1, // Burn law violated
        expectedMinInsightsCount: 1,
      },
      {
        scenarioId: 'SCEN_FUNDING_001',
        expectedRunwayMonths: 999,
        expectedHealthTier: 'EXCELLENT',
        expectedViolatedLawsCount: 0,
        expectedMinInsightsCount: 1,
      },
    ];

    for (const entry of truthData) {
      this.truthDataset.set(entry.scenarioId, entry);
    }
  }
}
