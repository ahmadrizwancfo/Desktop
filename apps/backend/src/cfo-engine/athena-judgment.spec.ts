import { AthenaJudgmentService } from './athena-judgment.service';
import { CFOState } from './cfo-state.service';

describe('PROJECT ATHENA: 8-PILLAR EXECUTIVE QUALITY JUDGMENT ENGINE', () => {
    let athenaService: AthenaJudgmentService;

    beforeAll(() => {
        athenaService = new AthenaJudgmentService();
    });

    const mockCrisisState: CFOState = {
        summary: {
            runwayMonths: 2.8,
            netBurn: 750000,
            cashInBank: 2100000,
            monthlyRevenue: 150000,
            revenueTrend: 'declining',
        },
        dynamicConfidence: { score: 90 },
        bankAccounts: [{ id: 'acc_01', balance: 2100000 }] as any,
    } as any;

    it('ATHENA-01: Should model all 8 executive quality pillars on survival recommendations', () => {
        const profile = athenaService.generateAthenaProfile(
            'RUNWAY_SURVIVAL',
            'SURVIVAL MANDATE: Immediate Burn Cut',
            mockCrisisState,
            97,
            400000
        );

        // 1. Recommended Action
        expect(profile.recommendedAction.title).toContain('SURVIVAL MANDATE');
        expect(profile.recommendedAction.steps.length).toBeGreaterThanOrEqual(3);

        // 2. Expected Financial Impact
        expect(profile.expectedFinancialImpact.runwayDeltaDays).toBe(97);
        expect(profile.expectedFinancialImpact.monthlyBurnSavings).toBe(400000);
        expect(profile.expectedFinancialImpact.netCashImpact).toContain('₹4,00,000');

        // 3. Downside of Delaying (7d, 14d, 30d)
        expect(profile.downsideOfDelaying.delay7d).toContain('Delaying 7 days consumes');
        expect(profile.downsideOfDelaying.delay14d).toContain('Delaying 14 days consumes');
        expect(profile.downsideOfDelaying.delay30d).toContain('Delaying 30 days consumes');
        expect(profile.downsideOfDelaying.riskSeverity).toBe('CRITICAL');

        // 4. Lower-Risk Alternative
        expect(profile.lowerRiskAlternative.title).toContain('Phased 50% Discretionary Spend Reduction');
        expect(profile.lowerRiskAlternative.tradeOff).toBeTruthy();

        // 5. Assumptions Relied Upon
        expect(profile.assumptionsReliedUpon.length).toBeGreaterThanOrEqual(2);

        // 6. Evidence Confidence
        expect(profile.evidenceConfidence.score).toBe(90);
        expect(profile.evidenceConfidence.basis).toContain('reconciled bank statements');

        // 7. Unknown Factors (Law 18)
        expect(profile.unknownFactors.length).toBeGreaterThanOrEqual(1);

        // 8. Opportunity Cost
        expect(profile.opportunityCost.forgoneUpside).toBeTruthy();
        expect(profile.opportunityCost.strategicSacrifice).toBeTruthy();
    });

    it('ATHENA-02: Should pass executive quality audit with 100% score across all 8 pillars', () => {
        const profile = athenaService.generateAthenaProfile(
            'RUNWAY_SURVIVAL',
            'SURVIVAL MANDATE: Immediate Burn Cut',
            mockCrisisState,
            97,
            400000
        );

        const audit = athenaService.auditExecutiveQuality(profile);

        expect(audit.auditPassed).toBe(true);
        expect(audit.qualityScore).toBe(100.0);
        expect(audit.cfoExecutiveVerdict).toContain('Certified Executive Mandate');
        expect(Object.values(audit.pillarsSatisfied).every(Boolean)).toBe(true);
    });

    it('ATHENA-03: Should calculate exact cash loss in downside of delay modeling', () => {
        const profile = athenaService.generateAthenaProfile(
            'BURN_SPIKE',
            'Optimize Fixed Software Expenses',
            mockCrisisState,
            30,
            120000
        );

        // Daily burn is ~₹24,638 (7.5L / 30.44)
        // 7d delay is ~₹1.72L
        expect(profile.downsideOfDelaying.delay7d).toContain('₹1,72,470');
        expect(profile.downsideOfDelaying.delay30d).toContain('₹7,39,159');
    });

    it('ATHENA-04: Should model venture debt alternative and dilution opportunity cost on fundraising mandates', () => {
        const profile = athenaService.generateAthenaProfile(
            'FUNDRAISE_MANDATE',
            'Initiate Series Seed Fundraising',
            mockCrisisState,
            180,
            0
        );

        expect(profile.lowerRiskAlternative.title).toContain('Bridge Loan / Venture Debt Extension');
        expect(profile.opportunityCost.strategicSacrifice).toContain('equity dilution');
        expect(profile.opportunityCost.forgoneUpside).toContain('product execution');
    });

    it('ATHENA-05: Should flag unverified revenue collections under Law 18 unknown factors', () => {
        const stateWithoutRevenue: CFOState = {
            ...mockCrisisState,
            summary: {
                ...mockCrisisState.summary,
                monthlyRevenue: 0,
            },
        };

        const profile = athenaService.generateAthenaProfile(
            'EXPENSE_CUT',
            'Cut Marketing Outflow',
            stateWithoutRevenue,
            45,
            100000
        );

        expect(profile.unknownFactors.some(u => u.includes('Unverified non-recurring customer cash collections'))).toBe(true);
    });
});
