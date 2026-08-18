import { RegressionRunnerService } from './regression-runner.service';
import { DriftDetectorService, OperatingContextSnapshot } from './drift-detector.service';
import { ReliabilityLabService } from './reliability-lab.service';
import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('PROJECT TITAN: RELIABILITY LAB CERTIFICATION', () => {
    let regressionRunner: RegressionRunnerService;
    let driftDetector: DriftDetectorService;
    let reliabilityLab: ReliabilityLabService;
    let universalParser: UniversalParserService;

    beforeAll(() => {
        const mockConfig = { get: () => 'MOCK_KEY' } as unknown as ConfigService;
        universalParser = new UniversalParserService(mockConfig);
        regressionRunner = new RegressionRunnerService(universalParser);
        driftDetector = new DriftDetectorService();
        const mockPrisma = {} as unknown as PrismaService;
        reliabilityLab = new ReliabilityLabService(regressionRunner, driftDetector, mockPrisma);
    });

    it('TITAN-01: Should execute all Golden Dataset fixtures automatically via Regression Runner', async () => {
        const report = await regressionRunner.runAllGoldenDatasets();

        expect(report.totalFixtures).toBeGreaterThanOrEqual(2);
        expect(report.passedFixtures).toBe(report.totalFixtures);
        expect(report.failedFixtures).toBe(0);
        expect(report.overallPassRate).toBe(100.0);
        expect(report.results.every(r => r.invariantsPassed)).toBe(true);
    });

    it('TITAN-02: Should detect zero state drift on identical Operating Context and flag shifts', () => {
        const baseline: OperatingContextSnapshot = {
            organizationId: 'org_titan_01',
            cashInBank: 5500000,
            spendableCash: 4500000,
            monthlyNetBurn: 720000,
            trueRunwayMonths: 6.3,
            taxReserve: 1000000,
        };

        const identicalCandidate: OperatingContextSnapshot = { ...baseline };
        const cleanDriftReport = driftDetector.detectStateDrift(baseline, identicalCandidate);

        expect(cleanDriftReport.hasStateDrift).toBe(false);
        expect(cleanDriftReport.deltas.length).toBe(0);

        // Perturbed candidate
        const driftedCandidate: OperatingContextSnapshot = {
            ...baseline,
            spendableCash: 4200000, // ₹3L drift
            trueRunwayMonths: 5.8,
        };

        const alertReport = driftDetector.detectStateDrift(baseline, driftedCandidate);
        expect(alertReport.hasStateDrift).toBe(true);
        expect(alertReport.deltas.some(d => d.metric === 'Spendable Cash')).toBe(true);
    });

    it('TITAN-03: Should verify Decision Determinism across identical contexts', () => {
        const baseline: OperatingContextSnapshot = {
            organizationId: 'org_titan_01',
            cashInBank: 5500000,
            spendableCash: 4500000,
            monthlyNetBurn: 720000,
            trueRunwayMonths: 6.3,
            taxReserve: 1000000,
            priorityMandate: {
                id: 'mandate_01',
                title: 'Lock Tax Buffer Before Capital Commitment',
                actionKey: 'LOCK_TAX_BUFFER',
                expectedRunwayImpactDays: 30,
            },
        };

        const candidate: OperatingContextSnapshot = { ...baseline };
        const decisionReport = driftDetector.detectDecisionDrift(baseline, candidate);

        expect(decisionReport.hasDecisionDrift).toBe(false);
        expect(decisionReport.explanation).toContain('100% deterministic');
    });

    it('TITAN-04: Should semantically validate Morning Brief text against mathematical reality', () => {
        const criticalContext: OperatingContextSnapshot = {
            organizationId: 'org_titan_01',
            cashInBank: 100000,
            spendableCash: 50000,
            monthlyNetBurn: 500000,
            trueRunwayMonths: 0.1, // 3 days
            taxReserve: 50000,
        };

        const invalidBriefNarrative = 'Good morning founder! You have a healthy runway and strong cash cushion to scale hiring.';
        const semanticReport = driftDetector.validateBriefSemantics(invalidBriefNarrative, criticalContext);

        expect(semanticReport.isValid).toBe(false);
        expect(semanticReport.semanticViolations.length).toBeGreaterThanOrEqual(1);
        expect(semanticReport.semanticViolations[0]).toContain('Semantic Mismatch');
    });

    it('TITAN-05: Should compile live Reliability Lab engineering dashboard overview', async () => {
        const dashboard = await reliabilityLab.getDashboardOverview();

        expect(dashboard.status).toBe('SYSTEM_CERTIFIED');
        expect(dashboard.regressionSummary.passRate).toBe(100);
        expect(dashboard.healthScores.length).toBe(6);
        expect(dashboard.activeGuards).toContain('Law 17 — Canonical Before Intelligence');
    });
});
