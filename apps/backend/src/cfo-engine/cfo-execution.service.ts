import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
    ActionStatus, 
    ActionPriority, 
    VerificationStatus, 
    ActionItem,
    FeedbackType,
    ExecutionMode,
    ApprovalStatus,
    Role
} from '@prisma/client';
import { CfoActionItem, AutonomousCfoOutput } from './autonomous-cfo.service';
import { CfoAutoExecutionService } from './cfo-auto-execution.service';
import { CfoExecutionIntelligenceService } from './cfo-execution-intelligence.service';

@Injectable()
export class CfoExecutionService {
    private readonly logger = new Logger(CfoExecutionService.name);

    constructor(
        private prisma: PrismaService,
        private autoExecService: CfoAutoExecutionService,
        private intelligenceService: CfoExecutionIntelligenceService
    ) {}

    /**
     * Persist generated mandates from the Autonomous CFO Engine.
     */
    async syncMandates(userId: string, organizationId: string, output: AutonomousCfoOutput) {
        const { priorityActions, opportunities, context } = output;
        const allMandates = [...priorityActions, ...opportunities];
        
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        for (const mandate of allMandates) {
            const existing = await this.prisma.actionItem.findFirst({
                where: {
                    userId,
                    title: mandate.title,
                    status: { in: [ActionStatus.OPEN, ActionStatus.IN_PROGRESS] }
                }
            });

            if (!existing) {
                const deadline = new Date();
                if (mandate.urgency === 'IMMEDIATE') deadline.setHours(deadline.getHours() + 24);
                else if (mandate.urgency === 'HIGH') deadline.setHours(deadline.getHours() + 72);
                else deadline.setDate(deadline.getDate() + 7);

                // Set verification window based on action type
                let verificationWindow = 7; // default
                if (mandate.type === 'RISK' || mandate.title.toLowerCase().includes('burn')) verificationWindow = 14;
                if (mandate.type === 'GROWTH' || mandate.title.toLowerCase().includes('revenue')) verificationWindow = 30;
                if (mandate.type === 'LIQUIDITY') verificationWindow = 10;

                // Determine Execution Tier
                const tier = await this.autoExecService.determineExecutionTier(
                    context?.confidence || 50,
                    context?.complianceScore || 0,
                    false, // isUnderReview
                    mandate.metricEffect?.runwayChange || 0,
                    user.role,
                    userId,
                    mandate.type
                );

                await this.prisma.actionItem.create({
                    data: {
                        userId,
                        organizationId,
                        title: mandate.title,
                        description: mandate.reasoning,
                        priority: mandate.urgency as ActionPriority,
                        status: ActionStatus.OPEN,
                        dueDate: deadline,
                        actionType: mandate.type,
                        expectedImpact: mandate.metricEffect?.burnChange || 0,
                        verificationWindow,
                        isExecutable: mandate.isExecutable || false,
                        executionMode: tier,
                        executionPayload: mandate.executionPayload || {},
                        approvalStatus: tier === ExecutionMode.APPROVAL_REQUIRED ? ApprovalStatus.PENDING_APPROVAL : ApprovalStatus.NOT_APPLICABLE
                    }
                });
            }
        }
    }

    /**
     * Founder "claims" an action as done.
     */
    async claimAction(actionId: string, overrideReason?: string) {
        return this.prisma.actionItem.update({
            where: { id: actionId },
            data: {
                status: ActionStatus.DONE,
                claimedAt: new Date(),
                completedAt: new Date(),
                overrideReason,
                verificationStatus: VerificationStatus.UNVERIFIED,
                verificationConfidence: 10, // Base level for claiming
                verificationNotes: 'Claimed by founder. Monitoring data for signal...'
            }
        });
    }

    /**
     * Hybrid Verification: Compare claimed actions against actual financial signals.
     */
    async verifyExecution(userId: string) {
        const claimedActions = await this.prisma.actionItem.findMany({
            where: {
                userId,
                status: ActionStatus.DONE,
                // Only verify if not already "CONTRADICTED" or "VERIFIED" with high confidence
                OR: [
                    { verificationStatus: VerificationStatus.UNVERIFIED },
                    { verificationConfidence: { lt: 90 } }
                ]
            }
        });

        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) return;

        for (const action of claimedActions) {
            const daysSinceClaim = Math.floor((Date.now() - new Date(action.claimedAt!).getTime()) / (1000 * 60 * 60 * 24));
            const isWithinWindow = daysSinceClaim <= action.verificationWindow;

            let confidence = action.verificationConfidence;
            let status = action.verificationStatus;
            let notes = action.verificationNotes || '';

            // Signal Detection
            if (action.actionType === 'RISK' || action.title.includes('Burn')) {
                const snapshots = await this.prisma.financialSnapshot.findMany({
                    where: { organizationId: profile.organizationId },
                    orderBy: { snapshotDate: 'desc' },
                    take: 2
                });

                if (snapshots.length === 2) {
                    const prevBurn = Number(snapshots[1].burn);
                    const currentBurn = Number(snapshots[0].burn);
                    const burnReduction = prevBurn > 0 ? (prevBurn - currentBurn) / prevBurn : 0;

                    if (burnReduction > 0.15) {
                        confidence = 90;
                        status = VerificationStatus.VERIFIED;
                        notes = `Your burn dropped ${Math.round(burnReduction * 100)}% -> strong validation.`;
                    } else if (burnReduction > 0.05) {
                        confidence = 60;
                        status = VerificationStatus.VERIFIED;
                        notes = `Burn dropped ${Math.round(burnReduction * 100)}% -> moderate signal.`;
                    } else if (burnReduction > 0) {
                        confidence = 30;
                        status = VerificationStatus.UNVERIFIED;
                        notes = `Slight drop in burn (${Math.round(burnReduction * 100)}%) -> weak signal.`;
                    } else if (currentBurn > prevBurn * 1.1) {
                        // Strong opposite signal
                        if (!isWithinWindow) {
                            confidence = 100; // Confident it is wrong
                            status = VerificationStatus.CONTRADICTED;
                            notes = `Data shows burn increased by ${Math.round((currentBurn/prevBurn - 1) * 100)}% after claim window.`;
                        } else {
                            confidence = 20;
                            status = VerificationStatus.UNVERIFIED;
                            notes = `Monitoring: Burn increased slightly, but still within verification window.`;
                        }
                    }
                }
            } else if (action.actionType === 'GROWTH' || action.title.includes('Revenue')) {
                // Growth verification logic...
                confidence = 20; // Stub for now
                notes = 'Monitoring revenue inflows for verification signal...';
            }

            // Never mark CONTRADICTED early unless it's an extreme outlier
            if (isWithinWindow && status === VerificationStatus.CONTRADICTED) {
                 status = VerificationStatus.UNVERIFIED;
                 confidence = 10;
                 notes += ' (Verification window still open, holding penalty)';
            }

            await this.prisma.actionItem.update({
                where: { id: action.id },
                data: {
                    verificationStatus: status,
                    verificationConfidence: confidence,
                    verificationNotes: notes,
                    lastVerifiedAt: new Date()
                }
            });

            if (status === VerificationStatus.VERIFIED && confidence >= 80) {
                await this.intelligenceService.evaluateExecution(action.id);
            }
        }

        await this.calculateComplianceScore(userId);
    }

    async calculateComplianceScore(userId: string) {
        const actions = await this.prisma.actionItem.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        if (actions.length === 0) return 100;

        let totalWeight = 0;
        let scoreSubtotal = 0;

        for (const action of actions) {
            const urgencyWeight = action.priority === 'IMMEDIATE' ? 3 : action.priority === 'HIGH' ? 2 : 1;
            totalWeight += urgencyWeight;

            let actionScore = 0;

            if (action.status === ActionStatus.DONE) {
                if (action.verificationStatus === VerificationStatus.VERIFIED) {
                    // Score depends on confidence
                    actionScore = action.verificationConfidence >= 70 ? 100 : 
                                 action.verificationConfidence >= 30 ? 90 : 80;
                } else if (action.verificationStatus === VerificationStatus.CONTRADICTED) {
                    // FREEZE PENALTY IF UNDER REVIEW
                    if (action.isUnderReview) {
                        actionScore = 70; // Treat as unverified/pending
                    } else {
                        actionScore = -50; 
                    }
                } else {
                    // UNVERIFIED
                    actionScore = 70; // Trusting but cautious
                }
            } else if (action.dueDate && action.dueDate < new Date()) {
                actionScore = 0; // Missed
            } else {
                actionScore = 100; // Not due or still pending
            }

            scoreSubtotal += actionScore * urgencyWeight;
        }

        const finalScore = Math.max(0, Math.min(100, Math.round(scoreSubtotal / totalWeight)));

        await this.prisma.startupProfile.update({
            where: { userId },
            data: { complianceScore: finalScore, lastScoreUpdate: new Date() }
        });

        return finalScore;
    }

    /**
     * Founder submits feedback/disagreement on a verification.
     */
    async submitFeedback(userId: string, actionId: string, type: FeedbackType, message: string) {
        // Create feedback log
        await this.prisma.actionFeedback.create({
            data: {
                userId,
                actionId,
                type,
                message
            }
        });

        // Update action item state
        const updated = await this.prisma.actionItem.update({
            where: { id: actionId },
            data: {
                isUnderReview: true,
                verificationConfidence: 0, // Reset confidence as we are unsure
                verificationNotes: `Founder flagged this as ${type}: "${message}". System is re-evaluating...`
            }
        });

        // Recalculate score immediately to reflect frozen penalty
        await this.calculateComplianceScore(userId);
        
        return updated;
    }

    /**
     * Determine escalation level for UI friction.
     */
    async getEscalationLevel(userId: string): Promise<number> {
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) return 0;

        const score = profile.complianceScore;
        const runwayResult = await this.prisma.cfoStateSnapshot.findFirst({
            where: { organizationId: profile.organizationId },
            orderBy: { generatedAt: 'desc' }
        });

        const runway = runwayResult?.runwayMonths || 12;

        // Level 3: Survival Mode
        if (runway < 2) return 3;

        // Level 2: Poor Compliance or Low Runway
        if (score < 50 || runway < 4) return 2;

        // Level 1: Warning
        if (score < 75 || runway < 6) return 1;

        return 0;
    }
}
