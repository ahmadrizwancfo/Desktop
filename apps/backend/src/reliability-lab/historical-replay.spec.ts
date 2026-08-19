import { DecisionValidationService, HistoricalTimeSlice } from '../cfo-engine/decision-validation.service';
import { FounderDiscoveryService } from '../cfo-engine/founder-discovery.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PROJECT HORIZON: HISTORICAL REPLAY VALIDATION & TRUST SCORING SUITE', () => {
    let decisionValidation: DecisionValidationService;
    let founderDiscovery: FounderDiscoveryService;
    let mockPrisma: any;

    beforeAll(() => {
        mockPrisma = {} as PrismaService;
        decisionValidation = new DecisionValidationService(mockPrisma);
        founderDiscovery = new FounderDiscoveryService(mockPrisma);
    });

    const mock12MonthTimeline: HistoricalTimeSlice[] = [
        { monthIndex: 1, date: '2025-05-01', openingCash: 10000000, inflows: 800000, outflows: 1400000, closingCash: 9400000, realizedRunwayMonths: 15.6, realizedBurn: 600000, realizedTaxObligation: 144000 },
        { monthIndex: 2, date: '2025-06-01', openingCash: 9400000, inflows: 850000, outflows: 1450000, closingCash: 8800000, realizedRunwayMonths: 14.6, realizedBurn: 600000, realizedTaxObligation: 153000 },
        { monthIndex: 3, date: '2025-07-01', openingCash: 8800000, inflows: 900000, outflows: 1500000, closingCash: 8200000, realizedRunwayMonths: 13.6, realizedBurn: 600000, realizedTaxObligation: 162000 },
        { monthIndex: 4, date: '2025-08-01', openingCash: 8200000, inflows: 950000, outflows: 1600000, closingCash: 7550000, realizedRunwayMonths: 11.6, realizedBurn: 650000, realizedTaxObligation: 171000 },
        { monthIndex: 5, date: '2025-09-01', openingCash: 7550000, inflows: 1000000, outflows: 1800000, closingCash: 6750000, realizedRunwayMonths: 8.4, realizedBurn: 800000, realizedTaxObligation: 180000 },
        { monthIndex: 6, date: '2025-10-01', openingCash: 6750000, inflows: 1100000, outflows: 2100000, closingCash: 5750000, realizedRunwayMonths: 5.7, realizedBurn: 1000000, realizedTaxObligation: 198000 },
        { monthIndex: 7, date: '2025-11-01', openingCash: 5750000, inflows: 1200000, outflows: 2500000, closingCash: 4450000, realizedRunwayMonths: 3.4, realizedBurn: 1300000, realizedTaxObligation: 216000 },
        { monthIndex: 8, date: '2025-12-01', openingCash: 4450000, inflows: 1300000, outflows: 2800000, closingCash: 2950000, realizedRunwayMonths: 1.9, realizedBurn: 1500000, realizedTaxObligation: 234000 },
        { monthIndex: 9, date: '2026-01-01', openingCash: 2950000, inflows: 1400000, outflows: 2000000, closingCash: 2350000, realizedRunwayMonths: 3.9, realizedBurn: 600000, realizedTaxObligation: 252000 },
        { monthIndex: 10, date: '2026-02-01', openingCash: 2350000, inflows: 1500000, outflows: 2000000, closingCash: 1850000, realizedRunwayMonths: 3.7, realizedBurn: 500000, realizedTaxObligation: 270000 },
        { monthIndex: 11, date: '2026-03-01', openingCash: 1850000, inflows: 1600000, outflows: 2000000, closingCash: 1450000, realizedRunwayMonths: 3.6, realizedBurn: 400000, realizedTaxObligation: 288000 },
        { monthIndex: 12, date: '2026-04-01', openingCash: 1450000, inflows: 1800000, outflows: 2000000, closingCash: 1250000, realizedRunwayMonths: 6.2, realizedBurn: 200000, realizedTaxObligation: 324000 },
    ];

    it('REPLAY-01: Should chronologically replay 12 months with high runway & cash prediction accuracy', () => {
        const report = decisionValidation.executeHistoricalReplayValidation(
            'ORG_HORIZON_TEST',
            mock12MonthTimeline
        );

        expect(report.totalMonthsReplayed).toBe(11);
        expect(report.averageRunwayAccuracyPercent).toBeGreaterThanOrEqual(70.0);
        expect(report.averageCashAccuracyPercent).toBeGreaterThanOrEqual(70.0);
        expect(report.falsePositiveRatePercent).toBeLessThanOrEqual(10.0);
        expect(report.falseNegativeRatePercent).toBeLessThanOrEqual(10.0);
        expect(report.confidenceCalibrationScore).toBeGreaterThanOrEqual(60.0);
        expect(report.timeline.length).toBe(11);
    });

    it('REPLAY-02: Should compute evidence-based Trust Score with strict Law 18 penalties', () => {
        // High trust case: 200 vouchers, 3 bank feeds, 95% historical accuracy, 0 missing info
        const highTrust = decisionValidation.calculateTrustScore(200, 3, 95.0, 0, 1);
        expect(highTrust.trustScore).toBeGreaterThanOrEqual(90);
        expect(highTrust.confidenceCalibration).toBe('HIGH');
        expect(highTrust.missingInfoPenalty).toBe(0);

        // Law 18 Penalty case: Missing 2 critical data sets (unverified payroll, unbilled invoices)
        const penalizedTrust = decisionValidation.calculateTrustScore(200, 3, 95.0, 2, 2);
        expect(penalizedTrust.missingInfoPenalty).toBe(24);
        expect(penalizedTrust.trustScore).toBeLessThan(highTrust.trustScore);
    });

    it('REPLAY-03: Should compile internal Founder Trust Dashboard with prediction and acceptance rates', () => {
        // Record mock discovery events
        founderDiscovery.recordLifecycleEvent({
            recommendationId: 'REC_HORIZON_01',
            organizationId: 'ORG_HORIZON_TEST',
            stage: 'SHOWN',
            mandateTitle: 'SURVIVAL MANDATE: Freeze Non-Core Outflows',
            projectedRunwayImpactDays: 45,
            timestamp: new Date().toISOString(),
        });
        founderDiscovery.recordLifecycleEvent({
            recommendationId: 'REC_HORIZON_01',
            organizationId: 'ORG_HORIZON_TEST',
            stage: 'ACCEPTED',
            mandateTitle: 'SURVIVAL MANDATE: Freeze Non-Core Outflows',
            projectedRunwayImpactDays: 45,
            timestamp: new Date().toISOString(),
        });

        const dashboard = founderDiscovery.getInternalTrustDashboard('ORG_HORIZON_TEST');

        expect(dashboard.recommendationAcceptanceRate).toBeGreaterThanOrEqual(80.0);
        expect(dashboard.predictionAccuracy30d).toBeGreaterThanOrEqual(90.0);
        expect(dashboard.averageTrustScore).toBeGreaterThanOrEqual(80.0);
        expect(dashboard.teamOperationalFocus).toContain('Continuous Founder Observation');
    });
});
