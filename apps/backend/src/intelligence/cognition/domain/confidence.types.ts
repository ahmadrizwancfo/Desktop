import { z } from 'zod';

export const ConfidenceBandSchema = z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']);
export type ConfidenceBand = z.infer<typeof ConfidenceBandSchema>;

/**
 * Universal Confidence Evaluation Schema
 */
export const ConfidenceEvaluationSchema = z.object({
  confidenceScore: z.number().min(0).max(1.0),
  confidenceBand: ConfidenceBandSchema,
  factors: z.object({
    dataCompleteness: z.number().min(0).max(1.0),
    dataFreshness: z.number().min(0).max(1.0),
    historicalConsistency: z.number().min(0).max(1.0),
    evidenceQuality: z.number().min(0).max(1.0),
    ruleCertainty: z.number().min(0).max(1.0),
    metricReliability: z.number().min(0).max(1.0),
    coverage: z.number().min(0).max(1.0),
    conflictingEvidencePenalty: z.number().min(0).max(1.0).default(0),
  }),
  confidenceExplanation: z.string(),
});

export type ConfidenceEvaluation = z.infer<typeof ConfidenceEvaluationSchema>;
