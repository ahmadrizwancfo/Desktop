import { z } from 'zod';

export const FinancialEventCategorySchema = z.enum([
  'CASH_FLOW',
  'REVENUE',
  'EXPENSE',
  'TAX',
  'COMPLIANCE',
  'TREASURY',
  'PAYROLL',
  'WORKING_CAPITAL',
]);

export type FinancialEventCategory = z.infer<typeof FinancialEventCategorySchema>;

export const FinancialEventTypeSchema = z.enum([
  'TRANSACTION_INGESTED',
  'INVOICE_CREATED',
  'INVOICE_PAID',
  'PAYMENT_SETTLED',
  'TAX_LIABILITY_PROVISIONED',
  'TAX_REMITTED',
  'ACCOUNT_BALANCED',
  'BURN_SPIKED',
  'PAYROLL_DISBURSED',
  'VENDOR_BILL_RECEIVED',
]);

export type FinancialEventType = z.infer<typeof FinancialEventTypeSchema>;

export const FinancialEventSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type FinancialEventSeverity = z.infer<typeof FinancialEventSeveritySchema>;

/**
 * Immutable Financial Event Schema
 * Core primitive representing an immutable audit event in the financial ledger lifecycle.
 */
export const FinancialEventSchema = z.object({
  eventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  eventType: FinancialEventTypeSchema,
  eventCategory: FinancialEventCategorySchema,
  timestamp: z.date().default(() => new Date()),
  sourceObjectIds: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  confidence: z.number().min(0).max(1.0).default(1.0),
  severity: FinancialEventSeveritySchema.default('LOW'),
  origin: z.string().default('CANONICAL_PIPELINE'),
  processingVersion: z.string().default('1.0'),
});

export type FinancialEvent = z.infer<typeof FinancialEventSchema>;
