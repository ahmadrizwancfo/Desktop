/**
 * Capabilities & metadata exposed by a registered Integration Provider Adapter.
 */
export interface ProviderCapabilities {
  providerName: string;
  providerVersion: string;
  capabilities: string[]; // e.g. ['BANKING', 'INVOICING', 'TAXATION', 'PAYMENTS']
  supportedObjects: Array<'ACCOUNT' | 'TRANSACTION' | 'INVOICE' | 'VENDOR_BILL' | 'TAX_EVENT' | 'SETTLEMENT'>;
  supportsInitialSync: boolean;
  supportsIncrementalSync: boolean;
  supportsWebhooks: boolean;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED' | 'MAINTENANCE';
  registrationTimestamp: Date;
}

export interface SyncOptions {
  mode: 'INITIAL' | 'INCREMENTAL' | 'MANUAL' | 'CRON_RECOVERY';
  fromDate?: Date;
  toDate?: Date;
  checkpointCursor?: string;
}

export interface SyncResult {
  success: boolean;
  providerName: string;
  organizationId: string;
  accountsProcessed: number;
  transactionsImported: number;
  invoicesImported: number;
  recordsSkipped: number;
  recordsQuarantined: number;
  nextCheckpointCursor?: string;
  executionTimeMs: number;
  errorDetails?: string;
}
