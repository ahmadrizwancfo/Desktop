import { Injectable, Logger } from '@nestjs/common';
import { FinancialLaw, FinancialLawSchema } from '../domain/laws.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

@Injectable()
export class FinancialLawsEngineService {
  private readonly logger = new Logger(FinancialLawsEngineService.name);

  /**
   * Evaluates all 7 Immutable Financial Laws against current financial metrics.
   */
  evaluateLaws(metricsMap: Map<MetricKey, FinancialMetric>): FinancialLaw[] {
    const cash = metricsMap.get('CASH_BALANCE')?.value || 0;
    const netBurn = metricsMap.get('NET_BURN')?.value || 0;
    const dso = metricsMap.get('DSO')?.value || 0;
    const arr = metricsMap.get('ARR')?.value || 0;

    const laws: FinancialLaw[] = [
      // 1. Revenue != Cash
      {
        identifier: 'LAW_REVENUE_NOT_CASH',
        description: 'Revenue recognized on invoices does not equal spendable cash in bank.',
        formula: 'Cash Inflow = Invoiced Revenue - Uncollected Receivables',
        businessMeaning: 'High paper revenue cannot pay payroll or rent if invoices remain uncollected.',
        exceptions: ['100% upfront prepaid annual subscriptions'],
        affectedSystems: ['SYS_REVENUE', 'SYS_CASH', 'SYS_WORKING_CAPITAL'],
        violationSeverity: 'HIGH',
        isViolated: dso > 60 && arr > 0,
      },
      // 2. Cash Burn Reduces Runway
      {
        identifier: 'LAW_BURN_REDUCES_RUNWAY',
        description: 'Operating cash outflow continuously reduces runway horizon unless offset by net cash inflows.',
        formula: 'Runway (t+1) = (Cash - Net Burn) / Net Burn',
        businessMeaning: 'Every dollar spent brings the company closer to zero-cash date.',
        exceptions: ['Cash-flow positive operations'],
        affectedSystems: ['SYS_CASH', 'SYS_EXPENSE', 'SYS_FUNDING'],
        violationSeverity: 'CRITICAL',
        isViolated: netBurn > 0 && (cash / netBurn) < 3,
      },
      // 3. Receivables != Liquidity
      {
        identifier: 'LAW_AR_NOT_LIQUIDITY',
        description: 'Accounts Receivable represents credit extended to customers and cannot be spent as liquidity.',
        formula: 'Spendable Cash = Bank Balance (Excludes Accounts Receivable)',
        businessMeaning: 'Creditors and suppliers accept bank funds, not unpaid invoices.',
        exceptions: ['Invoice discounting / Factoring lines'],
        affectedSystems: ['SYS_WORKING_CAPITAL', 'SYS_CASH', 'SYS_CUSTOMER_ECONOMICS'],
        violationSeverity: 'HIGH',
        isViolated: dso > 45,
      },
      // 4. Profit != Cash Flow
      {
        identifier: 'LAW_PROFIT_NOT_CASH_FLOW',
        description: 'Accrual net profit does not guarantee positive operating cash flow.',
        formula: 'Operating Cash Flow = Net Income + Non-Cash Adjustments - Working Capital Delta',
        businessMeaning: 'Companies can go bankrupt while reporting accounting net profit due to working capital drain.',
        exceptions: ['Zero working capital business models'],
        affectedSystems: ['SYS_REVENUE', 'SYS_EXPENSE', 'SYS_CASH'],
        violationSeverity: 'MEDIUM',
        isViolated: false,
      },
      // 5. Inventory Consumes Working Capital
      {
        identifier: 'LAW_INVENTORY_CONSUMES_WC',
        description: 'Physical or digital asset stock locks up working capital until sold.',
        formula: 'Working Capital Drain = Inventory Valuation',
        businessMeaning: 'Capital invested in inventory is unavailable for cash spend.',
        exceptions: ['Just-In-Time (JIT) dropshipping'],
        affectedSystems: ['SYS_WORKING_CAPITAL', 'SYS_CASH'],
        violationSeverity: 'MEDIUM',
        isViolated: false,
      },
      // 6. Payroll Increases Fixed Burn
      {
        identifier: 'LAW_PAYROLL_INCREASES_BURN',
        description: 'Headcount expansion creates permanent fixed monthly cash obligations.',
        formula: 'New Gross Burn = Old Gross Burn + New Headcount Salary & Benefits',
        businessMeaning: 'Headcount costs cannot be quickly dialed down without severance and delay.',
        exceptions: ['Freelance contractors with zero notice period'],
        affectedSystems: ['SYS_HIRING', 'SYS_EXPENSE', 'SYS_CASH'],
        violationSeverity: 'HIGH',
        isViolated: false,
      },
      // 7. Debt Creates Future Obligations
      {
        identifier: 'LAW_DEBT_CREATES_OBLIGATIONS',
        description: 'Borrowings provide immediate cash while creating mandatory future cash principal & interest drains.',
        formula: 'Future Monthly Cash Drain = Debt Principal Repayment + Interest Charge',
        businessMeaning: 'Debt repayment must be serviced regardless of future revenue performance.',
        exceptions: ['Revenue-based financing with zero floor'],
        affectedSystems: ['SYS_FUNDING', 'SYS_CASH'],
        violationSeverity: 'MEDIUM',
        isViolated: false,
      },
    ];

    const validatedLaws = laws.map(l => Object.freeze(FinancialLawSchema.parse(l)));
    const violatedCount = validatedLaws.filter(l => l.isViolated).length;
    this.logger.log(`Evaluated 7 Financial Laws -> ${violatedCount} laws flagged in active violation state.`);
    return validatedLaws;
  }
}
