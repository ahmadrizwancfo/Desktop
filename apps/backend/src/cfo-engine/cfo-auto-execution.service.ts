import { Injectable, Logger, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
    ActionStatus, 
    ActionItem, 
    Role, 
    ApprovalStatus, 
    ExecutionMode,
    ActionPriority
} from '@prisma/client';

import { CfoContextService } from './cfo-context.service';
import { CfoAutoPilotService } from './cfo-auto-pilot.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class CfoAutoExecutionService {
    private readonly logger = new Logger(CfoAutoExecutionService.name);

    constructor(
        private prisma: PrismaService,
        private contextEngine: CfoContextService,
        @Inject(forwardRef(() => CfoAutoPilotService))
        private autoPilot: CfoAutoPilotService
    ) {}

    /**
     * The Master Execution Gate.
     * Determines how an action can be applied based on trust levels and risk.
     */
    async determineExecutionTier(
        confidence: number, 
        complianceScore: number, 
        isUnderReview: boolean,
        runwayImpact: number, 
        userRole: Role,
        userId: string,
        category: string
    ): Promise<ExecutionMode> {
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) return ExecutionMode.SUGGESTED;

        const globalAccuracy = profile.cfoAccuracyScore;
        const totalActions = profile.totalEvaluatedActions;
        const isDowngraded = profile.isTrustZoneDowngraded;
        const caution = profile.cautionMultiplier || 1.0;

        // Fetch Category Performance
        const catPerf = await this.prisma.cfoCategoryPerformance.findUnique({
            where: { organizationId_category: { organizationId: profile.organizationId, category } }
        });

        // 1. Adaptive Friction Logic (System-wide)
        let systemAllowsOneClick = true;
        if (totalActions >= 5) {
            // Hysteresis Loop
            if (isDowngraded) {
                if (globalAccuracy < 80) systemAllowsOneClick = false;
            } else {
                if (globalAccuracy < 75) systemAllowsOneClick = false;
            }
        }

        // Apply Global Caution (Threshold Scaling)
        const adjustedConfidenceThreshold = 85 * caution;
        const adjustedComplianceThreshold = 85 * caution;

        // 2. Adaptive Suppression Logic (Category-specific)
        if (catPerf?.isSuppressed) {
            return ExecutionMode.SUGGESTED; // Force manual review for suppressed strategies
        }

        // Tier 3: Internal Downgrade
        if (confidence < 70 || isUnderReview || complianceScore < 75 || !systemAllowsOneClick) {
            if (!systemAllowsOneClick && confidence >= 85) {
                return ExecutionMode.REVIEW_REQUIRED; // Downgraded due to accuracy but reviewable
            }
            return ExecutionMode.SUGGESTED;
        }

        // High Risk Check: Runway drop > 10%
        if (runwayImpact < -10 && userRole !== Role.ADMIN) {
            return ExecutionMode.APPROVAL_REQUIRED;
        }

        // Tier 1: Trust Zone (Adjusted by caution)
        if (confidence >= adjustedConfidenceThreshold && complianceScore >= adjustedComplianceThreshold && systemAllowsOneClick) {
            return ExecutionMode.ONE_CLICK_APPLY;
        }

        // Tier 2: Review/Confirm Zone
        return ExecutionMode.REVIEW_REQUIRED;
    }

    /**
     * Apply an executable action, mutating the startup profile state.
     */
    async applyAction(userId: string, actionId: string) {
        const action = await this.prisma.actionItem.findUnique({
            where: { id: actionId },
            include: { executionLogs: true }
        });

        if (!action || !action.isExecutable) {
            throw new ConflictException('Action not found or not executable.');
        }

        if (action.status === ActionStatus.DONE) {
            throw new ConflictException('Action already executed.');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ForbiddenException('User not found.');

        // Re-check approval if required
        if (action.executionMode === ExecutionMode.APPROVAL_REQUIRED && action.approvalStatus !== ApprovalStatus.APPROVED) {
            // Check if user is ADMIN, then auto-approve
            if (user.role !== Role.ADMIN) {
                throw new ForbiddenException('ADMIN approval required for this high-risk action.');
            }
        }

        const profile = await this.prisma.startupProfile.findUnique({
            where: { organizationId: action.organizationId }
        });

        if (!profile) throw new ConflictException('Startup profile not found.');

        const payload = action.executionPayload as any;

        // 1. Versioning: Store current state for rollback
        await this.prisma.startupProfileVersion.create({
            data: {
                profileId: profile.id,
                userId,
                source: 'AUTO_EXECUTION',
                changes: {
                    targetBurn: profile.targetBurn,
                    hiringFreeze: profile.hiringFreeze,
                    growthMode: profile.growthMode,
                    marketingMultiplier: profile.marketingMultiplier,
                    salesMultiplier: profile.salesMultiplier
                }
            }
        });

        // 2. State Mutation
        const updatedProfile = await this.prisma.startupProfile.update({
            where: { id: profile.id },
            data: {
                targetBurn: payload.targetBurn ?? profile.targetBurn,
                hiringFreeze: payload.hiringFreeze ?? profile.hiringFreeze,
                growthMode: payload.growthMode ?? profile.growthMode,
                marketingMultiplier: payload.marketingMultiplier ?? profile.marketingMultiplier,
                salesMultiplier: payload.salesMultiplier ?? profile.salesMultiplier,
            }
        });

        // 3. Execution Log
        await this.prisma.executionLog.create({
            data: {
                actionId: action.id,
                status: 'SUCCESS',
                impactExpected: {
                    burnChange: action.expectedImpact,
                    target: payload
                },
                explanation: {
                    title: `Action: ${action.title}`,
                    primaryDriver: `System-driven optimization for category: ${action.title.split(' ')[0]}`,
                    contributingFactors: [
                        `Runway impact: +${action.expectedImpact} months`,
                        `Confidence: ${action.verificationConfidence}%`,
                        `Verified in Shadow Mode: ${action.seenInShadowMode}`
                    ],
                    confidence: action.verificationConfidence
                }
            }
        });

        // 4. Update Action Status
        await this.prisma.actionItem.update({
            where: { id: action.id },
            data: {
                status: ActionStatus.DONE,
                verificationStatus: 'VERIFIED', // System-applied actions are auto-verified
                verificationConfidence: 100,
                appliedAt: new Date(),
                appliedBy: userId,
                completionNotes: `Auto-executed by ${user.role}. Projections updated.`
            }
        });

        // 5. Intelligence Feedback (v2.2)
        await this.prisma.decisionFeedback.create({
            data: {
                organizationId: action.organizationId,
                decisionId: action.id,
                decisionType: action.actionType || 'GENERIC_OPTIMIZATION',
                accepted: true,
                rolledBack: false
            }
        });

        // --- NEW: Capture Context Snapshot ---
        await this.contextEngine.captureDecisionContext(action.id, action.organizationId);

        // --- v2.1 Safe Mode Recalibration ---
        await this.autoPilot.trackManualSuccess(action.organizationId);

        return updatedProfile;
    }

    /**
     * Rollback a previous execution.
     */
    async rollbackExecution(userId: string, actionId: string) {
        const action = await this.prisma.actionItem.findUnique({
            where: { id: actionId },
            include: { executionLogs: true }
        });

        if (!action || action.status !== ActionStatus.DONE) {
            throw new ConflictException('Action not in a reversible state.');
        }

        const profile = await this.prisma.startupProfile.findUnique({
            where: { organizationId: action.organizationId }
        });

        if (!profile) throw new ConflictException('Profile not found.');

        // Get latest version
        const lastVersion = await this.prisma.startupProfileVersion.findFirst({
            where: { profileId: profile.id },
            orderBy: { createdAt: 'desc' }
        });

        if (!lastVersion) throw new ConflictException('No previous version found for rollback.');

        const prevData = lastVersion.changes as any;

        // Revert profile
        await this.prisma.startupProfile.update({
            where: { id: profile.id },
            data: {
                targetBurn: prevData.targetBurn,
                hiringFreeze: prevData.hiringFreeze,
                growthMode: prevData.growthMode,
                marketingMultiplier: prevData.marketingMultiplier,
                salesMultiplier: prevData.salesMultiplier
            }
        });

        // Update action and log
        await this.prisma.executionLog.create({
            data: {
                actionId: action.id,
                status: 'REVERTED',
                metadata: { revertedAt: new Date(), revertedBy: userId }
            }
        });

        return this.prisma.actionItem.update({
            where: { id: action.id },
            data: {
                status: ActionStatus.OPEN,
                appliedAt: null,
                appliedBy: null
            }
        });
    }

    /**
     * Pend an action for approval.
     */
    async requestApproval(userId: string, actionId: string) {
        return this.prisma.actionItem.update({
            where: { id: actionId },
            data: {
                approvalStatus: ApprovalStatus.PENDING_APPROVAL,
                executionMode: ExecutionMode.APPROVAL_REQUIRED
            }
        });
    }
}
