import { z } from 'zod';

export const ValidationResultSchema = z.object({
  checkName: z.string(),
  passed: z.boolean(),
  details: z.string(),
  error: z.string().optional(),
  timestamp: z.date().optional(),
});

export interface ValidationResult {
  checkName: string;
  passed: boolean;
  details: string;
  error?: string;
  timestamp?: Date;
}

export interface ScenarioDefinition {
  scenarioId: string;
  name: string;
  businessModel: 'SaaS' | 'Agency' | 'Manufacturing' | 'Marketplace' | 'D2C' | 'Services' | 'Startup' | 'Enterprise' | 'Crisis' | 'Fundraising' | 'Compliance';
  inputs: {
    cashInBank: number;
    monthlyExpenses: number;
    monthlyRevenue: number;
    accountsReceivable?: number;
    accountsPayable?: number;
    inventoryValue?: number;
    cogs?: number;
  };
}

export interface TruthDatasetEntry {
  scenarioId: string;
  expectedRunwayMonths: number;
  expectedHealthTier: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'AT_RISK' | 'CRITICAL';
  expectedViolatedLawsCount: number;
  expectedMinInsightsCount: number;
}

export const QualityMetricsSchema = z.object({
  scenarioCoverageCount: z.number(),
  decisionAccuracyPercent: z.number(),
  lawCompliancePercent: z.number(),
  determinismPercent: z.number(),
  regressionPassRatePercent: z.number(),
  avgDecisionLatencyMs: z.number(),
  platformConfidencePercent: z.number(),
  timestamp: z.date().default(() => new Date()),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
