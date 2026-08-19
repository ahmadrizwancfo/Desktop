import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { HumanCfoBenchmarkService } from '../cfo-engine/human-cfo-benchmark.service';
import { AthenaJudgmentService } from '../cfo-engine/athena-judgment.service';
import { StateCertificationEngine, SurfaceStatePayload } from '../common/certification/state-certification.engine';
import { FinancialInvariantEngine } from '../common/invariants/financial-invariant.engine';
import { CanonicalTransaction } from '../common/canonical-model/canonical-model.interface';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

describe('PRODUCTION READINESS & CHAOS RESILIENCE SUITE', () => {
    let universalParser: UniversalParserService;
    let humanCfoBenchmark: HumanCfoBenchmarkService;
    let athenaJudgment: AthenaJudgmentService;

    beforeAll(() => {
        const mockConfig = { get: () => 'MOCK_KEY' } as unknown as ConfigService;
        universalParser = new UniversalParserService(mockConfig);
        athenaJudgment = new AthenaJudgmentService();
        humanCfoBenchmark = new HumanCfoBenchmarkService(athenaJudgment);
    });

    it('CHAOS-01: Should handle truncated and corrupted statement lines without crashing', async () => {
        const filePath = path.resolve(__dirname, '../../datasets/edge-cases/truncated_corrupted_statement.csv');
        expect(fs.existsSync(filePath)).toBe(true);

        const buffer = fs.readFileSync(filePath);
        const parsed = await universalParser.parse(buffer, 'truncated_corrupted_statement.csv');

        expect(parsed.transactions?.length).toBeGreaterThanOrEqual(2);
        expect(parsed.quality.score).toBeDefined();
    });

    it('CHAOS-02: Should preserve double-entry invariants under rapid duplicate transaction storm', () => {
        const baseTxn: CanonicalTransaction = {
            id: 'TXN_STORM_01',
            source: 'BANK_FEED',
            organizationId: 'ORG_CHAOS',
            schemaVersion: '1.0',
            amount: 450000,
            type: 'EXPENSE',
            direction: 'DEBIT',
            category: 'Payroll',
            date: new Date('2026-04-05'),
            narration: 'SALARY APRIL CMS BATCH',
        };

        // Batch of 10 identical duplicate events
        const batch: CanonicalTransaction[] = Array.from({ length: 10 }).map((_, i) => ({
            ...baseTxn,
            id: `TXN_STORM_${i}`,
        }));

        const report = FinancialInvariantEngine.evaluateBatch(batch, 5000000);
        expect(report.mathematicalTruth).toBe(true);
        expect(report.spendableCashApproved).toBe(true);
    });

    it('CHAOS-03: Should parse real-world Axis Bank DR/CR flags and Kotak NetBanking formats', async () => {
        const axisPath = path.resolve(__dirname, '../../datasets/banks/axis_drcr_flags.csv');
        const kotakPath = path.resolve(__dirname, '../../datasets/banks/kotak_netbanking_sample.csv');

        const [axisParsed, kotakParsed] = await Promise.all([
            universalParser.parse(fs.readFileSync(axisPath), 'axis_drcr_flags.csv'),
            universalParser.parse(fs.readFileSync(kotakPath), 'kotak_netbanking_sample.csv'),
        ]);

        expect(axisParsed.transactions?.length).toBeGreaterThanOrEqual(4);
        expect(kotakParsed.transactions?.length).toBeGreaterThanOrEqual(4);
    });

    it('CHAOS-04: Should enforce 0-divergence multi-surface consistency across all windows', () => {
        const surfaces: SurfaceStatePayload[] = [
            { surfaceName: 'LANDING_PAGE', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'DASHBOARD', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'DAILY_BRIEF', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'AI_COUNSEL', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'DECISION_LAB', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'NOTIFICATIONS', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
            { surfaceName: 'REPORTS', cashInBank: 6550000, spendableCash: 5800000, monthlyNetBurn: 1250000, trueRunwayMonths: 4.64 },
        ];

        const report = StateCertificationEngine.certifySurfaceConsistency(surfaces);
        expect(report.passed).toBe(true);
        expect(report.divergences.length).toBe(0);
    });

    it('CHAOS-05: Should achieve >= 95% agreement against expert human CFO recommendations', () => {
        const benchmarkReport = humanCfoBenchmark.evaluateHumanCfoBenchmark();

        expect(benchmarkReport.totalScenarios).toBe(3);
        expect(benchmarkReport.averageAgreementScore).toBeGreaterThanOrEqual(95.0);
        expect(benchmarkReport.scenarios.every(s => s.executiveSignOff)).toBe(true);
    });
});
