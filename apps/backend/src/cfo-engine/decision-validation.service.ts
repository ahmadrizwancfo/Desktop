import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DecisionOutcomeRecord {
    decisionId: string;
    organizationId: string;
    actionTitle: string;
    actionKey: string;
    status: 'ACCEPTED' | 'IGNORED' | 'EXECUTED';
    projectedRunwayImpactDays: number;
    actualRunwayImpactDays30d?: number;
    actualRunwayImpactDays90d?: number;
    accuracyScorePercent?: number;
    calibrationMultiplier: number;
    recordedAt: string;
}

export interface HistoricalTimeSlice {
    monthIndex: number; // 1 to 12
    date: string; // ISO date
    openingCash: number;
    inflows: number;
    outflows: number;
    closingCash: number;
    realizedRunwayMonths: number;
    realizedBurn: number;
    realizedTaxObligation: number;
}

export interface ReplayTimeStepPrediction {
    monthIndex: number;
    asOfDate: string;
    availableCash: number;
    predictedRunwayMonths: number;
    predictedClosingCash30d: number;
    predictedTaxObligation: number;
    mandateIssued: string;
    projectedRunwayImpactDays: number;
    actualRealizedCash30d: number;
    actualRealizedRunway30d: number;
    runwayErrorMonths: number;
    cashErrorAmount: number;
    predictionAccuracyPercent: number;
    isFalsePositiveCrisis: boolean;
    isFalseNegativeMiss: boolean;
}

export interface HistoricalReplayReport {
    organizationId: string;
    totalMonthsReplayed: number;
    averageRunwayAccuracyPercent: number;
    averageCashAccuracyPercent: number;
    falsePositiveRatePercent: number;
    falseNegativeRatePercent: number;
    confidenceCalibrationScore: number; // 0 to 100
    overallReplayVerdict: string;
    timeline: ReplayTimeStepPrediction[];
}

export interface TrustScoreBreakdown {
    trustScore: number; // 0 to 100
    evidenceCompleteness: number; // 0 to 100
    historicalAccuracy: number; // 0 to 100
    verifiedEvidenceCount: number;
    missingInfoPenalty: number;
    assumptionPenalty: number;
    confidenceCalibration: 'HIGH' | 'MODERATE' | 'LOW';
    explanation: string;
}

@Injectable()
export class DecisionValidationService {
    private readonly logger = new Logger(DecisionValidationService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Calibrates the historical accuracy of a CFO priority recommendation.
     * Computes the variance between projected runway impact and real-world 30d/90d cash outcomes.
     */
    public calibrateOutcome(
        projectedDays: number,
        actualDays30d: number,
        actualDays90d?: number
    ): { accuracyScorePercent: number; calibrationMultiplier: number } {
        const effectiveActual = actualDays90d !== undefined ? actualDays90d : actualDays30d;
        const maxVal = Math.max(Math.abs(projectedDays), Math.abs(effectiveActual), 1);
        const error = Math.abs(projectedDays - effectiveActual);

        const accuracyScorePercent = Math.max(0, parseFloat(((1 - (error / maxVal)) * 100).toFixed(1)));

        // Multiplier: If we systematically under/over-estimate impact, adjust future scenario models
        let calibrationMultiplier = 1.0;
        if (effectiveActual > 0 && projectedDays > 0) {
            calibrationMultiplier = parseFloat((effectiveActual / projectedDays).toFixed(2));
            // Bound multiplier to reasonable range [0.5, 1.5]
            calibrationMultiplier = Math.max(0.5, Math.min(1.5, calibrationMultiplier));
        }

        this.logger.log(`Decision Calibration: Projected: +${projectedDays}d, Actual: +${effectiveActual}d ➔ Accuracy: ${accuracyScorePercent}%, Multiplier: ${calibrationMultiplier}x`);

        return {
            accuracyScorePercent,
            calibrationMultiplier,
        };
    }

    /**
     * Priority 1: Historical Replay Validation
     * Replays 12–24 months chronologically. At each date t_i, reveals ONLY data available
     * up to that date, forecasts outcomes, and compares with realized bank reality.
     */
    public executeHistoricalReplayValidation(
        organizationId: string,
        historicalTimeline: HistoricalTimeSlice[]
    ): HistoricalReplayReport {
        this.logger.log(`Historical Replay Validation: Executing backtest for ${organizationId} across ${historicalTimeline.length} months...`);

        if (!historicalTimeline || historicalTimeline.length < 2) {
            throw new Error('Historical replay requires at least 2 consecutive monthly time slices.');
        }

        const timeline: ReplayTimeStepPrediction[] = [];
        let totalRunwayAcc = 0;
        let totalCashAcc = 0;
        let falsePositives = 0;
        let falseNegatives = 0;

        for (let i = 0; i < historicalTimeline.length - 1; i++) {
            const current = historicalTimeline[i];
            const nextActual = historicalTimeline[i + 1];

            // 1. Forecast at t_i based strictly on historical context available up to t_i
            const trailingNetBurn = Math.max(10000, current.outflows - current.inflows);
            const predictedRunway = parseFloat(Math.max(0, current.closingCash / trailingNetBurn).toFixed(2));
            const predictedClosingCash = Math.max(0, current.closingCash - trailingNetBurn);
            const predictedTax = current.inflows * 0.18; // 18% GST estimate

            const mandate = predictedRunway <= 3.0
                ? 'SURVIVAL_MANDATE'
                : trailingNetBurn / (current.inflows || 1) > 1.5
                ? 'BURN_SPIKE'
                : 'GROWTH_OPTIMIZATION';

            // 2. Measure actual outcome at t_{i+1}
            const actualCash = nextActual.closingCash;
            const actualRunway = nextActual.realizedRunwayMonths;

            const runwayError = Math.abs(predictedRunway - actualRunway);
            const cashError = Math.abs(predictedClosingCash - actualCash);

            // Accuracy % bounded [0, 100] matching canonical calibration formula
            const maxRunway = Math.max(predictedRunway, actualRunway, 1);
            const runwayAccuracy = Math.max(0, parseFloat(((1 - runwayError / maxRunway) * 100).toFixed(1)));

            const maxCash = Math.max(predictedClosingCash, actualCash, 1);
            const cashAccuracy = Math.max(0, parseFloat(((1 - cashError / maxCash) * 100).toFixed(1)));

            totalRunwayAcc += runwayAccuracy;
            totalCashAcc += cashAccuracy;

            // False positive: Flagged crisis (<3m) when actual runway turned out >= 6m
            const isFalsePositive = predictedRunway <= 3.0 && actualRunway >= 6.0;
            if (isFalsePositive) falsePositives++;

            // False negative: Failed to flag crisis when actual runway dropped <= 2m
            const isFalseNegative = predictedRunway > 4.0 && actualRunway <= 2.0;
            if (isFalseNegative) falseNegatives++;

            timeline.push({
                monthIndex: current.monthIndex,
                asOfDate: current.date,
                availableCash: current.closingCash,
                predictedRunwayMonths: predictedRunway,
                predictedClosingCash30d: predictedClosingCash,
                predictedTaxObligation: predictedTax,
                mandateIssued: mandate,
                projectedRunwayImpactDays: mandate === 'SURVIVAL_MANDATE' ? 60 : 30,
                actualRealizedCash30d: actualCash,
                actualRealizedRunway30d: actualRunway,
                runwayErrorMonths: parseFloat(runwayError.toFixed(2)),
                cashErrorAmount: parseFloat(cashError.toFixed(2)),
                predictionAccuracyPercent: parseFloat(runwayAccuracy.toFixed(1)),
                isFalsePositiveCrisis: isFalsePositive,
                isFalseNegativeMiss: isFalseNegative,
            });
        }

        const count = timeline.length;
        const avgRunwayAcc = parseFloat((totalRunwayAcc / count).toFixed(1));
        const avgCashAcc = parseFloat((totalCashAcc / count).toFixed(1));
        const fpRate = parseFloat(((falsePositives / count) * 100).toFixed(1));
        const fnRate = parseFloat(((falseNegatives / count) * 100).toFixed(1));
        const calibrationScore = parseFloat(Math.min(100, Math.max(0, (avgRunwayAcc * 0.6) + (avgCashAcc * 0.4) - (fpRate * 2) - (fnRate * 3))).toFixed(1));

        return {
            organizationId,
            totalMonthsReplayed: count,
            averageRunwayAccuracyPercent: avgRunwayAcc,
            averageCashAccuracyPercent: avgCashAcc,
            falsePositiveRatePercent: fpRate,
            falseNegativeRatePercent: fnRate,
            confidenceCalibrationScore: calibrationScore,
            overallReplayVerdict: calibrationScore >= 85
                ? 'Historical Replay Certified: High prediction accuracy and calibrated risk detection across chronological backtesting.'
                : 'Historical Calibration Required: Prediction variance exceeds target bounds.',
            timeline,
        };
    }

    /**
     * Priority 2: Deterministic Evidence-Based Trust Score
     * Derives trust purely from evidence completeness, historical accuracy, verified counts, and missing info penalties.
     */
    public calculateTrustScore(
        evidenceCount: number,
        reconciledFeedsCount: number,
        backtestedAccuracyRate: number = 95.0,
        missingInfoCount: number = 0,
        assumptionCount: number = 1
    ): TrustScoreBreakdown {
        const completeness = Math.min(100, reconciledFeedsCount * 35 + Math.min(30, evidenceCount));
        const missingInfoPenalty = missingInfoCount * 12; // Law 18 penalty
        const assumptionPenalty = Math.max(0, (assumptionCount - 1) * 5);

        const rawScore = (completeness * 0.35) + (backtestedAccuracyRate * 0.50) + (Math.min(100, evidenceCount * 2) * 0.15) - missingInfoPenalty - assumptionPenalty;
        const trustScore = Math.max(10, Math.min(100, parseFloat(rawScore.toFixed(1))));

        const calibration: 'HIGH' | 'MODERATE' | 'LOW' = trustScore >= 80 ? 'HIGH' : trustScore >= 50 ? 'MODERATE' : 'LOW';

        return {
            trustScore,
            evidenceCompleteness: parseFloat(completeness.toFixed(1)),
            historicalAccuracy: backtestedAccuracyRate,
            verifiedEvidenceCount: evidenceCount,
            missingInfoPenalty,
            assumptionPenalty,
            confidenceCalibration: calibration,
            explanation: `Trust Score ${trustScore}/100 derived from ${evidenceCount} verified bank vouchers, ${reconciledFeedsCount} reconciled bank feeds, and ${backtestedAccuracyRate}% historical recommendation accuracy.`,
        };
    }
}
