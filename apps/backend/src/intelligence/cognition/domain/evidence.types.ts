import { z } from 'zod';

export const EvidenceSourceSchema = z.enum([
  'METRIC',
  'EVENT',
  'FACT',
  'RULE',
  'INSIGHT',
  'HISTORICAL_COMPARISON',
  'CONCEPT',
]);

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

/**
 * Immutable Evidence Item Schema
 */
export const EvidenceItemSchema = z.object({
  evidenceId: z.string().uuid(),
  source: EvidenceSourceSchema,
  sourceId: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(1.0).default(1.0),
  relevance: z.number().min(0).max(1.0).default(1.0),
  confidence: z.number().min(0).max(1.0).default(1.0),
  freshnessHours: z.number().default(0),
  traceabilityKey: z.string(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
