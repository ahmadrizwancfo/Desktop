import { TemporalCoordinate } from './temporal-coordinate.interface';
import { FinancialProvenance } from './financial-provenance.interface';
import { CanonicalFinancialState } from '../financial-state-machine.service';
import { PrimaryBusinessIntent } from './business-dna.interface';
import { FinancialReasoningResult } from './financial-reasoning.interface';

export type StrategicEventType = 
  | 'HIRING_EXPANSION'
  | 'CASH_CRISIS'
  | 'GST_STATUTORY_PENALTY'
  | 'FUNDRAISING_WINDOW'
  | 'PRICING_INCREASE'
  | 'CUSTOMER_CHURN_EVENT'
  | 'VENDOR_DEPENDENCY_RISK'
  | 'COST_REDUCTION_PROGRAM';

export interface StrategicMemoryOutcome {
  realizedRunwayDeltaDays?: number;
  realizedBurnDelta?: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PENDING';
  lessonLearned?: string;
}

export interface StrategicBusinessMemory {
  id: string;
  organizationId: string;
  eventType: StrategicEventType;
  summary: string;
  triggeringFacts: Record<string, any>;
  reasoningSnapshot: FinancialReasoningResult;
  businessState: CanonicalFinancialState;
  businessIntent: PrimaryBusinessIntent;
  actionsTaken: string[];
  outcome: StrategicMemoryOutcome;
  confidence: number;
  temporal: TemporalCoordinate;
  provenance: FinancialProvenance;
  recordedAt: string;
}
