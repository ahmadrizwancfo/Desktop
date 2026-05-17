import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UniversalParserService } from './universal-parser.service';

describe('UniversalParserService', () => {
    let service: UniversalParserService;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'GEMINI_API_KEY') return 'mock-key';
            return null;
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UniversalParserService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<UniversalParserService>(UniversalParserService);
    });

    describe('normalizeDate', () => {
        it('should correctly normalize numeric Indian dates', () => {
            expect(service['normalizeDate']('12/04/2026')).toBe('2026-04-12');
            expect(service['normalizeDate']('15-12-25')).toBe('2025-12-15');
        });

        it('should correctly normalize alphanumeric abbreviated Indian dates', () => {
            expect(service['normalizeDate']('12-Apr-2026')).toBe('2026-04-12');
            expect(service['normalizeDate']('23 Aug 2025')).toBe('2025-08-23');
            expect(service['normalizeDate']('15/Dec/25')).toBe('2025-12-15');
            expect(service['normalizeDate']('01-jan-2026')).toBe('2026-01-01');
        });

        it('should return already normalized dates intact', () => {
            expect(service['normalizeDate']('2026-04-12')).toBe('2026-04-12');
        });
    });

    describe('extractFromRawText with Positional Column Classifier', () => {
        it('should align amounts correctly based on horizontal index alignment', () => {
            const rawText = `
Date        Particulars                  Withdrawals(Dr)     Deposits(Cr)      Balance
12-Apr-2026 AWS Cloud Infrastructure       5,000.00                              45,000.00
14-Apr-2026 Razorpay Settlement Payout                       10,000.00         55,000.00
            `;

            const issues: any[] = [];
            const result = service['extractFromRawText'](rawText, issues);

            expect(result.length).toBe(2);
            
            // First transaction (Debit)
            expect(result[0].date).toBe('2026-04-12');
            expect(result[0].debit).toBe(5000.00);
            expect(result[0].credit).toBeNull();
            expect(result[0].balance).toBe(45000.00);

            // Second transaction (Credit)
            expect(result[1].date).toBe('2026-04-14');
            expect(result[1].debit).toBeNull();
            expect(result[1].credit).toBe(10000.00);
            expect(result[1].balance).toBe(55000.00);
        });

        it('should fallback to sequential heuristic if no clear columns are found', () => {
            const rawText = `
12/04/2026 AWS Charge 5,000.00
14/04/2026 Refund payout 2,500.00
            `;
            const issues: any[] = [];
            const result = service['extractFromRawText'](rawText, issues);

            expect(result.length).toBe(2);
            // First transaction (Heuristic Debit due to "Charge")
            expect(result[0].debit).toBe(5000.00);
            expect(result[0].credit).toBeNull();

            // Second transaction (Heuristic Credit due to "Refund")
            expect(result[1].debit).toBeNull();
            expect(result[1].credit).toBe(2500.00);
        });
    });

    describe('calculateQualityScore', () => {
        it('should grant a +10 bonus when ledger reconciles completely with 0 deviation', () => {
            const doc: any = { rawText: 'Sample text longer than 200 characters to prevent penalties. '.repeat(10) };
            const txns: any[] = Array.from({ length: 5 }, () => ({}));
            const issues: any[] = [];
            
            const score = service['calculateQualityScore'](doc, txns, issues, true, true);
            // Max score is capped at 100, but let's see if it's 100
            expect(score).toBe(100);
        });

        it('should penalize ledger mismatches strictly with -30 points', () => {
            const doc: any = { rawText: 'Sample text longer than 200 characters to prevent penalties. '.repeat(10) };
            const txns: any[] = Array.from({ length: 5 }, () => ({}));
            const issues: any[] = [];
            
            const score = service['calculateQualityScore'](doc, txns, issues, false, false);
            // 100 - 30 (balanceVerified false) - 30 (debitCreditMatch false) = 40
            expect(score).toBe(40);
        });
    });
});
