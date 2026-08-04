export interface FinancialLawResult {
  lawId: string;
  lawName: string;
  passed: boolean;
  message?: string;
  severity?: 'INFO' | 'WARNING' | 'VIOLATION';
}

export interface FinancialProvenance {
  engineVersion: string;         // e.g. "v1.0.0-kernel"
  computedAt: string;            // ISO 8601 Timestamp
  formulaUsed: string;           // Explanatory mathematical formula
  sourceRecordIds: string[];     // Array of underlying record IDs (transactions, bank accounts)
  lawsApplied: FinancialLawResult[];
  confidenceScore: number;       // 0.00 - 1.00
}
