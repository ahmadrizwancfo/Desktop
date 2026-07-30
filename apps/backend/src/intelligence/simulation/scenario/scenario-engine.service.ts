import { Injectable, Logger } from '@nestjs/common';
import { SimulationDecisionInput } from '../domain/simulation.types';

export interface EvaluatedScenarioParams {
  decision: SimulationDecisionInput;
  assumptions: string[];
  affectedSystems: string[];
  deltaInputs: {
    monthlyExpensesDelta?: number;
    monthlyRevenueDelta?: number;
    cashInBankDelta?: number;
    dsoDeltaDays?: number;
    dpoDeltaDays?: number;
  };
}

@Injectable()
export class ScenarioEngineService {
  private readonly logger = new Logger(ScenarioEngineService.name);

  /**
   * Translates a business decision input into deterministic metric deltas & assumptions.
   */
  createScenario(input: SimulationDecisionInput): EvaluatedScenarioParams {
    const assumptions: string[] = [];
    const affectedSystems: string[] = [];
    const deltaInputs: EvaluatedScenarioParams['deltaInputs'] = {};

    const avgSalaryPerHead = input.params?.avgSalaryPerHead || 150000; // Default ₹1.5L/mo per headcount

    switch (input.type) {
      case 'HIRING': {
        const headcount = Math.max(1, input.value);
        const monthlyCost = headcount * avgSalaryPerHead;
        deltaInputs.monthlyExpensesDelta = monthlyCost;
        affectedSystems.push('SYS_HIRING', 'SYS_EXPENSE', 'SYS_CASH', 'SYS_FUNDING');
        assumptions.push(`Adding ${headcount} new headcount at average monthly cost of ₹${avgSalaryPerHead.toLocaleString('en-IN')}/head.`);
        assumptions.push('Fixed monthly operating burn increases immediately without lag.');
        break;
      }
      case 'SALARY_CHANGE': {
        const percent = input.value; // e.g. +10% or -5%
        deltaInputs.monthlyExpensesDelta = percent; // Evaluated dynamically against base payroll
        affectedSystems.push('SYS_HIRING', 'SYS_EXPENSE', 'SYS_CASH');
        assumptions.push(`Adjusting payroll expenditure by ${percent > 0 ? '+' : ''}${percent}%.`);
        break;
      }
      case 'EXPENSE_REDUCTION': {
        const cutVal = Math.abs(input.value);
        deltaInputs.monthlyExpensesDelta = -cutVal;
        affectedSystems.push('SYS_EXPENSE', 'SYS_CASH');
        assumptions.push(`Reducing monthly operating expenditures by ₹${cutVal.toLocaleString('en-IN')}.`);
        assumptions.push('Assumes zero disruption to core revenue generation capacity.');
        break;
      }
      case 'MARKETING_SPEND': {
        const delta = input.value;
        deltaInputs.monthlyExpensesDelta = delta;
        affectedSystems.push('SYS_EXPENSE', 'SYS_GROWTH', 'SYS_CASH');
        assumptions.push(`Adjusting monthly marketing ad spend by ${delta > 0 ? '+' : ''}₹${Math.abs(delta).toLocaleString('en-IN')}.`);
        break;
      }
      case 'PRICING': {
        const pricePercent = input.value; // e.g. +15%
        deltaInputs.monthlyRevenueDelta = pricePercent;
        affectedSystems.push('SYS_REVENUE', 'SYS_CUSTOMER_ECONOMICS', 'SYS_CASH');
        assumptions.push(`Adjusting product/service pricing by ${pricePercent > 0 ? '+' : ''}${pricePercent}%.`);
        assumptions.push('Assumes zero net customer churn from price adjustment.');
        break;
      }
      case 'COLLECTIONS_IMPROVEMENT': {
        const daysReduced = Math.abs(input.value); // e.g. 14 days reduction in DSO
        deltaInputs.dsoDeltaDays = -daysReduced;
        affectedSystems.push('SYS_WORKING_CAPITAL', 'SYS_CUSTOMER_ECONOMICS', 'SYS_CASH');
        assumptions.push(`Reducing Days Sales Outstanding (DSO) by ${daysReduced} days via aggressive invoice collection.`);
        assumptions.push('Accelerates cash inflow without increasing top-line revenue.');
        break;
      }
      case 'VENDOR_PAYMENT_TERMS': {
        const daysExtended = Math.abs(input.value); // e.g. +15 days extension in DPO
        deltaInputs.dpoDeltaDays = daysExtended;
        affectedSystems.push('SYS_WORKING_CAPITAL', 'SYS_VENDOR_ECONOMICS', 'SYS_CASH');
        assumptions.push(`Extending Days Payable Outstanding (DPO) credit terms by ${daysExtended} days with key suppliers.`);
        break;
      }
      case 'DEBT': {
        const loanAmount = Math.abs(input.value);
        deltaInputs.cashInBankDelta = loanAmount;
        affectedSystems.push('SYS_FUNDING', 'SYS_CASH');
        assumptions.push(`Securing venture debt loan facility of ₹${loanAmount.toLocaleString('en-IN')}.`);
        assumptions.push('Immediately boosts spendable cash balance; repayment debt obligations apply.');
        break;
      }
      case 'EQUITY_FUNDING': {
        const fundingAmount = Math.abs(input.value);
        deltaInputs.cashInBankDelta = fundingAmount;
        affectedSystems.push('SYS_FUNDING', 'SYS_CASH', 'SYS_GROWTH');
        assumptions.push(`Closing equity funding round of ₹${fundingAmount.toLocaleString('en-IN')}.`);
        assumptions.push('Provides non-repayable cash buffer to extend runway horizon.');
        break;
      }
    }

    this.logger.log(`Created Simulation Scenario [${input.type}] affecting ${affectedSystems.length} systems.`);
    return {
      decision: input,
      assumptions,
      affectedSystems,
      deltaInputs,
    };
  }
}
