import { z } from 'zod';

/**
 * Canonical Invoice Line Item Schema
 */
export const CanonicalInvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().default(1),
  unitPrice: z.number(),
  taxRatePercent: z.number().default(0),
  taxAmount: z.number().default(0),
  hsnSacCode: z.string().optional(),
  totalAmount: z.number(),
});

export type CanonicalInvoiceLineItem = z.infer<typeof CanonicalInvoiceLineItemSchema>;

/**
 * Canonical Invoice Schema
 * Normalized object for outbound customer billing / accounts receivable.
 */
export const CanonicalInvoiceSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalInvoiceId: z.string().uuid(),
  externalInvoiceId: z.string(),
  organizationId: z.string().uuid(),
  sourceProvider: z.string(),
  invoiceNumber: z.string(),
  
  // Customer & Counterparty
  customerName: z.string(),
  customerEmail: z.string().email().optional(),
  customerGstin: z.string().optional(),
  
  // Dates
  issueDate: z.date(),
  dueDate: z.date(),
  
  // Financial Amounts
  subTotalAmount: z.number(),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
  paidAmount: z.number().default(0),
  outstandingAmount: z.number(),
  currency: z.string().default('INR'),
  
  // Status
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID']),
  
  lineItems: z.array(CanonicalInvoiceLineItemSchema).default([]),
  notes: z.string().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalInvoice = z.infer<typeof CanonicalInvoiceSchema>;
