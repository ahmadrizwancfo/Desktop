import Decimal from 'decimal.js';

// Configure Decimal.js for high financial precision (30 digits precision, HALF_EVEN rounding)
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_EVEN });

export class FinancialMath {
    /**
     * Safely converts any input into a Decimal instance.
     */
    static toDecimal(val: any): Decimal {
        if (val === null || val === undefined || val === '') {
            return new Decimal(0);
        }
        return new Decimal(val);
    }

    /**
     * Sums an array of financial values with exact decimal precision.
     * Returns string representation to prevent floating-point precision loss.
     */
    static sum(values: any[]): string {
        const total = values.reduce<Decimal>((acc, val) => {
            return acc.plus(FinancialMath.toDecimal(val));
        }, new Decimal(0));
        return total.toFixed(2);
    }

    /**
     * Calculates Net Burn: max(Expenses - Revenue, 0)
     * Returns string representation.
     */
    static netBurn(expenses: any, revenue: any): string {
        const exp = FinancialMath.toDecimal(expenses);
        const rev = FinancialMath.toDecimal(revenue);
        const diff = exp.minus(rev);
        return diff.isPositive() ? diff.toFixed(2) : '0.00';
    }

    /**
     * Calculates Real Runway Months: max(0, Spendable Cash / Net Burn)
     * Returns string representation.
     */
    static runwayMonths(cash: any, netBurn: any): string {
        const c = FinancialMath.toDecimal(cash);
        const b = FinancialMath.toDecimal(netBurn);
        if (b.isZero() || b.isNegative()) {
            return '999.00'; // Infinite / Sustainable
        }
        const runway = c.dividedBy(b);
        return runway.isNegative() ? '0.00' : runway.toFixed(2);
    }

    /**
     * Safely formats a Decimal value to a fixed 2-decimal string.
     */
    static toString(val: any): string {
        return FinancialMath.toDecimal(val).toFixed(2);
    }

    /**
     * Formats number to Indian numbering system (e.g. 4,00,000).
     */
    static formatINR(val: any): string {
        const num = Math.round(Number(val) || 0);
        return num.toLocaleString('en-IN');
    }
}
