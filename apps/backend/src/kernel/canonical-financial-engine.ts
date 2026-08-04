import { FinancialResult } from './interfaces/financial-result.interface';
import { TemporalCoordinate } from './interfaces/temporal-coordinate.interface';
import { FinancialProvenance, FinancialLawResult } from './interfaces/financial-provenance.interface';

export interface CashCalculationInput {
  bankAccountBalances: Array<{ id?: string; balance: number | string }>;
  undepositedChecks?: number;
  statutoryHoldbacks?: number;
}

export interface BurnCalculationInput {
  inflows30D: number;
  outflows30D: number;
  periodMonths?: number;
}

export interface RunwayCalculationResult {
  runwayMonths: number;
  runwayDays: number;
  zeroCashDate: string | null;
  formattedZeroCashDate: string | null;
  status: 'SUSTAINABLE' | 'WARNING' | 'CRITICAL';
}

/**
 * CANONICAL FINANCIAL ENGINE KERNEL
 * 
 * Single, pure, deterministic calculation kernel for FounderCFO.
 * Zero duplicate formulas. Zero floating-point rounding drift.
 */
export class CanonicalFinancialEngine {
  public static readonly KERNEL_VERSION = 'v1.0.0-kernel';

  /**
   * Calculates total liquid cash balance from active bank accounts.
   */
  public static calculateCashBalance(input: CashCalculationInput): number {
    const totalBankBalance = (input.bankAccountBalances || []).reduce((acc, account) => {
      const val = typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance;
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const undeposited = input.undepositedChecks || 0;
    const holdbacks = input.statutoryHoldbacks || 0;

    const netAvailableCash = totalBankBalance + undeposited - holdbacks;
    return Math.max(0, Math.round(netAvailableCash * 100) / 100);
  }

  /**
   * Calculates monthly net burn rate from inflows and outflows.
   * Net Burn = Outflows - Inflows (if Outflows > Inflows, else 0).
   */
  public static calculateNetBurn(input: BurnCalculationInput): number {
    const period = input.periodMonths && input.periodMonths > 0 ? input.periodMonths : 1;
    const totalInflow = Math.max(0, input.inflows30D || 0);
    const totalOutflow = Math.max(0, input.outflows30D || 0);

    const netBurnPeriod = totalOutflow - totalInflow;
    const monthlyNetBurn = netBurnPeriod / period;

    return Math.max(0, Math.round(monthlyNetBurn * 100) / 100);
  }

  /**
   * Calculates exact runway in months, days, and Zero Cash Date.
   */
  public static calculateRunway(cash: number, monthlyBurn: number, startDate: Date = new Date()): RunwayCalculationResult {
    const safeCash = Math.max(0, cash || 0);
    const safeBurn = Math.max(0, monthlyBurn || 0);

    if (safeCash === 0) {
      const todayIso = startDate.toISOString().split('T')[0];
      return {
        runwayMonths: 0,
        runwayDays: 0,
        zeroCashDate: todayIso,
        formattedZeroCashDate: startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'CRITICAL',
      };
    }

    if (safeBurn <= 0) {
      return {
        runwayMonths: 999,
        runwayDays: 30000,
        zeroCashDate: null,
        formattedZeroCashDate: null,
        status: 'SUSTAINABLE',
      };
    }

    const runwayMonths = Math.round((safeCash / safeBurn) * 100) / 100;
    const runwayDays = Math.round(runwayMonths * 30.4375); // Standard average month length

    const zeroCashDateObj = new Date(startDate.getTime() + runwayDays * 24 * 60 * 60 * 1000);
    const zeroCashDate = zeroCashDateObj.toISOString().split('T')[0];
    const formattedZeroCashDate = zeroCashDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let status: 'SUSTAINABLE' | 'WARNING' | 'CRITICAL' = 'SUSTAINABLE';
    if (runwayDays <= 30) {
      status = 'CRITICAL';
    } else if (runwayDays <= 92) {
      status = 'WARNING';
    }

    return {
      runwayMonths,
      runwayDays,
      zeroCashDate,
      formattedZeroCashDate,
      status,
    };
  }

  /**
   * Helper to construct a standardized FinancialResult<T> domain contract.
   */
  public static createResult<T>(
    data: T,
    options: {
      effectiveDate?: string;
      horizonType?: TemporalCoordinate['horizonType'];
      projectionDaysOut?: number;
      formulaUsed: string;
      sourceRecordIds?: string[];
      lawsApplied?: FinancialLawResult[];
      confidenceScore?: number;
    }
  ): FinancialResult<T> {
    const nowIso = new Date().toISOString();
    const effectiveDate = options.effectiveDate || nowIso.split('T')[0];

    const temporal: TemporalCoordinate = {
      asOfTimestamp: nowIso,
      effectiveDate,
      horizonType: options.horizonType || 'ACTUAL',
      projectionDaysOut: options.projectionDaysOut ?? 0,
    };

    const provenance: FinancialProvenance = {
      engineVersion: CanonicalFinancialEngine.KERNEL_VERSION,
      computedAt: nowIso,
      formulaUsed: options.formulaUsed,
      sourceRecordIds: options.sourceRecordIds || [],
      lawsApplied: options.lawsApplied || [],
      confidenceScore: options.confidenceScore ?? 1.0,
    };

    return {
      data,
      temporal,
      provenance,
      lawsApplied: options.lawsApplied || [],
      confidence: options.confidenceScore ?? 1.0,
    };
  }
}
