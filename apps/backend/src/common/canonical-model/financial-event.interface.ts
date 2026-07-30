import { SourceSystem } from './canonical-model.interface';

export type FinancialEventType =
  | 'TRANSACTION_RECORDED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'FUNDING_RECEIVED'
  | 'LOAN_DISBURSED'
  | 'PAYROLL_PROCESSED'
  | 'GST_PAID'
  | 'TAX_FILED';

export interface FinancialEvent {
  eventId: string;
  eventType: FinancialEventType;
  schemaVersion: string; // e.g. "1.0"
  source: SourceSystem;
  organizationId: string;
  occurredAt: Date;
  metadata?: Record<string, any>;
}
