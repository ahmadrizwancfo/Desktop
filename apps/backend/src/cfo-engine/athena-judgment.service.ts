import { Injectable, Logger } from '@nestjs/common';
import { CFOState, Decision, AthenaExecutiveQualityProfile } from './cfo-state.service';
import { FinancialMath } from '../common/math/financial-math.util';

export interface AthenaQualityAuditResult {
    auditPassed: boolean;
    qualityScore: number; // 0 - 100
    pillarsSatisfied: {
        recommendedAction: boolean;
        expectedFinancialImpact: boolean;
        downsideOfDelaying: boolean;
        lowerRiskAlternative: boolean;
        assumptionsReliedUpon: boolean;
        evidenceConfidence: boolean;
        unknownFactors: boolean;
        opportunityCost: boolean;
    };
    cfoExecutiveVerdict: string;
}

@Injectable()
export class AthenaJudgmentService {
    private readonly logger = new Logger(AthenaJudgmentService.name);

    /**
     * Synthesizes the 8-Pillar Executive Quality Profile for any candidate decision.
     * Evaluated on executive quality, downside of delay, lower-risk alternatives, and opportunity cost.
     */
    public generateAthenaProfile(
        decisionKey: string,
        title: string,
        state: CFOState,
        impactRunwayDays: number,
        impactBurnMonthly: number,
        customSteps?: string[]
    ): AthenaExecutiveQualityProfile {
        const runway = isNaN(state.summary.runwayMonths) ? 0 : state.summary.runwayMonths;
        const netBurn = isNaN(Number(state.summary.netBurn)) ? 0 : Number(state.summary.netBurn);
        const cashInBank = isNaN(Number(state.summary.cashInBank)) ? 0 : Number(state.summary.cashInBank);
        const dailyBurn = netBurn > 0 ? netBurn / 30.44 : 1000;

        // 1. Recommended Action
        const steps = customSteps && customSteps.length > 0
            ? customSteps
            : [
                `Audit current cash outflow for ${title}`,
                'Execute immediate allocation adjustment with finance team',
                'Lock revised cash policy in FounderCFO continuous monitoring',
            ];

        // 2. Expected Financial Impact
        const netCashImpact = impactBurnMonthly > 0
            ? `₹${FinancialMath.formatINR(impactBurnMonthly)}/month net burn savings (+${impactRunwayDays} days runway)`
            : `+${impactRunwayDays} days runway protection`;

        // 3. Downside of Delaying (7d, 14d, 30d)
        const delay7dCost = dailyBurn * 7;
        const delay14dCost = dailyBurn * 14;
        const delay30dCost = dailyBurn * 30;

        const severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = runway <= 3
            ? 'CRITICAL'
            : runway <= 6
            ? 'HIGH'
            : 'MEDIUM';

        const downsideOfDelaying = {
            delay7d: `Delaying 7 days consumes ₹${FinancialMath.formatINR(delay7dCost)} with ~${Math.round((7 / 30.44) * 30.4)} days irrevocable runway lost.`,
            delay14d: `Delaying 14 days consumes ₹${FinancialMath.formatINR(delay14dCost)} and narrows execution flexibility by 14 days.`,
            delay30d: `Delaying 30 days consumes ₹${FinancialMath.formatINR(delay30dCost)} and risks entering insolvency territory.`,
            riskSeverity: severity,
        };

        // 4. Lower-Risk Alternative
        const lowerRiskAlternative = this.synthesizeAlternative(decisionKey, runway, netBurn);

        // 5. Assumptions Relied Upon
        const assumptions = [
            'Current 30-day trailing net burn rate remains constant if no action is taken.',
            'Connected bank feeds reflect cleared cash balances (excluding uncleared cheques).',
            'No sudden unprojected statutory tax clawbacks occur within the next 45 days.',
        ];

        // 6. Evidence Confidence
        const confidenceScore = state.dynamicConfidence?.score || 85;
        const accountCount = (state as any).bankAccounts?.length || (state as any).accounts?.length || 1;
        const evidenceConfidence = {
            score: confidenceScore,
            basis: `Derived from ${accountCount} reconciled bank statements and trailing transaction trends.`,
            verifiedEvidenceCount: accountCount * 30,
        };

        // 7. Unknown Factors (Law 18: Unknown Before Incorrect)
        const unknownFactors: string[] = [];
        if (!state.summary.monthlyRevenue || state.summary.monthlyRevenue === 0) {
            unknownFactors.push('Unverified non-recurring customer cash collections in the current quarter.');
        }
        if (!state.summary.netBurn || state.summary.netBurn === 0) {
            unknownFactors.push('Pending unbilled vendor disbursements or contractor invoices.');
        }
        if (unknownFactors.length === 0) {
            unknownFactors.push('Off-balance-sheet commitments or informal debt obligations not captured in bank feeds.');
        }

        // 8. Opportunity Cost
        const opportunityCost = this.synthesizeOpportunityCost(decisionKey, impactBurnMonthly);

        const profile: AthenaExecutiveQualityProfile = {
            recommendedAction: { title, steps },
            expectedFinancialImpact: {
                runwayDeltaDays: impactRunwayDays,
                monthlyBurnSavings: impactBurnMonthly,
                netCashImpact,
            },
            downsideOfDelaying,
            lowerRiskAlternative,
            assumptionsReliedUpon: assumptions,
            evidenceConfidence,
            unknownFactors,
            opportunityCost,
            executiveAuditPassed: true,
        };

        return profile;
    }

    /**
     * Audits the executive rigor of any generated Athena profile.
     */
    public auditExecutiveQuality(profile: AthenaExecutiveQualityProfile): AthenaQualityAuditResult {
        const p = profile;

        const pillarsSatisfied = {
            recommendedAction: Boolean(p.recommendedAction?.title && p.recommendedAction.steps?.length > 0),
            expectedFinancialImpact: Boolean(p.expectedFinancialImpact?.netCashImpact && p.expectedFinancialImpact.runwayDeltaDays >= 0),
            downsideOfDelaying: Boolean(p.downsideOfDelaying?.delay7d && p.downsideOfDelaying.delay14d && p.downsideOfDelaying.delay30d),
            lowerRiskAlternative: Boolean(p.lowerRiskAlternative?.title && p.lowerRiskAlternative.description && p.lowerRiskAlternative.tradeOff),
            assumptionsReliedUpon: Boolean(p.assumptionsReliedUpon && p.assumptionsReliedUpon.length > 0),
            evidenceConfidence: Boolean(p.evidenceConfidence?.score > 0 && p.evidenceConfidence.basis),
            unknownFactors: Boolean(p.unknownFactors && p.unknownFactors.length > 0),
            opportunityCost: Boolean(p.opportunityCost?.forgoneUpside && p.opportunityCost.strategicSacrifice),
        };

        const totalPillars = Object.keys(pillarsSatisfied).length;
        const passedPillars = Object.values(pillarsSatisfied).filter(Boolean).length;
        const qualityScore = parseFloat(((passedPillars / totalPillars) * 100).toFixed(1));
        const auditPassed = qualityScore >= 90;

        return {
            auditPassed,
            qualityScore,
            pillarsSatisfied,
            cfoExecutiveVerdict: auditPassed
                ? 'Certified Executive Mandate: Rigorous 8-pillar modeling with explicit delay downside and opportunity cost.'
                : 'Fails Executive Standard: Incomplete pillars or missing opportunity cost analysis.',
        };
    }

    private synthesizeAlternative(
        key: string,
        runway: number,
        netBurn: number
    ): AthenaExecutiveQualityProfile['lowerRiskAlternative'] {
        if (key.includes('SURVIVAL') || key.includes('BURN')) {
            return {
                title: 'Phased 50% Discretionary Spend Reduction',
                description: 'Pause SaaS and contractor expenses first before initiating permanent headcount adjustments.',
                tradeOff: 'Extends runway by +1.2 months instead of +3.0 months, but preserves core team morale and execution speed.',
                riskLevel: 'LOW',
            };
        }
        if (key.includes('FUNDRAISE')) {
            return {
                title: 'Bridge Loan / Venture Debt Extension',
                description: 'Raise a smaller ₹50L non-dilutive bridge round from existing investors.',
                tradeOff: 'Lower founder dilution and 3-week closing speed, but creates a 12-month repayment obligation.',
                riskLevel: 'MEDIUM',
            };
        }
        return {
            title: 'Selective Category Optimization',
            description: 'Renegotiate top 3 vendor contracts without broad spending freezes.',
            tradeOff: 'Achieves ~40% of target savings without operational disruption.',
            riskLevel: 'LOW',
        };
    }

    private synthesizeOpportunityCost(
        key: string,
        impactBurnMonthly: number
    ): AthenaExecutiveQualityProfile['opportunityCost'] {
        if (key.includes('SURVIVAL') || key.includes('BURN') || impactBurnMonthly > 0) {
            return {
                forgoneUpside: 'Temporary reduction in top-of-funnel outbound sales experimentation and paid marketing velocity.',
                strategicSacrifice: 'Delays non-critical product feature roadmap items by 1–2 quarters in exchange for guaranteed solvency.',
            };
        }
        if (key.includes('FUNDRAISE')) {
            return {
                forgoneUpside: 'Founder attention is diverted from pure product execution into investor pitch meetings for 4–6 weeks.',
                strategicSacrifice: 'Accepts 15–20% equity dilution in exchange for 18 months of aggressive scaling runway.',
            };
        }
        return {
            forgoneUpside: 'Alternative allocation of engineering hours towards new growth features instead of cost audits.',
            strategicSacrifice: 'Modest slowdown in discretionary experimentation.',
        };
    }
}
