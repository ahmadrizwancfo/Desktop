import { z } from 'zod';

export const FactTypeSchema = z.enum([
  'CASH_INCREASED',
  'CASH_DECREASED',
  'RECEIVABLES_INCREASED',
  'RECEIVABLES_IMPROVED',
  'RUNWAY_REDUCED',
  'RUNWAY_EXTENDED',
  'BURN_INCREASED',
  'BURN_REDUCED',
  'REVENUE_ACCELERATING',
  'REVENUE_DECLINING',
  'PAYROLL_INCREASED',
  'VENDOR_CONCENTRATION_RISING',
  'DEBT_RATIO_INCREASING',
  'GST_LIABILITY_CREATED',
]);

export type FactType = z.infer<typeof FactTypeSchema>;

/**
 * Immutable Financial Fact Schema
 */
export const FinancialFactSchema = z.object({
  factId: z.string().uuid(),
  organizationId: z.string().uuid(),
  factType: FactTypeSchema,
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  confidence: z.number().min(0).max(1.0).default(1.0),
  supportingEvents: z.array(z.string()).default([]),
  supportingMetrics: z.record(z.number()).default({}),
  businessNarrative: z.string(),
  timestamp: z.date().default(() => new Date()),
});

export type FinancialFact = z.infer<typeof FinancialFactSchema>;
