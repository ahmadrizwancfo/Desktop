import { z } from 'zod';

/**
 * Immutable Financial Law Schema
 */
export const FinancialLawSchema = z.object({
  identifier: z.string(),
  description: z.string(),
  formula: z.string(),
  businessMeaning: z.string(),
  exceptions: z.array(z.string()).default([]),
  affectedSystems: z.array(z.string()).default([]),
  violationSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  isViolated: z.boolean().default(false),
});

export type FinancialLaw = z.infer<typeof FinancialLawSchema>;
