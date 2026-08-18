import { UnknownStateEngine } from '../common/uncertainty/unknown-state.engine';
import { DecisionValidationService } from '../cfo-engine/decision-validation.service';
import { StateCertificationEngine, SurfaceStatePayload } from '../common/certification/state-certification.engine';
import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

describe('PROJECT PHOENIX: REAL-WORLD SURVIVAL CERTIFICATION', () => {
    let universalParser: UniversalParserService;
    let decisionValidator: DecisionValidationService;

    beforeAll(() => {
        const mockConfig = { get: () => 'MOCK_KEY' } as unknown as ConfigService;
        universalParser = new UniversalParserService(mockConfig);
        const mockPrisma = {} as unknown as PrismaService;
        decisionValidator = new DecisionValidationService(mockPrisma);
    });

    it('PHOENIX-01: Law 18 Enforcement — Should flag UNAVAILABLE status on missing payroll', () => {
        const partialFixturePath = path.resolve(__dirname, '../../datasets/edge-cases/partial_missing_payroll.csv');
        expect(fs.existsSync(partialFixturePath)).toBe(true);

        const profiles = UnknownStateEngine.auditEvidenceProfile(
            [], // No canonical payroll
            1,  // 1 bank account connected
            false // Incomplete GST
        );

        expect(profiles.cashInBank.status).toBe('VERIFIED');
        expect(profiles.payrollBurn.status).toBe('UNAVAILABLE');
        expect(profiles.payrollBurn.confidenceScore).toBeLessThanOrEqual(0.3);
        expect(profiles.payrollBurn.missingDataWarning).toContain('Missing recent salary outflows');
        expect(profiles.gstTaxBuffer.status).toBe('ESTIMATED');
    });

    it('PHOENIX-02: 6-Pillar CFO Explainability — Should answer all 6 CFO justification questions', () => {
        const evidenceProfiles = UnknownStateEngine.auditEvidenceProfile([], 1, false);

        const explainability = UnknownStateEngine.buildExplainability(
            'Freeze Discretionary SaaS Tools to Protect Runway',
            'SaaS expense grew 35% MoM while revenue was flat.',
            [
                { label: 'Spendable Cash', value: '₹24.5L' },
                { label: 'Estimated Net Burn', value: '₹4.2L/mo' },
                { label: 'True Runway', value: '5.8 Months' },
            ],
            ['RULE_EXPENSE_SPIKE_DETECTED', 'RULE_RUNWAY_PRESERVATION'],
            ['TXN-AWS-4921', 'TXN-NOTION-881'],
            evidenceProfiles
        );

        expect(explainability.why).toBeTruthy();
        expect(explainability.financialFacts.length).toBe(3);
        expect(explainability.rulesTriggered.length).toBe(2);
        expect(explainability.evidenceVouchers.length).toBe(2);
        expect(explainability.uncertaintyReport.hasUncertainty).toBe(true);
        expect(explainability.uncertaintyReport.counselDisclaimer).toContain('Law 18 Notice');
    });

    it('PHOENIX-03: 30/90-Day Outcome Calibration — Should calculate accuracy score and multiplier', () => {
        // Scenario A: Projected +30 days runway, achieved +28 days (High accuracy)
        const calibrationA = decisionValidator.calibrateOutcome(30, 28);
        expect(calibrationA.accuracyScorePercent).toBeGreaterThanOrEqual(90);
        expect(calibrationA.calibrationMultiplier).toBeCloseTo(0.93, 1);

        // Scenario B: Projected +30 days runway, achieved +15 days (50% accuracy)
        const calibrationB = decisionValidator.calibrateOutcome(30, 15);
        expect(calibrationB.accuracyScorePercent).toBe(50.0);
        expect(calibrationB.calibrationMultiplier).toBe(0.5);
    });

    it('PHOENIX-04: Messy PSU Bank Parsing — Should parse PNB multiline statement cleanly', async () => {
        const pnbPath = path.resolve(__dirname, '../../datasets/banks/pnb_multiline_narration.csv');
        const buffer = fs.readFileSync(pnbPath);

        const parsed = await universalParser.parse(buffer, 'pnb_multiline_narration.csv');
        expect(parsed.transactions?.length).toBeGreaterThanOrEqual(5);
        expect(parsed.metadata?.skippedDisclaimerRows).toBeGreaterThanOrEqual(1);
    });

    it('PHOENIX-05: Multi-Surface Consistency — Identical conclusions across all executive surfaces', () => {
        const surfaces: SurfaceStatePayload[] = [
            { surfaceName: 'DASHBOARD', cashInBank: 2855000, spendableCash: 2450000, monthlyNetBurn: 520000, trueRunwayMonths: 4.7 },
            { surfaceName: 'DAILY_BRIEF', cashInBank: 2855000, spendableCash: 2450000, monthlyNetBurn: 520000, trueRunwayMonths: 4.7 },
            { surfaceName: 'DECISION_LAB', cashInBank: 2855000, spendableCash: 2450000, monthlyNetBurn: 520000, trueRunwayMonths: 4.7 },
            { surfaceName: 'AI_COUNSEL', cashInBank: 2855000, spendableCash: 2450000, monthlyNetBurn: 520000, trueRunwayMonths: 4.7 },
        ];

        const report = StateCertificationEngine.certifySurfaceConsistency(surfaces);
        expect(report.passed).toBe(true);
        expect(report.divergences.length).toBe(0);
    });
});
