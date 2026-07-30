import { z } from 'zod';
import { CanonicalInvoiceLineItemSchema } from './canonical-invoice.schema';

/**
 * Canonical Vendor Bill Schema
 * Normalized representation for inbound supplier bills / accounts payable.
 */
export const CanonicalVendorBillSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  internalBillId: z.string().uuid(),
  externalBillId: z.string(),
  organizationId: z.string().uuid(),
  sourceProvider: z.string(),
  billNumber: z.string(),
  
  // Vendor / Supplier Info
  vendorName: z.string(),
  vendorEmail: z.string().email().optional(),
  vendorGstin: z.string().optional(),
  
  // Dates
  billDate: z.date(),
  dueDate: z.date(),
  
  // Financial Amounts
  subTotalAmount: z.number(),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
  paidAmount: z.number().default(0),
  outstandingAmount: z.number(),
  currency: z.string().default('INR'),
  
  // Status
  status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'VOID']),
  
  // Tax / ITC Eligibility
  isItcEligible: z.boolean().default(true),
  tdsDeductionSection: z.string().optional(),
  tdsDeductionAmount: z.number().default(0),
  
  lineItems: z.array(CanonicalInvoiceLineItemSchema).default([]),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanonicalVendorBill = z.infer<typeof CanonicalVendorBillSchema>;
