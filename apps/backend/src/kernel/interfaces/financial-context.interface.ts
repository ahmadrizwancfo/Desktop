import { TemporalCoordinate } from './temporal-coordinate.interface';
import { FinancialProvenance, FinancialLawResult } from './financial-provenance.interface';
import { BusinessDnaProfile, BusinessIntentVector } from './business-dna.interface';
import { FinancialStateTransitionResult } from '../financial-state-machine.service';
import { FinancialReasoningResult } from './financial-reasoning.interface';
import { StrategicBusinessMemory } from './financial-memory.interface';

export interface FinancialContextCompileInput {
  organizationId: string;
  cashBalance: number;
  monthlyBurn: number;
  monthlyRevenue?: number;
  gstPayable?: number;
  rawProfile?: any;
  temporal?: TemporalCoordinate;
}

export interface UnifiedFinancialContext {
  organizationId: string;
  metrics: {
    cashBalance: number;
    monthlyBurn: number;
    runwayMonths: number;
    runwayDays: number;
    formattedZeroCashDate: string | null;
  };
  state: FinancialStateTransitionResult;
  reasoning: FinancialReasoningResult;
  dna: BusinessDnaProfile;
  intent: BusinessIntentVector;
  lawsApplied: FinancialLawResult[];
  historicalMemories: StrategicBusinessMemory[];
  confidence: number;
  temporal: TemporalCoordinate;
  provenance: FinancialProvenance;
  compiledAt: string;
}
