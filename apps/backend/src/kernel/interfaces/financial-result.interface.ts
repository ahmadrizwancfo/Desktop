import { TemporalCoordinate } from './temporal-coordinate.interface';
import { FinancialProvenance, FinancialLawResult } from './financial-provenance.interface';

/**
 * FinancialResult<T>
 * Reusable domain-level contract that every deterministic financial engine returns.
 * Carries: value, temporal metadata, provenance, confidence, and laws applied.
 */
export interface FinancialResult<T> {
  data: T;
  temporal: TemporalCoordinate;
  provenance: FinancialProvenance;
  lawsApplied: FinancialLawResult[];
  confidence: number; // 0.00 - 1.00
}
