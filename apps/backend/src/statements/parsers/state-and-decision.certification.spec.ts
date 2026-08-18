import { StateCertificationEngine, SurfaceStatePayload } from '../../common/certification/state-certification.engine';
import { FinancialInvariantEngine } from '../../common/invariants/financial-invariant.engine';
import { HeaderDetectionScanner } from './header-detection.scanner';

describe('FOUNDERCFO ZERO-TRUST SPRINT 02 CERTIFICATION GATES', () => {
    describe('WORKSTREAM 1 & 4: State Consistency Certification Gate', () => {
        it('CERT-STATE-01: Should certify state consistency across all 4 executive surfaces', () => {
            const surfaces: SurfaceStatePayload[] = [
                {
                    surfaceName: 'DASHBOARD',
                    cashInBank: 5500000,
                    spendableCash: 4500000,
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 6.3,
                    priorityMandateTitle: 'Extend Runway by 45 Days',
                },
                {
                    surfaceName: 'DAILY_BRIEF',
                    cashInBank: 5500000,
                    spendableCash: 4500000,
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 6.3,
                    priorityMandateTitle: 'Extend Runway by 45 Days',
                },
                {
                    surfaceName: 'DECISION_LAB',
                    cashInBank: 5500000,
                    spendableCash: 4500000,
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 6.3,
                },
                {
                    surfaceName: 'AI_COUNSEL',
                    cashInBank: 5500000,
                    spendableCash: 4500000,
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 6.3,
                },
            ];

            const report = StateCertificationEngine.certifySurfaceConsistency(surfaces);

            expect(report.passed).toBe(true);
            expect(report.surfacesAudited).toBe(4);
            expect(report.divergences.length).toBe(0);
            expect(report.metricsVerified.cashInBankConsistent).toBe(true);
            expect(report.metricsVerified.spendableCashConsistent).toBe(true);
            expect(report.metricsVerified.runwayConsistent).toBe(true);
        });

        it('CERT-STATE-02: Should flag a build-blocking failure if any surface deviates in financial metrics', () => {
            const divergentSurfaces: SurfaceStatePayload[] = [
                {
                    surfaceName: 'DASHBOARD',
                    cashInBank: 5500000,
                    spendableCash: 4500000,
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 6.3,
                },
                {
                    surfaceName: 'AI_COUNSEL',
                    cashInBank: 5500000,
                    spendableCash: 5100000, // Divergent! Failed to deduct GST buffer
                    monthlyNetBurn: 720000,
                    trueRunwayMonths: 7.1,
                },
            ];

            const report = StateCertificationEngine.certifySurfaceConsistency(divergentSurfaces);

            expect(report.passed).toBe(false);
            expect(report.metricsVerified.spendableCashConsistent).toBe(false);
            expect(report.divergences.length).toBeGreaterThanOrEqual(1);
            expect(report.divergences[0].metric).toBe('Spendable Cash');
        });
    });

    describe('WORKSTREAM 7: Chaos Certification Gate', () => {
        it('CERT-CHAOS-01: Should safely pause and return explainable diagnostic on corrupted CSV input', () => {
            const malformedCsv = `
                This is a corrupted scanned text without headers or data.
                Random error row 1
                Random error row 2
            `;

            const scanResult = HeaderDetectionScanner.scanAndSanitize(malformedCsv);
            expect(scanResult.found).toBe(false);
            expect(scanResult.confidenceScore).toBeLessThan(0.5);

            // Invariant evaluation on empty canonical stream
            const report = FinancialInvariantEngine.evaluateBatch([]);
            expect(report.evaluatedCount).toBe(0);
            expect(report.spendableCashApproved).toBe(true); // 0 txns cannot corrupt balance
        });
    });
});
