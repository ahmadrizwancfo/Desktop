import { Injectable } from '@nestjs/common';
import { FinancialLawResult } from './interfaces/financial-provenance.interface';

export type CanonicalFinancialState = 
  | 'CRITICAL_CASH_CONSTRAINED'
  | 'CASH_CONSTRAINED'
  | 'COMPLIANCE_RISK_PERIOD'
  | 'RECOVERING'
  | 'EXPANDING'
  | 'HEALTHY';

export interface StateMachineEvaluationInput {
  cashInBank: number;
  monthlyBurn: number;
  runwayDays: number;
  gstPayable?: number;
  lawsResults?: FinancialLawResult[];
}

export interface FinancialStateTransitionResult {
  currentState: CanonicalFinancialState;
  legacyModeAlias: 'CRITICAL' | 'AT_RISK' | 'STABLE';
  reason: string;
  evaluatedAt: string;
}

@Injectable()
export class FinancialStateMachineService {
  /**
   * Deterministic Finite State Machine.
   * Single canonical owner for state transitions across FounderCFO.
   */
  public evaluateState(input: StateMachineEvaluationInput): FinancialStateTransitionResult {
    const nowIso = new Date().toISOString();

    // 1. Compliance Risk Period (Statutory GST Liability exceeds liquid cash)
    const gstViolation = (input.lawsResults || []).find(
      l => l.lawId === 'LAW_04_GST_NOT_REVENUE' && l.severity === 'VIOLATION'
    );
    if (gstViolation || ((input.gstPayable || 0) > input.cashInBank && input.cashInBank > 0)) {
      return {
        currentState: 'COMPLIANCE_RISK_PERIOD',
        legacyModeAlias: 'CRITICAL',
        reason: 'Statutory GST Liability exceeds available liquid cash balance.',
        evaluatedAt: nowIso,
      };
    }

    // 2. Critical Cash Constrained (Runway <= 30 days)
    if (input.runwayDays <= 30 && input.monthlyBurn > 0) {
      return {
        currentState: 'CRITICAL_CASH_CONSTRAINED',
        legacyModeAlias: 'CRITICAL',
        reason: `Cash runway sits at ${input.runwayDays} days. Immediate cash intervention required.`,
        evaluatedAt: nowIso,
      };
    }

    // 3. Cash Constrained (Runway <= 90 days)
    if (input.runwayDays <= 90 && input.monthlyBurn > 0) {
      return {
        currentState: 'CASH_CONSTRAINED',
        legacyModeAlias: 'AT_RISK',
        reason: `Cash runway sits at ${input.runwayDays} days (below 90-day safe threshold).`,
        evaluatedAt: nowIso,
      };
    }

    // 4. Expanding (Runway >= 365 days / 12 months)
    if (input.runwayDays >= 365) {
      return {
        currentState: 'EXPANDING',
        legacyModeAlias: 'STABLE',
        reason: 'Strong capital position (> 12 months runway). Capital deployment available.',
        evaluatedAt: nowIso,
      };
    }

    // 5. Default Healthy
    return {
      currentState: 'HEALTHY',
      legacyModeAlias: 'STABLE',
      reason: 'Financial metrics operating within healthy system bounds.',
      evaluatedAt: nowIso,
    };
  }
}
