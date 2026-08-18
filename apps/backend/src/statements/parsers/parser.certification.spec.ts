import * as fs from 'fs';
import * as path from 'path';
import { HeaderDetectionScanner } from './header-detection.scanner';
import { FinancialInvariantEngine } from '../../common/invariants/financial-invariant.engine';
import { CanonicalTransaction } from '../../common/canonical-model/canonical-model.interface';

describe('FOUNDERCFO CERTIFICATION GATE (FCF v1.1)', () => {
    describe('WORKSTREAM A & G: Indian Banking Golden Datasets', () => {
        it('CERT-01: Should scan and skip 18 leading disclaimer rows in SBI CSV Golden Fixture', () => {
            const sbiFixturePath = path.resolve(__dirname, '../../../datasets/banks/sbi_disclaimer_header.csv');
            expect(fs.existsSync(sbiFixturePath)).toBe(true);

            const rawCsv = fs.readFileSync(sbiFixturePath, 'utf-8');
            const scanResult = HeaderDetectionScanner.scanAndSanitize(rawCsv);

            expect(scanResult.found).toBe(true);
            expect(scanResult.skippedRows).toBeGreaterThanOrEqual(15);
            expect(scanResult.detectedColumns.dateCol).toBe('Txn Date');
            expect(scanResult.detectedColumns.debitCol).toBe('Debit');
            expect(scanResult.detectedColumns.creditCol).toBe('Credit');
            expect(scanResult.confidenceScore).toBeGreaterThanOrEqual(0.9);
        });

        it('CERT-02: Should validate 3-Tier Financial Invariants on canonical transaction stream', () => {
            const sampleTxns: CanonicalTransaction[] = [
                {
                    id: 'txn_01',
                    source: 'BANK_FEED',
                    organizationId: 'org_test_01',
                    date: new Date('2026-04-03'),
                    amount: '185000',
                    direction: 'CREDIT',
                    category: 'SaaS Revenue',
                    narration: 'UPI/6102938471/RAZORPAY SOFTWARE/SAAS',
                } as any,
                {
                    id: 'txn_02',
                    source: 'BANK_FEED',
                    organizationId: 'org_test_01',
                    date: new Date('2026-04-07'),
                    amount: '720000',
                    direction: 'DEBIT',
                    category: 'Salary & Payroll',
                    narration: 'SALARY APRIL 2026 BATCH 1',
                } as any,
                {
                    id: 'txn_03',
                    source: 'BANK_FEED',
                    organizationId: 'org_test_01',
                    date: new Date('2026-04-12'),
                    amount: '120000',
                    direction: 'DEBIT',
                    category: 'GST Paid',
                    narration: 'GST PAYMENT MAR 2026 CHALLAN 0021',
                } as any,
            ];

            const openingBalance = 5500000;
            // 55,00,000 + 1,85,000 - 7,20,000 - 1,20,000 = 48,45,000
            const expectedClosingBalance = 4845000;

            const report = FinancialInvariantEngine.evaluateBatch(
                sampleTxns,
                openingBalance,
                expectedClosingBalance
            );

            expect(report.allPassed).toBe(true);
            expect(report.mathematicalTruth).toBe(true);
            expect(report.financialTruth).toBe(true);
            expect(report.businessTruth).toBe(true);
            expect(report.violations.length).toBe(0);
            expect(report.spendableCashApproved).toBe(true);
        });

        it('CERT-03: Should flag semantic violation if Salary is categorized as Credit/Revenue', () => {
            const corruptSalaryTxn: CanonicalTransaction[] = [
                {
                    id: 'txn_corrupt_01',
                    source: 'BANK_FEED',
                    organizationId: 'org_test_01',
                    date: new Date('2026-04-07'),
                    amount: '500000',
                    direction: 'CREDIT', // Financially impossible: Salary as Credit
                    category: 'Revenue',
                    narration: 'SALARY APRIL 2026 FROM ACC',
                } as any,
            ];

            const report = FinancialInvariantEngine.evaluateBatch(corruptSalaryTxn, 1000000);

            expect(report.allPassed).toBe(false);
            expect(report.businessTruth).toBe(false);
            expect(report.spendableCashApproved).toBe(false);
            expect(report.violations.some(v => v.ruleId === 'SEMANTIC_SALARY_CANNOT_BE_CREDIT')).toBe(true);
        });
    });
});
