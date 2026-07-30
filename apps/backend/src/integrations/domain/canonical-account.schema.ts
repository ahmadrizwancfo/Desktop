import { z } from 'zod';

/**
 * Canonical Account Schema
 * Serves as the normalized internal abstraction for external financial accounts (bank, card, gateway, wallet).
 */
export const CanonicalAccountSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalAccountId: z.string().uuid(),
  organizationId: z.string().uuid(),
  sourceProvider: z.string(), // e.g. 'ACCOUNT_AGGREGATOR', 'RAZORPAY', 'ZOHO_BOOKS', 'TALLY', 'MOCK'
  externalAccountId: z.string(),
  accountName: z.string(),
  accountType: z.enum(['SAVINGS', 'CURRENT', 'CREDIT_CARD', 'PAYMENT_GATEWAY', 'LOAN', 'OD_CC', 'OTHER']),
  currency: z.string().default('INR'),
  currentBalance: z.number(),
  availableBalance: z.number().optional(),
  accountNumberMasked: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FROZEN', 'DISCONNECTED']).default('ACTIVE'),
  lastSyncedAt: z.date().default(() => new Date()),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalAccount = z.infer<typeof CanonicalAccountSchema>;

/**
 * Canonical Bank Account Schema
 * Specialized extension focused on traditional banking institutions & FIUs.
 */
export const CanonicalBankAccountSchema = CanonicalAccountSchema.extend({
  accountNumberFull: z.string().optional(),
  branchName: z.string().optional(),
  micrCode: z.string().optional(),
  swiftCode: z.string().optional(),
  isPrimaryAccount: z.boolean().default(false),
});

export type CanonicalBankAccount = z.infer<typeof CanonicalBankAccountSchema>;
