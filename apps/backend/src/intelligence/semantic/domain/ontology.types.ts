import { z } from 'zod';

/**
 * Financial Concept Schema
 * Represents FounderCFO's formal semantic financial vocabulary.
 */
export const FinancialConceptSchema = z.object({
  conceptId: z.string(),
  name: z.string(),
  description: z.string(),
  parentConcept: z.string().nullable().default(null),
  relatedConcepts: z.array(z.string()).default([]),
  businessMeaning: z.string(),
  supportedMetrics: z.array(z.string()).default([]),
  supportedFacts: z.array(z.string()).default([]),
  supportedRules: z.array(z.string()).default([]),
  supportedInsights: z.array(z.string()).default([]),
});

export type FinancialConcept = z.infer<typeof FinancialConceptSchema>;
