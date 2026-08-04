import { TemporalCoordinate } from './temporal-coordinate.interface';
import { CanonicalFinancialState } from '../financial-state-machine.service';
import { PrimaryBusinessIntent } from './business-dna.interface';

export type ReasoningNature = 'STRUCTURAL' | 'TEMPORARY';

export interface FinancialReasoningInput {
  organizationId: string;
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number;
  runwayDays: number;
  financialState: CanonicalFinancialState;
  primaryIntent: PrimaryBusinessIntent;
  confidenceScore: number;
  temporal: TemporalCoordinate;
  recentDeltaBurnPercent?: number;
  recentDeltaRevenuePercent?: number;
  topExpenseCategory?: string;
  gstPayable?: number;
}

export interface FinancialReasoningResult {
  organizationId: string;
  whatChanged: string;
  whyItChanged: string;
  primaryCause: string;
  secondaryCauses: string[];
  nature: ReasoningNature;
  riskIfIgnored: string;
  recommendedAction: string;
  expectedOutcome: string;
  alternativeActions: string[];
  confidence: number;
  evidence: string[];
  temporal: TemporalCoordinate;
  generatedAt: string;
}
