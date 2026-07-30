import { z } from 'zod';

export const SimulationDecisionTypeSchema = z.enum([
  'HIRING',
  'SALARY_CHANGE',
  'EXPENSE_REDUCTION',
  'MARKETING_SPEND',
  'PRICING',
  'COLLECTIONS_IMPROVEMENT',
  'VENDOR_PAYMENT_TERMS',
  'DEBT',
  'EQUITY_FUNDING',
]);

export type SimulationDecisionType = z.infer<typeof SimulationDecisionTypeSchema>;

export const SimulationDecisionInputSchema = z.object({
  type: SimulationDecisionTypeSchema,
  value: z.number(),
  description: z.string().optional(),
  params: z.record(z.any()).optional(),
});

export interface SimulationDecisionInput {
  type: SimulationDecisionType;
  value: number;
  description?: string;
  params?: Record<string, any>;
}

export const SimulationComparisonResultSchema = z.object({
  metricName: z.string(),
  baselineValue: z.number(),
  simulatedValue: z.number(),
  absoluteDelta: z.number(),
  percentageDelta: z.number(),
  impactStatus: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL']),
});

export type SimulationComparisonResult = z.infer<typeof SimulationComparisonResultSchema>;

export const SimulationResultSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  decision: SimulationDecisionInputSchema,
  assumptions: z.array(z.string()).default([]),
  affectedSystems: z.array(z.string()).default([]),
  impactSummary: z.string(),
  businessHealthChanges: z.object({
    baselineScore: z.number(),
    simulatedScore: z.number(),
    delta: z.number(),
    baselineTier: z.string(),
    simulatedTier: z.string(),
  }),
  financialMetricChanges: z.record(SimulationComparisonResultSchema),
  recommendation: z.object({
    isRecommended: z.boolean(),
    recommendedTiming: z.string(),
    rationale: z.string(),
    alternativeStrategy: z.string(),
  }),
  confidence: z.number().min(0).max(1.0).default(1.0),
  validationResult: z.object({
    passed: z.boolean(),
    details: z.string(),
  }),
  executionTimeMs: z.number(),
  timestamp: z.date().default(() => new Date()),
});

export type SimulationResult = z.infer<typeof SimulationResultSchema>;
