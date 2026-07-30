import { z } from 'zod';

/**
 * Canonical Transaction Schema
 * Serves as the normalized representation for all financial inflows, outflows, fees, taxes, and transfers.
 */
export const CanonicalTransactionSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalTransactionId: z.string().uuid(),
  externalTransactionId: z.string(),
  idempotencyHash: z.string(), // SHA-256 hash (orgId:source:externalId:amount:date)
  organizationId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  sourceProvider: z.string(), // e.g. 'ACCOUNT_AGGREGATOR', 'RAZORPAY', 'ZOHO_BOOKS', 'TALLY', 'MOCK'
  
  // Financial Core
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  direction: z.enum(['INFLOW', 'OUTFLOW']),
  transactionType: z.enum(['CREDIT', 'DEBIT', 'FEE', 'TAX_REMITTANCE', 'REFUND', 'INTERNAL_TRANSFER', 'SETTLEMENT']),
  
  // Timestamps
  transactionDate: z.date(),
  settlementDate: z.date().optional(),
  importTimestamp: z.date().default(() => new Date()),
  
  // Counterparty & Classification
  counterpartyName: z.string().default('UNKNOWN'),
  counterpartyGstin: z.string().optional(),
  category: z.string().default('UNCATEGORIZED'),
  subCategory: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  
  // Tax Metadata (India Regulatory Compliant)
  gstMetadata: z.object({
    isGstApplicable: z.boolean().default(false),
    gstRatePercent: z.number().optional(),
    cgstAmount: z.number().default(0),
    sgstAmount: z.number().default(0),
    igstAmount: z.number().default(0),
    hsnSacCode: z.string().optional(),
    isItcEligible: z.boolean().default(true),
  }).optional(),
  
  tdsMetadata: z.object({
    isTdsDeducted: z.boolean().default(false),
    section: z.string().optional(), // e.g. '194C', '194J', '194I'
    tdsRatePercent: z.number().optional(),
    tdsAmount: z.number().default(0),
  }).optional(),
  
  // Quality & Reconciliation Tracking
  confidenceScore: z.number().min(0).max(1.0).default(1.0),
  reconciliationStatus: z.enum(['UNMATCHED', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'MANUALLY_RECONCILED']).default('UNMATCHED'),
  rawPayloadId: z.string().uuid().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalTransaction = z.infer<typeof CanonicalTransactionSchema>;
