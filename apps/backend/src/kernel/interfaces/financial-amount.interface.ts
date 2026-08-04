/**
 * FinancialAmount Value Object
 * Standardized immutable monetary amount contract.
 */
export interface FinancialAmount {
  amount: number;
  currency: string;             // e.g. "INR", "USD"
  formatted: string;            // e.g. "₹1,50,000.00"
}

export class FinancialAmountFactory {
  public static create(amount: number, currency: string = 'INR'): FinancialAmount {
    const safeAmount = Math.round((amount || 0) * 100) / 100;
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(safeAmount);

    return {
      amount: safeAmount,
      currency,
      formatted,
    };
  }
}
