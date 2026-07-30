import { FinancialEvent } from './financial-event.interface';

export type SourceSystem = 'TALLY' | 'ZOHO' | 'QUICKBOOKS' | 'BANK_FEED' | 'EXCEL_IMPORT' | 'MANUAL';

export interface CanonicalTransaction extends Partial<FinancialEvent> {
  id: string; // Source system transaction/voucher ID
  source: SourceSystem;
  sourceSystem?: SourceSystem; // Alias for source
  organizationId: string;
  schemaVersion?: string; // Default '1.0'

  amount: number;
  type: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME' | 'TRANSFER';
  category: string;
  originalCategory?: string; // Preserved raw category/ledger name
  normalizedCategory?: string; // Unified FounderCFO taxonomy category
  subCategory?: string;

  date: Date;
  narration?: string;
  referenceNumber?: string;

  accountName?: string;
  accountGroup?: string;

  partyName?: string; // Vendor or Customer name
  partyGstin?: string;

  // Rich Metadata Extensions (V18.5)
  importedAt?: Date;
  updatedAt?: Date;
  currency?: string;
  exchangeRate?: number;
  confidenceScore?: number; // 0.0 to 1.0
  tags?: string[];
  attachments?: string[];
  rawPayloadReference?: string;
  importBatchId?: string;
  externalReferenceId?: string;
  createdByConnector?: string;
  metadata?: Record<string, any>;

  rawPayload?: any;
}

export interface CanonicalAccount {
  id: string;
  source: SourceSystem;
  organizationId: string;

  name: string;
  group: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'BANK' | 'TAX';
  parentGroup?: string;

  openingBalance: number;
  closingBalance: number;

  currency?: string;
}

export interface CanonicalVendor {
  id: string;
  source: SourceSystem;
  organizationId: string;

  name: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;

  outstandingBalance: number;
}

export interface CanonicalCustomer {
  id: string;
  source: SourceSystem;
  organizationId: string;

  name: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;

  outstandingBalance: number;
}

export interface CanonicalInvoice {
  id: string;
  source: SourceSystem;
  organizationId: string;

  invoiceNumber: string;
  invoiceType: 'SALES' | 'PURCHASE';
  partyName: string;
  gstin?: string;

  subtotal: number;
  taxAmount: number;
  totalAmount: number;

  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: Date;
  dueDate?: Date;
}

export interface CanonicalLedger {
  id: string;
  source: SourceSystem;
  organizationId: string;

  accountName: string;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;

  periodStart: Date;
  periodEnd: Date;
}
