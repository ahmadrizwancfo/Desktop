import { z } from 'zod';
import { RuleSeveritySchema } from './rule.types';

/**
 * Immutable Semantic Insight Schema
 * Represents structured business understanding derived deterministically from facts, metrics, and rules.
 */
export const SemanticInsightSchema = z.object({
  insightId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  detailedNarrative: z.string(),
  supportingFacts: z.array(z.string()).default([]),
  supportingMetrics: z.record(z.number()).default({}),
  triggeredRules: z.array(z.string()).default([]),
  businessMeaning: z.string(),
  severity: RuleSeveritySchema.default('LOW'),
  confidence: z.number().min(0).max(1.0).default(1.0),
  priority: z.number().default(1),
  timestamp: z.date().default(() => new Date()),
});

export type SemanticInsight = z.infer<typeof SemanticInsightSchema>;
