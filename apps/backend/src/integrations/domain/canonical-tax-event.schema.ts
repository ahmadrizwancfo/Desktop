import { z } from 'zod';

/**
 * Canonical Tax Event Schema
 * Normalized representation for regulatory compliance liabilities (GST, TDS, Advance Tax, PT).
 */
export const CanonicalTaxEventSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalTaxEventId: z.string().uuid(),
  organizationId: z.string().uuid(),
  sourceProvider: z.string(),
  
  // Tax Type & Fiscal Period
  taxType: z.enum(['GST_OUTPUT', 'GST_INPUT_ITC', 'TDS_PAYABLE', 'TDS_RECEIVABLE', 'ADVANCE_TAX', 'PROFESSIONAL_TAX', 'OTHER_TAX']),
  fiscalYear: z.string(), // e.g. "FY2025-26"
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  assessmentPeriod: z.string(), // e.g. "2026-07"
  
  // Financial Amounts
  grossAmount: z.number(),
  taxAmount: z.number(),
  penaltyAmount: z.number().default(0),
  interestAmount: z.number().default(0),
  currency: z.string().default('INR'),
  
  // Compliance Timestamps & Status
  dueDate: z.date(),
  remittedDate: z.date().optional(),
  status: z.enum(['PENDING', 'PROVISIONED', 'REMITTED', 'OVERDUE', 'EXEMPT']),
  
  challanNumber: z.string().optional(),
  ackNumber: z.string().optional(),
  notes: z.string().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalTaxEvent = z.infer<typeof CanonicalTaxEventSchema>;
