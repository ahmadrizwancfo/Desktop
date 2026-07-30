import { z } from 'zod';

export const ExplanationUrgencySchema = z.enum(['IMMEDIATE', 'HIGH', 'MEDIUM', 'MONITOR']);
export type ExplanationUrgency = z.infer<typeof ExplanationUrgencySchema>;

export const ExplanationOwnerSchema = z.enum(['FOUNDER', 'CFO', 'ACCOUNTANT', 'COLLECTIONS_TEAM']);
export type ExplanationOwner = z.infer<typeof ExplanationOwnerSchema>;

/**
 * Structured Explanation Schema
 * Serves as the universal explainability layer for Signals, Risk, AI, Decision Lab, and Daily Brief.
 */
export const StructuredExplanationSchema = z.object({
  explanationId: z.string().uuid(),
  insightId: z.string().uuid(),
  organizationId: z.string().uuid(),
  whatHappened: z.string(),
  whyItHappened: z.string(),
  comparedToWhat: z.string(),
  evidence: z.array(z.string()).default([]),
  supportingMetrics: z.record(z.number()).default({}),
  supportingFacts: z.array(z.string()).default([]),
  supportingRules: z.array(z.string()).default([]),
  businessImpact: z.string(),
  confidence: z.number().min(0).max(1.0).default(1.0),
  urgency: ExplanationUrgencySchema.default('MEDIUM'),
  recommendedOwner: ExplanationOwnerSchema.default('FOUNDER'),
  timestamp: z.date().default(() => new Date()),
});

export type StructuredExplanation = z.infer<typeof StructuredExplanationSchema>;
