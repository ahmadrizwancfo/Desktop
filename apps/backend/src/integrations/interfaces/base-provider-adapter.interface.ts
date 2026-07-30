import { CanonicalAccount } from '../domain/canonical-account.schema';
import { CanonicalTransaction } from '../domain/canonical-transaction.schema';
import { CanonicalInvoice } from '../domain/canonical-invoice.schema';
import { CanonicalTaxEvent } from '../domain/canonical-tax-event.schema';
import { ProviderCapabilities, SyncOptions, SyncResult } from './provider-capabilities.interface';

/**
 * Base Provider Adapter Contract
 * Universal interface that every external provider adapter (Razorpay, Zoho, Tally, AA, Mock) must implement.
 */
export interface BaseProviderAdapter {
  readonly providerName: string;
  readonly providerVersion: string;
  
  getCapabilities(): ProviderCapabilities;
  
  connect(organizationId: string, credentials: Record<string, any>): Promise<boolean>;
  disconnect(organizationId: string): Promise<boolean>;
  testConnection(organizationId: string): Promise<{ active: boolean; latencyMs: number }>;
  
  pullAccounts(organizationId: string, options?: SyncOptions): Promise<CanonicalAccount[]>;
  pullTransactions(organizationId: string, options?: SyncOptions): Promise<CanonicalTransaction[]>;
  pullInvoices(organizationId: string, options?: SyncOptions): Promise<CanonicalInvoice[]>;
  pullTaxEvents(organizationId: string, options?: SyncOptions): Promise<CanonicalTaxEvent[]>;
  
  sync(organizationId: string, options?: SyncOptions): Promise<SyncResult>;
}

/**
 * Injection token for NestJS multi-provider registration
 */
export const INTEGRATION_PROVIDER_TOKEN = 'INTEGRATION_PROVIDER_TOKEN';
