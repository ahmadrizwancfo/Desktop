import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutcomeClassification, DecisionQuality } from '@prisma/client';

@Injectable()
export class CfoContextService {
    private readonly logger = new Logger(CfoContextService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Captures the financial context at the moment of decision execution.
     */
    async captureDecisionContext(actionId: string, organizationId: string) {
        const startupProfile = await this.prisma.startupProfile.findUnique({
            where: { organizationId }
        });

        if (!startupProfile) return null;

        const context = {
            runway: startupProfile.cfoAccuracyScore, // Using existing metrics
            burnRate: Number(startupProfile.monthlyExpenses),
            revenue: Number(startupProfile.monthlyRevenue),
            growthRate: 0, // Placeholder for trend calculation
            marketCondition: 'NEUTRAL',
            confidenceScore: startupProfile.cfoAccuracyScore,
            timestamp: new Date().toISOString()
        };

        // Find the latest execution log for this action that hasn't been snapshotted
        const log = await this.prisma.executionLog.findFirst({
            where: { actionId, status: 'SUCCESS' },
            orderBy: { executedAt: 'desc' }
        });

        if (log) {
            await this.prisma.executionLog.update({
                where: { id: log.id },
                data: { contextSnapshot: context }
            });
            this.logger.log(`Captured context snapshot for Action ${actionId}`);
        }

        return context;
    }

    /**
     * Logic to distinguish between bad decisions and external factors.
     */
    classifyOutcome(expected: any, actual: any, processScore: number): {
        classification: OutcomeClassification;
        decisionQuality: DecisionQuality;
        penaltyMultiplier: number;
    } {
        const outcomeAccuracy = this.calculateAccuracy(expected, actual);
        
        // 1. GOOD DECISION, GOOD OUTCOME (The Win)
        if (processScore >= 80 && outcomeAccuracy >= 80) {
            return {
                classification: OutcomeClassification.GOOD_DECISION_GOOD_OUTCOME,
                decisionQuality: DecisionQuality.GOOD,
                penaltyMultiplier: 1.0 // Normal boost
            };
        }

        // 2. GOOD DECISION, BAD OUTCOME (The "External Factor" case)
        if (processScore >= 80 && outcomeAccuracy < 60) {
            return {
                classification: OutcomeClassification.GOOD_DECISION_BAD_OUTCOME,
                decisionQuality: DecisionQuality.GOOD,
                penaltyMultiplier: 0.2 // Minimal accuracy penalty, we trust the process
            };
        }

        // 3. BAD DECISION, BAD OUTCOME (System Failure)
        if (processScore < 50 && outcomeAccuracy < 60) {
            return {
                classification: OutcomeClassification.BAD_DECISION_BAD_OUTCOME,
                decisionQuality: DecisionQuality.BAD,
                penaltyMultiplier: 1.5 // Heavy penalty
            };
        }

        // 4. BAD DECISION, GOOD OUTCOME (Lucky)
        if (processScore < 50 && outcomeAccuracy >= 80) {
            return {
                classification: OutcomeClassification.BAD_DECISION_GOOD_OUTCOME,
                decisionQuality: DecisionQuality.NEUTRAL,
                penaltyMultiplier: 0.5 // High variation, don't reward luck too much
            };
        }

        return {
            classification: OutcomeClassification.GOOD_DECISION_GOOD_OUTCOME, // Default
            decisionQuality: DecisionQuality.NEUTRAL,
            penaltyMultiplier: 1.0
        };
    }

    /**
     * Adjust global caution based on repeating 'GOOD_DECISION_BAD_OUTCOME'
     */
    async adjustGlobalCaution(organizationId: string) {
        const recentLogs = await this.prisma.executionLog.findMany({
            where: { 
                profile: { organizationId },
                classification: OutcomeClassification.GOOD_DECISION_BAD_OUTCOME
            },
            orderBy: { executedAt: 'desc' },
            take: 3
        });

        // If high-quality decisions keep failing (streak of 3), increase global caution
        if (recentLogs.length >= 3) {
            const profile = await this.prisma.startupProfile.findUnique({ where: { organizationId } });
            if (profile) {
                const newCaution = Math.min(2.0, profile.cautionMultiplier + 0.1);
                const newUncertainty = Math.min(100, profile.envUncertaintyScore + 15);
                
                await this.prisma.startupProfile.update({
                    where: { id: profile.id },
                    data: { 
                        cautionMultiplier: newCaution,
                        envUncertaintyScore: newUncertainty
                    }
                });
                this.logger.warn(`High variance detected. Increasing global caution for org ${organizationId} to ${newCaution}`);
            }
        }
    }

    private calculateAccuracy(expected: any, actual: any): number {
        if (!expected.burnChange) return 100;
        const delta = Math.abs(actual.burnReduction - Math.abs(expected.burnChange));
        return Math.max(0, 100 - (delta * 500)); // Rough accuracy score
    }
}
