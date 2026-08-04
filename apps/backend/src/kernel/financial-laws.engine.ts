import { FinancialLawResult } from './interfaces/financial-provenance.interface';

export interface FinancialLawContext {
  cashInBank: number;
  monthlyBurn: number;
  monthlyRevenue?: number;
  netProfit?: number;
  accountsReceivable?: number;
  gstPayable?: number;
  tdsReceivable?: number;
}

export class FinancialLawsEngine {
  /**
   * Evaluates financial inputs against immutable core financial laws.
   */
  public static evaluateLaws(context: FinancialLawContext): FinancialLawResult[] {
    const results: FinancialLawResult[] = [];

    // Law 01: Revenue is not Cash
    const rev = context.monthlyRevenue || 0;
    results.push({
      lawId: 'LAW_01_REVENUE_NOT_CASH',
      lawName: 'Revenue is not Cash',
      passed: true,
      message: `Revenue (₹${rev}) is recognized sales, but liquidity depends strictly on collected cash (₹${context.cashInBank}).`,
      severity: 'INFO',
    });

    // Law 02: Profit is not Cash
    const profit = context.netProfit || 0;
    results.push({
      lawId: 'LAW_02_PROFIT_NOT_CASH',
      lawName: 'Profit is not Cash',
      passed: true,
      message: `Accounting Net Profit (₹${profit}) does not equal operating cash balance.`,
      severity: 'INFO',
    });

    // Law 03: Accounts Receivable is not Liquid Cash
    const ar = context.accountsReceivable || 0;
    const isHighAr = ar > context.cashInBank && context.cashInBank < 100000;
    results.push({
      lawId: 'LAW_03_RECEIVABLES_NOT_LIQUIDITY',
      lawName: 'Receivables are not Liquidity',
      passed: !isHighAr,
      message: isHighAr
        ? `Receivables (₹${ar}) exceed liquid cash (₹${context.cashInBank}). High collections risk.`
        : `Receivables (₹${ar}) tracked separately from liquid cash.`,
      severity: isHighAr ? 'WARNING' : 'INFO',
    });

    // Law 04: GST Payable is Statutory Liability, not Revenue
    const gst = context.gstPayable || 0;
    const isGstRisk = gst > 0 && context.cashInBank < gst;
    results.push({
      lawId: 'LAW_04_GST_NOT_REVENUE',
      lawName: 'GST Payable is Statutory Liability',
      passed: !isGstRisk,
      message: isGstRisk
        ? `CRITICAL: Outstanding GST Liability (₹${gst}) exceeds liquid bank cash (₹${context.cashInBank})!`
        : `GST Payable (₹${gst}) correctly isolated from operational revenue.`,
      severity: isGstRisk ? 'VIOLATION' : 'INFO',
    });

    // Law 05: High Burn + Low Cash = High Failure Risk
    const burn = context.monthlyBurn || 0;
    const runwayDays = burn > 0 ? Math.round((context.cashInBank / burn) * 30.4375) : 999;
    const isRunwayRisk = runwayDays <= 60 && burn > 0;
    results.push({
      lawId: 'LAW_05_BURN_RUNWAY_RISK',
      lawName: 'High Burn with Short Runway Risk',
      passed: !isRunwayRisk,
      message: isRunwayRisk
        ? `Runway is ${runwayDays} days (₹${context.cashInBank} cash / ₹${burn} monthly burn). Immediate mitigation required.`
        : `Runway bounds healthy (${runwayDays} days).`,
      severity: isRunwayRisk ? (runwayDays <= 30 ? 'VIOLATION' : 'WARNING') : 'INFO',
    });

    return results;
  }
}
