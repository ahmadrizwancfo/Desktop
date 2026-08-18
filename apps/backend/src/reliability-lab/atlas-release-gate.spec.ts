import { RegressionRunnerService } from './regression-runner.service';
import { DriftDetectorService, OperatingContextSnapshot } from './drift-detector.service';
import { AlphaBenchmarkerService } from './alpha-benchmarker.service';
import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { StateCertificationEngine, SurfaceStatePayload } from '../common/certification/state-certification.engine';
import { FinancialInvariantEngine } from '../common/invariants/financial-invariant.engine';
import { FinancialReplayEngine, ReplayCoordinate } from '../common/replay/financial-replay.engine';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

describe('PROJECT ATLAS: ALPHA RELEASE GATES CERTIFICATION', () => {
    let universalParser: UniversalParserService;
    let regressionRunner: RegressionRunnerService;
    let driftDetector: DriftDetectorService;
    let benchmarker: AlphaBenchmarkerService;

    beforeAll(() => {
        const mockConfig = { get: () => 'MOCK_KEY' } as unknown as ConfigService;
        universalParser = new UniversalParserService(mockConfig);
        regressionRunner = new RegressionRunnerService(universalParser);
        driftDetector = new DriftDetectorService();
        benchmarker = new AlphaBenchmarkerService(universalParser);
    });

    it('GATE 1: Parser Certification across all Golden Datasets', async () => {
        const report = await regressionRunner.runAllGoldenDatasets();
        expect(report.totalFixtures).toBeGreaterThanOrEqual(4);
        expect(report.passedFixtures).toBe(report.totalFixtures);
        expect(report.overallPassRate).toBe(100.0);
    });

    it('GATE 2: Replay Certification (0-bit drift state hash reproduction)', async () => {
        const sbiPath = path.resolve(__dirname, '../../datasets/banks/sbi_disclaimer_header.csv');
        const buffer = fs.readFileSync(sbiPath);
        const coordinate: ReplayCoordinate = {
            rawFileSha256: '',
            parserVersion: '2.1.0',
            financialEngineVersion: '2.0.0',
            ruleRegistryVersion: '1.4.0',
        };

        const r1 = await FinancialReplayEngine.replayPipeline(buffer, 'sbi.csv', coordinate, universalParser);
        const r2 = await FinancialReplayEngine.replayPipeline(buffer, 'sbi.csv', coordinate, universalParser);

        expect(r1.reproducedStateHash).toBe(r2.reproducedStateHash);
        expect(r1.invariants.allPassed).toBe(true);
    });

    it('GATE 3: State Consistency Gate (Multi-Surface SSOT)', () => {
        const surfaces: SurfaceStatePayload[] = [
            { surfaceName: 'DASHBOARD', cashInBank: 8500000, spendableCash: 7085000, monthlyNetBurn: 1450000, trueRunwayMonths: 4.9 },
            { surfaceName: 'DAILY_BRIEF', cashInBank: 8500000, spendableCash: 7085000, monthlyNetBurn: 1450000, trueRunwayMonths: 4.9 },
            { surfaceName: 'DECISION_LAB', cashInBank: 8500000, spendableCash: 7085000, monthlyNetBurn: 1450000, trueRunwayMonths: 4.9 },
            { surfaceName: 'AI_COUNSEL', cashInBank: 8500000, spendableCash: 7085000, monthlyNetBurn: 1450000, trueRunwayMonths: 4.9 },
        ];

        const report = StateCertificationEngine.certifySurfaceConsistency(surfaces);
        expect(report.passed).toBe(true);
        expect(report.divergences.length).toBe(0);
    });

    it('GATE 4: Decision Determinism Gate', () => {
        const context: OperatingContextSnapshot = {
            organizationId: 'org_atlas',
            cashInBank: 8500000,
            spendableCash: 7085000,
            monthlyNetBurn: 1450000,
            trueRunwayMonths: 4.9,
            taxReserve: 1415000,
            priorityMandate: {
                id: 'mandate_runway_ext',
                title: 'Collect Overdue Accounts Receivable (+18 Days Runway)',
                actionKey: 'COLLECT_AR',
                expectedRunwayImpactDays: 18,
            },
        };

        const drift = driftDetector.detectDecisionDrift(context, { ...context });
        expect(drift.hasDecisionDrift).toBe(false);
        expect(drift.explanation).toContain('100% deterministic');
    });

    it('GATE 5: Invariant Certification Gate (3-Tier Truth Validation)', () => {
        const salaryCreditTxn: any = {
            id: 'corrupt_sal',
            source: 'BANK_FEED',
            organizationId: 'org_atlas',
            date: new Date(),
            amount: 500000,
            direction: 'CREDIT', // Financially impossible
            category: 'Revenue',
            narration: 'SALARY CREDIT EXPENSE',
        };

        const report = FinancialInvariantEngine.evaluateBatch([salaryCreditTxn], 1000000);
        expect(report.allPassed).toBe(false);
        expect(report.businessTruth).toBe(false);
        expect(report.spendableCashApproved).toBe(false);
    });

    it('GATE 6 & 7: Performance & Concurrency Gate', async () => {
        const benchReport = await benchmarker.runPerformanceBenchmarks();
        expect(benchReport.releaseGateStatus).toBe('ALPHA_CERTIFIED');
        expect(benchReport.concurrencyTest.successRate).toBe(100);
        expect(benchReport.benchmarks[0].averageDurationMs).toBeLessThanOrEqual(50);
    });
});
