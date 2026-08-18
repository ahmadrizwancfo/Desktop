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
}
