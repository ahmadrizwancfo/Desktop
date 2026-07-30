import { CanonicalTransaction } from '../domain/canonical-transaction.schema';
import { CanonicalAccount } from '../domain/canonical-account.schema';
import { CanonicalInvoice } from '../domain/canonical-invoice.schema';

export interface PipelineStageResult<T> {
  success: boolean;
  data: T;
  warnings?: string[];
  error?: string;
  quarantined?: boolean;
  quarantineReason?: string;
}

export interface PipelineProcessingResult<T> {
  success: boolean;
  processedCount: number;
  validCount: number;
  normalizedCount: number;
  enrichedCount: number;
  duplicateCount: number;
  quarantinedCount: number;
  executionTimeMs: number;
  items: T[];
  quarantinedItems: Array<{ payload: any; reason: string }>;
}

export interface PipelineMetrics {
  totalProcessed: number;
  totalSuccess: number;
  validationFailures: number;
  normalizationErrors: number;
  duplicatesDetected: number;
  quarantinedRecords: number;
  avgLatencyMs: number;
  successRatePercent: number;
  lastRunAt?: Date;
}

export interface TaxRuleConfig {
  defaultGstRate: number;
  defaultTdsRates: Record<string, number>; // section -> percent (e.g. "194C" -> 1.0, "194J" -> 10.0)
  enableAutomaticItc: boolean;
}
