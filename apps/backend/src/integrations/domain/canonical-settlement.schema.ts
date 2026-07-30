import { z } from 'zod';

/**
 * Canonical Settlement Schema
 * Normalized representation for payment gateway payout settlements (Gross Volume - Fees - GST = Net Payout).
 */
export const CanonicalSettlementSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalSettlementId: z.string().uuid(),
  externalSettlementId: z.string(),
  organizationId: z.string().uuid(),
  sourceProvider: z.string(), // e.g. 'RAZORPAY', 'STRIPE', 'PAYTM'
  
  // Financial Breakdowns
  grossAmount: z.number(),
  feeAmount: z.number().default(0),
  taxAmount: z.number().default(0), // GST on gateway fee
  netAmount: z.number(),
  currency: z.string().default('INR'),
  
  // Destination
  destinationBankAccountId: z.string().uuid().optional(),
  destinationUtr: z.string().optional(),
  
  // Dates
  initiatedAt: z.date(),
  settledAt: z.date(),
  status: z.enum(['INITIATED', 'SETTLED', 'FAILED', 'REVERSED']),
  
  associatedTransactionIds: z.array(z.string()).default([]),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalSettlement = z.infer<typeof CanonicalSettlementSchema>;
