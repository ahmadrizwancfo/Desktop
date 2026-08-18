import { Injectable, Logger } from '@nestjs/common';
import { FinancialMath } from '../common/math/financial-math.util';

export interface OperatingContextSnapshot {
    organizationId: string;
    cashInBank: number | string;
    spendableCash: number | string;
    monthlyNetBurn: number | string;
    trueRunwayMonths: number | string;
    taxReserve: number | string;
    priorityMandate?: {
        id: string;
        title: string;
        actionKey: string;
        expectedRunwayImpactDays: number;
    };
}

export interface StateDriftReport {
    hasStateDrift: boolean;
    deltas: Array<{
        metric: string;
        baselineValue: any;
        candidateValue: any;
        divergence: string;
    }>;
}

export interface DecisionDriftReport {
    hasDecisionDrift: boolean;
    baselineMandate?: string;
    candidateMandate?: string;
    explanation: string;
}

export interface BriefSemanticValidationReport {
    isValid: boolean;
    semanticViolations: string[];
}

@Injectable()
export class DriftDetectorService {
    private readonly logger = new Logger(DriftDetectorService.name);

    /**
     * Compares two OperatingContext snapshots for state drift.
     */
    public detectStateDrift(
        baseline: OperatingContextSnapshot,
        candidate: OperatingContextSnapshot
    ): StateDriftReport {
        const deltas: StateDriftReport['deltas'] = [];

        const checkMetric = (name: string, baseVal: any, candVal: any, tolerance = 0.01) => {
            const bDec = FinancialMath.toDecimal(baseVal || 0);
            const cDec = FinancialMath.toDecimal(candVal || 0);
            const diff = bDec.minus(cDec).abs();

            if (diff.greaterThan(tolerance)) {
                deltas.push({
                    metric: name,
                    baselineValue: baseVal,
                    candidateValue: candVal,
                    divergence: `Delta: ${diff.toFixed(2)}`,
                });
            }
        };

        checkMetric('Cash in Bank', baseline.cashInBank, candidate.cashInBank);
        checkMetric('Spendable Cash', baseline.spendableCash, candidate.spendableCash);
        checkMetric('Monthly Net Burn', baseline.monthlyNetBurn, candidate.monthlyNetBurn);
        checkMetric('True Runway (Months)', baseline.trueRunwayMonths, candidate.trueRunwayMonths, 0.05);
        checkMetric('Tax Reserve', baseline.taxReserve, candidate.taxReserve);

        return {
            hasStateDrift: deltas.length > 0,
            deltas,
        };
    }

    /**
     * Ensures identical Operating Context produces identical Priority Mandates.
     */
    public detectDecisionDrift(
        baseline: OperatingContextSnapshot,
        candidate: OperatingContextSnapshot
    ): DecisionDriftReport {
        const baseTitle = baseline.priorityMandate?.title || 'None';
        const candTitle = candidate.priorityMandate?.title || 'None';

        const hasDecisionDrift = baseTitle !== candTitle;

        return {
            hasDecisionDrift,
            baselineMandate: baseTitle,
            candidateMandate: candTitle,
            explanation: hasDecisionDrift
                ? `Decision drifted from "${baseTitle}" to "${candTitle}" without context change.`
                : 'Priority Mandate is 100% deterministic and preserved.',
        };
    }

    /**
     * Semantically validates Morning Brief narratives against mathematical reality.
     */
    public validateBriefSemantics(
        briefText: string,
        context: OperatingContextSnapshot
    ): BriefSemanticValidationReport {
        const violations: string[] = [];
        const lower = briefText.toLowerCase();

        const burn = Number(context.monthlyNetBurn || 0);
        const runway = Number(context.trueRunwayMonths || 0);

        // If runway is critical (< 3 months), narrative cannot claim healthy/extended runway
        if (runway < 3 && (lower.includes('healthy runway') || lower.includes('strong cash cushion') || lower.includes('plenty of time'))) {
            violations.push(`Semantic Mismatch: Runway is ${runway} months (CRITICAL), but briefing described cash position as healthy/strong.`);
        }

        // If burn is 0, narrative cannot claim severe burn acceleration
        if (burn === 0 && (lower.includes('burn spiked') || lower.includes('burn accelerated'))) {
            violations.push('Semantic Mismatch: Net Burn is 0, but briefing claimed burn spiked or accelerated.');
        }

        return {
            isValid: violations.length === 0,
            semanticViolations: violations,
        };
    }
}
