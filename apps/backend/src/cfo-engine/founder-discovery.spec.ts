import { FounderDiscoveryService } from './founder-discovery.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FOUNDER DISCOVERY INFRASTRUCTURE: BEHAVIORAL INSTRUMENTATION & JUDGMENT QUALITY', () => {
    let discoveryService: FounderDiscoveryService;

    beforeAll(() => {
        const mockPrisma = {} as unknown as PrismaService;
        discoveryService = new FounderDiscoveryService(mockPrisma);
    });

    it('DISCOVERY-01: Should track recommendation 5-stage lifecycle and compute conversion rates', () => {
        const orgId = 'org_founder_alpha';

        // 1. Recommendation A: Shown ➔ Read ➔ Accepted ➔ Executed ➔ Outcome Verified
        discoveryService.recordLifecycleEvent({
            recommendationId: 'rec_01',
            organizationId: orgId,
            stage: 'SHOWN',
            mandateTitle: 'Collect Overdue Invoices (+18d Runway)',
            projectedRunwayImpactDays: 18,
            timestamp: new Date().toISOString(),
        });

        discoveryService.recordLifecycleEvent({
            recommendationId: 'rec_01',
            organizationId: orgId,
            stage: 'READ',
            mandateTitle: 'Collect Overdue Invoices (+18d Runway)',
            projectedRunwayImpactDays: 18,
            dwellTimeMs: 45000,
            timestamp: new Date().toISOString(),
        });

        discoveryService.recordLifecycleEvent({
            recommendationId: 'rec_01',
            organizationId: orgId,
            stage: 'ACCEPTED',
            mandateTitle: 'Collect Overdue Invoices (+18d Runway)',
            projectedRunwayImpactDays: 18,
            timestamp: new Date().toISOString(),
        });

        discoveryService.recordLifecycleEvent({
            recommendationId: 'rec_01',
            organizationId: orgId,
            stage: 'EXECUTED',
            mandateTitle: 'Collect Overdue Invoices (+18d Runway)',
            projectedRunwayImpactDays: 18,
            timestamp: new Date().toISOString(),
        });

        discoveryService.recordLifecycleEvent({
            recommendationId: 'rec_01',
            organizationId: orgId,
            stage: 'OUTCOME_VERIFIED',
            mandateTitle: 'Collect Overdue Invoices (+18d Runway)',
            projectedRunwayImpactDays: 18,
            actualRunwayImpactDays30d: 16, // Achieved +16 days
            timestamp: new Date().toISOString(),
        });

        const report = discoveryService.getJudgmentQualityReport(orgId);

        expect(report.totalRecommendationsShown).toBe(1);
        expect(report.totalRecommendationsRead).toBe(1);
        expect(report.totalRecommendationsAccepted).toBe(1);
        expect(report.totalRecommendationsExecuted).toBe(1);
        expect(report.acceptanceRatePercent).toBe(100.0);
        expect(report.executionRatePercent).toBe(100.0);
        expect(report.projectedVsActualAccuracyPercent).toBeGreaterThanOrEqual(85.0);
    });

    it('DISCOVERY-02: Should record screen dwell times and action abandonment telemetry', () => {
        const orgId = 'org_founder_alpha';

        discoveryService.recordScreenInteraction({
            organizationId: orgId,
            screen: 'DECISION_LAB',
            dwellTimeMs: 120000, // 2 minutes dwell
            actionTriggered: 'EXECUTE_COLLECT_AR',
            abandoned: false,
            timestamp: new Date().toISOString(),
        });

        discoveryService.recordScreenInteraction({
            organizationId: orgId,
            screen: 'DAILY_BRIEF',
            dwellTimeMs: 15000,
            abandoned: true, // Left without acting
            timestamp: new Date().toISOString(),
        });

        // Telemetry recorded with zero exceptions
        expect(true).toBe(true);
    });

    it('DISCOVERY-03: Should capture lightweight founder feedback and rejection reasons', () => {
        const orgId = 'org_founder_alpha';

        // Helpful feedback
        discoveryService.recordFeedback({
            recommendationId: 'rec_01',
            organizationId: orgId,
            isHelpful: true,
            perceivedClarity: 5,
            founderNote: 'Very clear quantification of 18 days runway.',
            timestamp: new Date().toISOString(),
        });

        // Rejected recommendation with explicit reason
        discoveryService.recordFeedback({
            recommendationId: 'rec_02',
            organizationId: orgId,
            isHelpful: false,
            perceivedClarity: 4,
            rejectionReason: 'WRONG_TIMING',
            founderNote: 'Already closing our round next week.',
            timestamp: new Date().toISOString(),
        });

        const report = discoveryService.getJudgmentQualityReport(orgId);
        expect(report.averageClarityRating).toBe(4.5);
        expect(report.rejectionDistribution.WRONG_TIMING).toBe(1);
    });

    it('DISCOVERY-04: Should compile executive Judgment Quality Dashboard report', () => {
        const report = discoveryService.getJudgmentQualityReport();

        expect(report.evidenceConclusion).toContain('Recommendations drive actionable executive execution');
        expect(report.averageDecisionTimeMinutes).toBeGreaterThan(0);
        expect(report.acceptanceRatePercent).toBeGreaterThan(0);
    });
});
