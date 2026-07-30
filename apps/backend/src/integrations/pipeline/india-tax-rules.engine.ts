import { Injectable, Logger } from '@nestjs/common';
import { TaxRuleConfig } from './pipeline-types.interface';

@Injectable()
export class IndiaTaxRulesEngine {
  private readonly logger = new Logger(IndiaTaxRulesEngine.name);

  private config: TaxRuleConfig = {
    defaultGstRate: 18,
    defaultTdsRates: {
      '194C': 1.0,  // Payment to Contractors (1% Ind/HUF, 2% Corp)
      '194J': 10.0, // Professional / Technical Services
      '194I': 10.0, // Rent for Land/Building
      '194H': 5.0,  // Commission / Brokerage
      '194Q': 0.1,  // Purchase of Goods > 50L
    },
    enableAutomaticItc: true,
  };

  /**
   * Determine Indian Fiscal Year (April 1 to March 31) & Quarter for any given date.
   */
  getIndianFiscalYear(date: Date): { fiscalYear: string; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; month: number } {
    const d = new Date(date);
    const month = d.getMonth(); // 0 = Jan, 3 = Apr
    const year = d.getFullYear();

    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    const fiscalYear = `FY${startYear}-${endYear.toString().slice(-2)}`;

    let quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
    if (month >= 3 && month <= 5) quarter = 'Q1';       // Apr-Jun
    else if (month >= 6 && month <= 8) quarter = 'Q2';  // Jul-Sep
    else if (month >= 9 && month <= 11) quarter = 'Q3'; // Oct-Dec
    else quarter = 'Q4';                                // Jan-Mar

    return { fiscalYear, quarter, month: month + 1 };
  }

  /**
   * Data-driven GST Tax Decomposition (CGST, SGST, IGST, ITC Eligibility).
   */
  calculateGstBreakdown(params: {
    amount: number;
    supplierGstin?: string;
    buyerGstin?: string;
    overrideTaxRate?: number;
  }): {
    baseAmount: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    gstRatePercent: number;
    isInterstate: boolean;
    isItcEligible: boolean;
  } {
    const { amount, supplierGstin, buyerGstin, overrideTaxRate } = params;
    const gstRatePercent = overrideTaxRate ?? this.config.defaultGstRate;

    // Detect interstate transaction based on state code prefix of GSTIN (e.g., '27' Maharashtra vs '29' Karnataka)
    const isInterstate = !!(
      supplierGstin &&
      buyerGstin &&
      supplierGstin.length >= 2 &&
      buyerGstin.length >= 2 &&
      supplierGstin.slice(0, 2) !== buyerGstin.slice(0, 2)
    );

    const baseAmount = Number((amount / (1 + gstRatePercent / 100)).toFixed(2));
    const gstAmount = Number((amount - baseAmount).toFixed(2));

    if (isInterstate) {
      return {
        baseAmount,
        gstAmount,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: gstAmount,
        gstRatePercent,
        isInterstate: true,
        isItcEligible: this.config.enableAutomaticItc,
      };
    } else {
      const halfTax = Number((gstAmount / 2).toFixed(2));
      return {
        baseAmount,
        gstAmount,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        igstAmount: 0,
        gstRatePercent,
        isInterstate: false,
        isItcEligible: this.config.enableAutomaticItc,
      };
    }
  }

  /**
   * Data-driven TDS Deduction Evaluator (Sections 194C, 194J, 194I, etc.)
   */
  evaluateTdsDeduction(params: {
    category: string;
    description?: string;
    amount: number;
  }): {
    isTdsDeducted: boolean;
    section?: string;
    tdsRatePercent: number;
    tdsAmount: number;
  } {
    const { category, description = '', amount } = params;
    const catUpper = category.toUpperCase();
    const descUpper = description.toUpperCase();

    let section: string | undefined;
    let tdsRatePercent = 0;

    if (catUpper.includes('SALARY') || descUpper.includes('PAYROLL')) {
      section = '192';
      tdsRatePercent = 10.0;
    } else if (catUpper.includes('PROFESSIONAL') || catUpper.includes('LEGAL') || descUpper.includes('CONSULTANT')) {
      section = '194J';
      tdsRatePercent = this.config.defaultTdsRates['194J'] || 10.0;
    } else if (catUpper.includes('CONTRACTOR') || catUpper.includes('MAINTENANCE') || descUpper.includes('VENDOR')) {
      section = '194C';
      tdsRatePercent = this.config.defaultTdsRates['194C'] || 1.0;
    } else if (catUpper.includes('RENT') || descUpper.includes('OFFICE SPACE')) {
      section = '194I';
      tdsRatePercent = this.config.defaultTdsRates['194I'] || 10.0;
    }

    if (section && amount > 30000) { // Standard single payment threshold
      const tdsAmount = Number(((amount * tdsRatePercent) / 100).toFixed(2));
      return { isTdsDeducted: true, section, tdsRatePercent, tdsAmount };
    }

    return { isTdsDeducted: false, tdsRatePercent: 0, tdsAmount: 0 };
  }

  /**
   * Update tax configuration dynamically without code changes.
   */
  updateTaxConfig(newConfig: Partial<TaxRuleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log('IndiaTaxRulesEngine configuration updated dynamically.');
  }
}
