import { Injectable, Logger } from '@nestjs/common';
import { DecisionQuality, OutcomeClassification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CfoContextService } from './cfo-context.service';

import { CfoAutoPilotService } from './cfo-auto-pilot.service';

@Injectable()
export class CfoExecutionIntelligenceService {
    private readonly logger = new Logger(CfoExecutionIntelligenceService.name);

    constructor(
        private prisma: PrismaService,
        private contextEngine: CfoContextService,
        private autoPilot: CfoAutoPilotService
    ) {}

    /**
     * Master outcome evaluator.
     * Compares projection vs reality to update CFO accuracy scores.
     */
    async evaluateExecution(actionId: string) {
        const action = await this.prisma.actionItem.findUnique({
            where: { id: actionId },
            include: { 
                executionLogs: { 
                    where: { status: 'SUCCESS' }, 
                    orderBy: { executedAt: 'desc' }, 
                    take: 1 
                } 
            }
        });

        if (!action || action.executionLogs.length === 0) return;
        const log = action.executionLogs[0];
        const expected = log.impactExpected as any;

        // 1. Calculate Actual Impact
        const actual = await this.calculateActualImpact(action);
        if (!actual) return;

        // 2. Score Accuracy (0-100) & Quality
        const { score: rawScore, quality: rawQuality, delta, failureReason } = this.scoreDecision(expected, actual);
        
        // --- NEW: Context-Aware Classification ---
        // Assume processScore is 100 for verified triggers (as verification itself is the logic check)
        const processScore = 100; 
        const { classification, penaltyMultiplier, decisionQuality } = this.contextEngine.classifyOutcome(expected, actual, processScore);

        // Adjust score for global accuracy (don't penalize good process for bad market)
        const adjustedScore = decisionQuality === DecisionQuality.GOOD ? Math.max(rawScore, 85) : (rawScore * penaltyMultiplier);

        // 3. Persist Evaluation
        await this.prisma.executionLog.update({
            where: { id: log.id },
            data: {
                impactActual: actual,
                accuracyScore: rawScore,
                decisionQuality,
                classification,
                impactDelta: delta,
                failureReason
            }
        });

        // 4. Update Trust Loops
        const category = action.actionType || 'General';
        if (action.userId) {
            await this.updateGlobalAccuracy(action.userId, adjustedScore);
        }
        await this.updateCategoryPerformance(action.organizationId, category, adjustedScore);

        // Update Global Caution if needed
        await this.contextEngine.adjustGlobalCaution(action.organizationId);

        // --- NEW: Safety Backstop for Auto-Pilot ---
        await this.autoPilot.handleFailureBackstop(log.id);

        this.logger.log(`Evaluated ${category}: Accuracy ${rawScore}% (Adjusted: ${adjustedScore.toFixed(0)}%), Classification: ${classification}`);
    }

    private async calculateActualImpact(action: any) {
        // Fetch snapshots to see delta
        const snapshots = await this.prisma.startupProfileSnapshot.findMany({
            where: { startupProfile: { organizationId: action.organizationId } },
            orderBy: { snapshotAt: 'desc' },
            take: 2
        });

        if (snapshots.length < 2) return null;

        const current = snapshots[0];
        const prev = snapshots[1];

        // Burn Change (monthlyExpenses - monthlyRevenue)
        const burnBefore = Number(prev.monthlyExpenses) - Number(prev.monthlyRevenue);
        const burnAfter = Number(current.monthlyExpenses) - Number(current.monthlyRevenue);
        const burnReductionActual = burnBefore > 0 ? (burnBefore - burnAfter) / burnBefore : 0;

        // Runway Change
        const runwayBefore = Number(prev.projectedRunway);
        const runwayAfter = Number(current.projectedRunway);
        const runwayDelta = runwayAfter - runwayBefore;

        return {
            burnReduction: burnReductionActual,
            runwayMonthsDelta: runwayDelta,
            cashDelta: Number(current.cashInBank) - Number(prev.cashInBank)
        };
    }

    private scoreDecision(expected: any, actual: any) {
        let score = 0;
        let quality: DecisionQuality = DecisionQuality.NEUTRAL;
        let delta = 0;
        let failureReason: string | null = null;

        // Scoring Logic: Burn Reduction
        if (expected.burnChange) {
            const expReduction = Math.abs(expected.burnChange); // e.g., 0.2
            const actReduction = actual.burnReduction; // e.g., 0.18
            
            delta = actReduction - expReduction;
            
            // Accuracy based on proximity
            const proximity = 1 - Math.abs(delta) / (expReduction || 1);
            score = Math.max(0, Math.min(100, proximity * 100));

            // Opposite result penalty
            if (actReduction < 0 && expReduction > 0) {
                score = 0;
                quality = DecisionQuality.BAD;
                failureReason = "Burn increased despite planned reduction. Potential delayed billing or external cost surge.";
            } else if (score >= 80) {
                quality = DecisionQuality.GOOD;
            } else if (score < 50) {
                quality = DecisionQuality.BAD;
                failureReason = "High deviation from target. Operational execution likely lagged.";
            }
        }

        return { score, quality, delta, failureReason };
    }

    private async updateGlobalAccuracy(userId: string, latestScore: number) {
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) return;

        // Rolling Average (Last 20)
        let newAccuracy = (profile.cfoAccuracyScore * 0.9) + (latestScore * 0.1);
        const newCount = profile.totalEvaluatedActions + 1;

        // Hysteresis Logic
        let isDowngraded = profile.isTrustZoneDowngraded;
        if (newCount >= 5) {
            if (newAccuracy < 75) isDowngraded = true;
            if (newAccuracy > 80) isDowngraded = false;
        }

        await this.prisma.startupProfile.update({
            where: { userId },
            data: {
                cfoAccuracyScore: newAccuracy,
                totalEvaluatedActions: newCount,
                isTrustZoneDowngraded: isDowngraded,
                lastAccuracyUpdate: new Date()
            }
        });
    }

    private async updateCategoryPerformance(orgId: string, category: string, score: number) {
        const perf = await this.prisma.cfoCategoryPerformance.upsert({
            where: { organizationId_category: { organizationId: orgId, category } },
            create: { organizationId: orgId, category, recentAccuracy: [score] },
            update: { lastUpdated: new Date() }
        });

        const accuracyHistory = (perf.recentAccuracy as number[] || []);
        accuracyHistory.push(score);
        if (accuracyHistory.length > 10) accuracyHistory.shift();

        // Failure Streak Calculation
        let failureStreak = perf.failureStreak;
        if (score < 40) failureStreak++;
        else failureStreak = 0;

        const avgAccuracy = accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length;

        // Suppression Logic
        const isSuppressed = failureStreak >= 3 && avgAccuracy < 40;

        await this.prisma.cfoCategoryPerformance.update({
            where: { id: perf.id },
            data: {
                recentAccuracy: accuracyHistory,
                failureStreak,
                isSuppressed,
                confidenceScore: avgAccuracy
            }
        });
    }
}
