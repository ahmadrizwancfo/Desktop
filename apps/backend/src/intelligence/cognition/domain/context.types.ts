import { z } from 'zod';

export const BusinessStageSchema = z.enum([
  'SEED',
  'SERIES_A',
  'SERIES_B',
  'BOOTSTRAPPED',
  'PROFITABLE',
]);

export type BusinessStage = z.infer<typeof BusinessStageSchema>;

export const BusinessModelSchema = z.enum([
  'ENTERPRISE_SAAS',
  'MARKETPLACE',
  'AGENCY',
  'MANUFACTURING',
  'EXPORT',
  'SEASONAL',
]);

export type BusinessModel = z.infer<typeof BusinessModelSchema>;

/**
 * Business Context Schema
 */
export const BusinessContextSchema = z.object({
  stage: BusinessStageSchema.default('SEED'),
  businessModel: BusinessModelSchema.default('ENTERPRISE_SAAS'),
  riskTolerance: z.enum(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']).default('BALANCED'),
  targetRunwayMonths: z.number().default(12),
  maxAcceptableBurn: z.number().default(1000000),
  contextMultiplier: z.number().default(1.0),
});

export type BusinessContext = z.infer<typeof BusinessContextSchema>;
