import { FinancialEvent } from './financial-event.interface';

export type SourceSystem = 'TALLY' | 'ZOHO' | 'QUICKBOOKS' | 'BANK_FEED' | 'EXCEL_IMPORT' | 'MANUAL';

export interface CanonicalTransaction extends Partial<FinancialEvent> {
  id: string; // Source system transaction/voucher ID
  source: SourceSystem;
  sourceSystem?: SourceSystem; // Alias for source
  organizationId: string;
  schemaVersion?: string; // Default '1.0'

  amount: number | string;
  type: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME' | 'TRANSFER';
  direction?: 'DEBIT' | 'CREDIT';
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

/**
 * FCS v1.1 EXTENSIONS (Law 17 — Canonical Before Intelligence)
 */

export interface CanonicalLedgerEntry {
  voucherId: string;
  voucherType: 'PAYMENT' | 'RECEIPT' | 'SALES' | 'PURCHASE' | 'JOURNAL' | 'CONTRA';
  voucherDate: Date;
  ledgerName: string;
  ledgerGroup: 'CURRENT_ASSET' | 'CURRENT_LIABILITY' | 'DIRECT_EXPENSE' | 'INDIRECT_EXPENSE' | 'SALES' | 'BANK';
  debitAmount: string;
  creditAmount: string;
  isPrimary: boolean;
}

export interface CanonicalTaxEvent {
  id: string;
  organizationId: string;
  taxType: 'GST_18' | 'TDS_10' | 'ADVANCE_TAX';
  baseAmount: string;
  lockedBufferAmount: string;
  effectiveDate: Date;
  dueDate: Date;
  status: 'LOCKED' | 'PAID' | 'RECONCILED';
  sourceTransactionId?: string;
}

export interface CanonicalDecisionInput {
  organizationId: string;
  asOfDate: Date;
  cashInBank: string;
  spendableCash: string;
  monthlyNetBurn: string;
  trueRunwayMonths: string;
  dsoDays: number;
  statutoryReserveLocked: string;
  activeAnomaliesCount: number;
  companyDna: {
    stage: 'SEED' | 'SERIES_A' | 'BOOTSTRAPPED' | 'GROWTH';
    businessModel: 'B2B_SAAS' | 'MARKETPLACE' | 'SERVICES' | 'D2C';
    targetRunwayFloorMonths: number;
  };
}

export interface ExplainableConfidenceReport {
  score: number;
  certificationStatus: 'CERTIFIED' | 'REQUIRES_REVIEW' | 'REJECTED';
  checks: {
    headerMatched: boolean;
    dateFormatMatched: boolean;
    balanceColumnVerified: boolean;
    debitCreditIdentified: boolean;
    narrationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
    unicodeNormalized: boolean;
  };
  skippedDisclaimerRows: number;
  warnings: string[];
  assumptionsMade: string[];
}

export interface CertificationScore {
  component: string;
  version: string;
  certifiedScore: number;
  certifiedDate: string;
  status: 'CERTIFIED' | 'CONDITIONALLY_CERTIFIED' | 'FAILED';
  testCasesPassed: number;
  testCasesTotal: number;
}

