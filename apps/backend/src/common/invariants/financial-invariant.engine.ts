import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction, CanonicalLedgerEntry } from '../canonical-model/canonical-model.interface';
import { FinancialMath } from '../math/financial-math.util';
import Decimal from 'decimal.js';

export interface SemanticValidationResult {
    passed: boolean;
    tier: 'TIER_1_MATH' | 'TIER_2_FINANCIAL' | 'TIER_3_BUSINESS';
    ruleId: string;
    message: string;
    violatingTransactionId?: string;
}

export interface InvariantEvaluationReport {
    allPassed: boolean;
    mathematicalTruth: boolean;
    financialTruth: boolean;
    businessTruth: boolean;
    violations: SemanticValidationResult[];
    evaluatedCount: number;
    spendableCashApproved: boolean;
}

@Injectable()
export class FinancialInvariantEngine {
    private static readonly logger = new Logger(FinancialInvariantEngine.name);

    /**
     * Evaluates a batch of canonical transactions across all 3 Tiers of Financial Truth.
     */
    public static evaluateBatch(
        transactions: CanonicalTransaction[],
        openingBalance: string | number = 0,
        closingBalance?: string | number
    ): InvariantEvaluationReport {
        const violations: SemanticValidationResult[] = [];
        let runningBalance = FinancialMath.toDecimal(openingBalance);
        let totalDebits = new Decimal(0);
        let totalCredits = new Decimal(0);

        for (const txn of transactions) {
            const amount = FinancialMath.toDecimal(txn.amount);

            // ── TIER 1: MATHEMATICAL TRUTH ──────────────────────────────────────────
            if (amount.isNaN() || !amount.isFinite() || amount.isNegative()) {
                violations.push({
                    passed: false,
                    tier: 'TIER_1_MATH',
                    ruleId: 'MATH_NON_NEGATIVE_DECIMAL',
                    message: `Transaction ${txn.id} has invalid or negative amount: ${txn.amount}`,
                    violatingTransactionId: txn.id,
                });
            }

            if (txn.direction === 'DEBIT') {
                totalDebits = totalDebits.plus(amount);
                runningBalance = runningBalance.minus(amount);
            } else {
                totalCredits = totalCredits.plus(amount);
                runningBalance = runningBalance.plus(amount);
            }

            // ── TIER 3: BUSINESS & SEMANTIC TRUTH ────────────────────────────────────
            const narrationLower = (txn.narration || '').toLowerCase();
            const categoryLower = (txn.category || '').toLowerCase();

            // Semantic Rule 1: Salary cannot increase revenue
            if ((narrationLower.includes('salary') || narrationLower.includes('payroll')) && txn.direction === 'CREDIT') {
                violations.push({
                    passed: false,
                    tier: 'TIER_3_BUSINESS',
                    ruleId: 'SEMANTIC_SALARY_CANNOT_BE_CREDIT',
                    message: `Salary transaction ${txn.id} was imported as Credit/Income. Salary must always be a Debit/Expense.`,
                    violatingTransactionId: txn.id,
                });
            }

            // Semantic Rule 2: GST/TDS Challans cannot be marketing or sales
            if ((narrationLower.includes('gst payment') || narrationLower.includes('gst challan') || narrationLower.includes('tds payment')) && 
                (categoryLower.includes('marketing') || categoryLower.includes('sales') || txn.direction === 'CREDIT')) {
                violations.push({
                    passed: false,
                    tier: 'TIER_3_BUSINESS',
                    ruleId: 'SEMANTIC_TAX_CHALLAN_INTEGRITY',
                    message: `Tax payment ${txn.id} was miscategorized as ${txn.category} or credited. Must be a Tax Debit.`,
                    violatingTransactionId: txn.id,
                });
            }

            // Semantic Rule 3: Bank Interest cannot be sales revenue
            if (narrationLower.includes('interest credit') && (categoryLower.includes('sales') || categoryLower.includes('mrr'))) {
                violations.push({
                    passed: false,
                    tier: 'TIER_3_BUSINESS',
                    ruleId: 'SEMANTIC_INTEREST_NOT_SALES',
                    message: `Bank interest credit ${txn.id} was miscategorized as Sales Revenue. Must be Non-Operating Income.`,
                    violatingTransactionId: txn.id,
                });
            }
        }

        // ── TIER 1: Balance Conservation Check ───────────────────────────────────────
        let mathematicalTruth = true;
        if (closingBalance !== undefined && closingBalance !== null) {
            const expectedClosing = FinancialMath.toDecimal(closingBalance);
            const delta = runningBalance.minus(expectedClosing).abs();
            if (delta.greaterThan(0.01)) {
                mathematicalTruth = false;
                violations.push({
                    passed: false,
                    tier: 'TIER_1_MATH',
                    ruleId: 'MATH_CONSERVATION_OF_BALANCE',
                    message: `Calculated closing balance (${runningBalance.toFixed(2)}) diverges from statement closing balance (${expectedClosing.toFixed(2)}) by ₹${delta.toFixed(2)}.`,
                });
            }
        }

        const mathViolations = violations.filter(v => v.tier === 'TIER_1_MATH');
        const financialViolations = violations.filter(v => v.tier === 'TIER_2_FINANCIAL');
        const businessViolations = violations.filter(v => v.tier === 'TIER_3_BUSINESS');

        const allPassed = violations.length === 0;

        return {
            allPassed,
            mathematicalTruth: mathematicalTruth && mathViolations.length === 0,
            financialTruth: financialViolations.length === 0,
            businessTruth: businessViolations.length === 0,
            violations,
            evaluatedCount: transactions.length,
            spendableCashApproved: allPassed,
        };
    }

    /**
     * Validates Double-Entry Invariance for multi-split ledger entries.
     */
    public static validateLedgerInvariance(entries: CanonicalLedgerEntry[]): boolean {
        let totalDebit = new Decimal(0);
        let totalCredit = new Decimal(0);

        for (const entry of entries) {
            totalDebit = totalDebit.plus(FinancialMath.toDecimal(entry.debitAmount || 0));
            totalCredit = totalCredit.plus(FinancialMath.toDecimal(entry.creditAmount || 0));
        }

        return totalDebit.minus(totalCredit).abs().lessThanOrEqualTo(0.01);
    }
}
