import { Injectable, Logger } from '@nestjs/common';
import { FinancialMetric, MetricKey } from '../domain/financial-metric.schema';
import { CanonicalFinancialEngine } from '../../kernel/canonical-financial-engine';

export interface FinancialMetricInputParams {
  organizationId: string;
  cashInBank: number;
  monthlyExpenses: number;
  monthlyRevenue: number;
  previousMonthlyRevenue?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  inventoryValue?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  cogs?: number; // Cost of Goods Sold
  variableCosts?: number;
  capitalExpenditure?: number;
  depreciationAmortization?: number;
  interestExpense?: number;
  taxExpense?: number;
}

@Injectable()
export class MetricsEngineService {
  private readonly logger = new Logger(MetricsEngineService.name);
  private readonly calculationVersion = '1.0';

  /**
   * Main entry point: Computes all 20 standardized financial metrics deterministically.
   */
  calculateAllMetrics(params: FinancialMetricInputParams): Map<MetricKey, FinancialMetric> {
    const metricsMap = new Map<MetricKey, FinancialMetric>();

    const push = (m: FinancialMetric) => metricsMap.set(m.metricKey, m);

    push(this.calculateCashBalance(params));
    push(this.calculateGrossBurn(params));
    push(this.calculateNetBurn(params));
    push(this.calculateRunway(params));
    push(this.calculateMrr(params));
    push(this.calculateArr(params));
    push(this.calculateRevenueGrowth(params));
    push(this.calculateWorkingCapital(params));
    push(this.calculateCurrentRatio(params));
    push(this.calculateQuickRatio(params));
    push(this.calculateCashRatio(params));
    push(this.calculateDso(params));
    push(this.calculateDpo(params));
    push(this.calculateInventoryDays(params));
    push(this.calculateCashConversionCycle(params));
    push(this.calculateGrossMargin(params));
    push(this.calculateContributionMargin(params));
    push(this.calculateEbitda(params));
    push(this.calculateOperatingCashFlow(params));
    push(this.calculateFreeCashFlow(params));

    return metricsMap;
  }

  // 1. Cash Balance
  calculateCashBalance(p: FinancialMetricInputParams): FinancialMetric {
    const val = Number(p.cashInBank.toFixed(2));
    return {
      metricKey: 'CASH_BALANCE',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}`,
      formula: 'Sum of all active bank balances and cash reserves',
      inputs: { cashInBank: p.cashInBank },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 2. Gross Burn
  calculateGrossBurn(p: FinancialMetricInputParams): FinancialMetric {
    const val = Number(p.monthlyExpenses.toFixed(2));
    return {
      metricKey: 'GROSS_BURN',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}/mo`,
      formula: 'Total Monthly Operating Expenses',
      inputs: { monthlyExpenses: p.monthlyExpenses },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 3. Net Burn
  calculateNetBurn(p: FinancialMetricInputParams): FinancialMetric {
    const val = CanonicalFinancialEngine.calculateNetBurn({
      inflows30D: p.monthlyRevenue,
      outflows30D: p.monthlyExpenses,
    });
    return {
      metricKey: 'NET_BURN',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}/mo`,
      formula: 'CanonicalFinancialEngine.calculateNetBurn(outflows - inflows)',
      inputs: { monthlyExpenses: p.monthlyExpenses, monthlyRevenue: p.monthlyRevenue },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: CanonicalFinancialEngine.KERNEL_VERSION,
    };
  }

  // 4. Runway (Months)
  calculateRunway(p: FinancialMetricInputParams): FinancialMetric {
    const netBurn = CanonicalFinancialEngine.calculateNetBurn({
      inflows30D: p.monthlyRevenue,
      outflows30D: p.monthlyExpenses,
    });
    const runwayRes = CanonicalFinancialEngine.calculateRunway(p.cashInBank, netBurn);
    const runwayMonths = runwayRes.runwayMonths;

    return {
      metricKey: 'RUNWAY_MONTHS',
      organizationId: p.organizationId,
      value: runwayMonths,
      formattedValue: runwayMonths >= 999 ? 'Sustainable (>99 mos)' : `${runwayMonths} mos`,
      formula: 'CanonicalFinancialEngine.calculateRunway(cashInBank / netBurn)',
      inputs: { cashInBank: p.cashInBank, netBurn },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: CanonicalFinancialEngine.KERNEL_VERSION,
    };
  }

  // 5. MRR
  calculateMrr(p: FinancialMetricInputParams): FinancialMetric {
    const val = Number(p.monthlyRevenue.toFixed(2));
    return {
      metricKey: 'MRR',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}`,
      formula: 'Monthly Recurring Revenue',
      inputs: { monthlyRevenue: p.monthlyRevenue },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 6. ARR
  calculateArr(p: FinancialMetricInputParams): FinancialMetric {
    const val = Number((p.monthlyRevenue * 12).toFixed(2));
    return {
      metricKey: 'ARR',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}`,
      formula: 'MRR * 12',
      inputs: { monthlyRevenue: p.monthlyRevenue },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 7. Revenue Growth %
  calculateRevenueGrowth(p: FinancialMetricInputParams): FinancialMetric {
    const prev = p.previousMonthlyRevenue || p.monthlyRevenue;
    let growthPercent = 0;
    if (prev > 0) {
      growthPercent = Number((((p.monthlyRevenue - prev) / prev) * 100).toFixed(2));
    }
    return {
      metricKey: 'REVENUE_GROWTH_PERCENT',
      organizationId: p.organizationId,
      value: growthPercent,
      formattedValue: `${growthPercent >= 0 ? '+' : ''}${growthPercent}%`,
      formula: '((Current Revenue - Previous Revenue) / Previous Revenue) * 100',
      inputs: { monthlyRevenue: p.monthlyRevenue, previousMonthlyRevenue: prev },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 8. Working Capital
  calculateWorkingCapital(p: FinancialMetricInputParams): FinancialMetric {
    const ca = p.currentAssets ?? (p.cashInBank + (p.accountsReceivable || 0));
    const cl = p.currentLiabilities ?? (p.accountsPayable || 0);
    const val = Number((ca - cl).toFixed(2));
    return {
      metricKey: 'WORKING_CAPITAL',
      organizationId: p.organizationId,
      value: val,
      formattedValue: `₹${val.toLocaleString('en-IN')}`,
      formula: 'Current Assets - Current Liabilities',
      inputs: { currentAssets: ca, currentLiabilities: cl },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 9. Current Ratio
  calculateCurrentRatio(p: FinancialMetricInputParams): FinancialMetric {
    const ca = p.currentAssets ?? (p.cashInBank + (p.accountsReceivable || 0));
    const cl = p.currentLiabilities ?? (p.accountsPayable || 1);
    const ratio = cl > 0 ? Number((ca / cl).toFixed(2)) : 99;
    return {
      metricKey: 'CURRENT_RATIO',
      organizationId: p.organizationId,
      value: ratio,
      formattedValue: `${ratio}x`,
      formula: 'Current Assets / Current Liabilities',
      inputs: { currentAssets: ca, currentLiabilities: cl },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 10. Quick Ratio
  calculateQuickRatio(p: FinancialMetricInputParams): FinancialMetric {
    const quickAssets = (p.cashInBank + (p.accountsReceivable || 0));
    const cl = p.currentLiabilities ?? (p.accountsPayable || 1);
    const ratio = cl > 0 ? Number((quickAssets / cl).toFixed(2)) : 99;
    return {
      metricKey: 'QUICK_RATIO',
      organizationId: p.organizationId,
      value: ratio,
      formattedValue: `${ratio}x`,
      formula: '(Cash + Accounts Receivable) / Current Liabilities',
      inputs: { quickAssets, currentLiabilities: cl },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 11. Cash Ratio
  calculateCashRatio(p: FinancialMetricInputParams): FinancialMetric {
    const cl = p.currentLiabilities ?? (p.accountsPayable || 1);
    const ratio = cl > 0 ? Number((p.cashInBank / cl).toFixed(2)) : 99;
    return {
      metricKey: 'CASH_RATIO',
      organizationId: p.organizationId,
      value: ratio,
      formattedValue: `${ratio}x`,
      formula: 'Cash Balance / Current Liabilities',
      inputs: { cashInBank: p.cashInBank, currentLiabilities: cl },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 12. DSO (Days Sales Outstanding)
  calculateDso(p: FinancialMetricInputParams): FinancialMetric {
    const ar = p.accountsReceivable || 0;
    const dailyRev = p.monthlyRevenue > 0 ? p.monthlyRevenue / 30 : 1;
    const dso = Number((ar / dailyRev).toFixed(1));
    return {
      metricKey: 'DSO',
      organizationId: p.organizationId,
      value: dso,
      formattedValue: `${dso} days`,
      formula: '(Accounts Receivable / Monthly Revenue) * 30',
      inputs: { accountsReceivable: ar, monthlyRevenue: p.monthlyRevenue },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 13. DPO (Days Payables Outstanding)
  calculateDpo(p: FinancialMetricInputParams): FinancialMetric {
    const ap = p.accountsPayable || 0;
    const dailyCogs = (p.cogs || p.monthlyExpenses) > 0 ? (p.cogs || p.monthlyExpenses) / 30 : 1;
    const dpo = Number((ap / dailyCogs).toFixed(1));
    return {
      metricKey: 'DPO',
      organizationId: p.organizationId,
      value: dpo,
      formattedValue: `${dpo} days`,
      formula: '(Accounts Payable / Daily COGS) * 30',
      inputs: { accountsPayable: ap, dailyCogs },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 14. Inventory Days
  calculateInventoryDays(p: FinancialMetricInputParams): FinancialMetric {
    const inv = p.inventoryValue || 0;
    const dailyCogs = (p.cogs || p.monthlyExpenses) > 0 ? (p.cogs || p.monthlyExpenses) / 30 : 1;
    const invDays = Number((inv / dailyCogs).toFixed(1));
    return {
      metricKey: 'INVENTORY_DAYS',
      organizationId: p.organizationId,
      value: invDays,
      formattedValue: `${invDays} days`,
      formula: '(Inventory Value / Daily COGS) * 30',
      inputs: { inventoryValue: inv, dailyCogs },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 15. Cash Conversion Cycle (CCC = DSO + Inventory Days - DPO)
  calculateCashConversionCycle(p: FinancialMetricInputParams): FinancialMetric {
    const dso = this.calculateDso(p).value;
    const invDays = this.calculateInventoryDays(p).value;
    const dpo = this.calculateDpo(p).value;
    const ccc = Number((dso + invDays - dpo).toFixed(1));
    return {
      metricKey: 'CASH_CONVERSION_CYCLE',
      organizationId: p.organizationId,
      value: ccc,
      formattedValue: `${ccc} days`,
      formula: 'DSO + Inventory Days - DPO',
      inputs: { dso, invDays, dpo },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 16. Gross Margin %
  calculateGrossMargin(p: FinancialMetricInputParams): FinancialMetric {
    const rev = p.monthlyRevenue;
    const cogs = p.cogs || (rev * 0.3); // fallback 30% cogs
    const margin = rev > 0 ? Number((((rev - cogs) / rev) * 100).toFixed(1)) : 0;
    return {
      metricKey: 'GROSS_MARGIN_PERCENT',
      organizationId: p.organizationId,
      value: margin,
      formattedValue: `${margin}%`,
      formula: '((Revenue - COGS) / Revenue) * 100',
      inputs: { monthlyRevenue: rev, cogs },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 17. Contribution Margin %
  calculateContributionMargin(p: FinancialMetricInputParams): FinancialMetric {
    const rev = p.monthlyRevenue;
    const varCosts = p.variableCosts || (rev * 0.4);
    const margin = rev > 0 ? Number((((rev - varCosts) / rev) * 100).toFixed(1)) : 0;
    return {
      metricKey: 'CONTRIBUTION_MARGIN_PERCENT',
      organizationId: p.organizationId,
      value: margin,
      formattedValue: `${margin}%`,
      formula: '((Revenue - Variable Costs) / Revenue) * 100',
      inputs: { monthlyRevenue: rev, variableCosts: varCosts },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 18. EBITDA
  calculateEbitda(p: FinancialMetricInputParams): FinancialMetric {
    const opProfit = p.monthlyRevenue - p.monthlyExpenses;
    const da = p.depreciationAmortization || 0;
    const ebitda = Number((opProfit + da).toFixed(2));
    return {
      metricKey: 'EBITDA',
      organizationId: p.organizationId,
      value: ebitda,
      formattedValue: `₹${ebitda.toLocaleString('en-IN')}`,
      formula: 'Operating Profit + Depreciation & Amortization',
      inputs: { opProfit, depreciationAmortization: da },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 19. Operating Cash Flow
  calculateOperatingCashFlow(p: FinancialMetricInputParams): FinancialMetric {
    const netInc = p.monthlyRevenue - p.monthlyExpenses;
    const da = p.depreciationAmortization || 0;
    const ocf = Number((netInc + da).toFixed(2));
    return {
      metricKey: 'OPERATING_CASH_FLOW',
      organizationId: p.organizationId,
      value: ocf,
      formattedValue: `₹${ocf.toLocaleString('en-IN')}`,
      formula: 'Net Income + Non-Cash Expenses (Depreciation/Amortization)',
      inputs: { netInc, da },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }

  // 20. Free Cash Flow
  calculateFreeCashFlow(p: FinancialMetricInputParams): FinancialMetric {
    const ocf = this.calculateOperatingCashFlow(p).value;
    const capex = p.capitalExpenditure || 0;
    const fcf = Number((ocf - capex).toFixed(2));
    return {
      metricKey: 'FREE_CASH_FLOW',
      organizationId: p.organizationId,
      value: fcf,
      formattedValue: `₹${fcf.toLocaleString('en-IN')}`,
      formula: 'Operating Cash Flow - Capital Expenditure (CapEx)',
      inputs: { ocf, capex },
      confidence: 1.0,
      timestamp: new Date(),
      calculationVersion: this.calculationVersion,
    };
  }
}
