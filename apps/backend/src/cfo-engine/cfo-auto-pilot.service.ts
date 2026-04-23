import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
    AutoPilotMode, 
    AutoPilotRisk, 
    ActionItem, 
    DecisionQuality,
    OutcomeClassification,
    ActionStatus,
    AutoPilotLogStatus
} from '@prisma/client';
import { CfoAutoExecutionService } from './cfo-auto-execution.service';
import { TrustLanguageService } from './trust-language.service';
import { CfoStateService } from './cfo-state.service';
import { SmartNotificationsService } from '../notifications/smart-notifications.service';
import { SENSITIVITY_CONFIGS, CFO_GUARDRAILS } from './cfo-safety.config';

@Injectable()
export class CfoAutoPilotService {
    private readonly logger = new Logger(CfoAutoPilotService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => CfoAutoExecutionService))
        private autoExecution: CfoAutoExecutionService,
        private trustLanguage: TrustLanguageService,
        @Inject(forwardRef(() => CfoStateService))
        private stateService: CfoStateService,
        @Inject(forwardRef(() => SmartNotificationsService))
        private notifications: SmartNotificationsService
    ) {}

    /**
     * The Intelligent Filter.
     * Evaluates if an action is safe enough for Auto-Pilot.
     */
    async evaluateEligibility(actionId: string): Promise<{
        isEligible: boolean;
        riskLevel: AutoPilotRisk;
        reason?: string;
    }> {
        const action = await this.prisma.actionItem.findUnique({
            where: { id: actionId },
            include: { organization: { include: { startupProfiles: true } } }
        });

        if (!action) return { isEligible: false, riskLevel: AutoPilotRisk.HIGH, reason: 'Action not found' };
        
        const profile = action.organization.startupProfiles?.[0];
        if (!profile) return { isEligible: false, riskLevel: AutoPilotRisk.HIGH, reason: 'No profile found' };

        // 1. Classify Risk
        const riskLevel = this.classifyRisk(action);
        const impact = Math.abs(Number(action.expectedImpact));
        
        // 2. 11-Point Control Architecture Check
        // 🌪️ SENSITIVITY CONFIGURATION (v2.2)
        const sensitivity = profile.decisionSensitivity as any;
        const config = SENSITIVITY_CONFIGS[sensitivity] || SENSITIVITY_CONFIGS.BALANCED;

        // 🌪️ ROLLBACK-DRIVEN SAFE MODE LOCK (FINAL DECISION)
        const rollbackRate = profile.rollbackRate || 0;
        const isSafeModeTriggered = rollbackRate > config.rollbackTolerance;

        // 🌪️ GUARDRAIL CHECKS (v2.2)
        const isManualOnlyCategory = CFO_GUARDRAILS.MANUAL_ONLY_CATEGORIES.some(cat => 
            action.title.toLowerCase().includes(cat.toLowerCase()) || 
            action.description?.toLowerCase().includes(cat.toLowerCase())
        );
        const isManualOnlyActionType = CFO_GUARDRAILS.MANUAL_ONLY_ACTION_TYPES.includes(action.actionType || '');

        const checks = {
            autoPilotOn: profile.autoPilotMode !== AutoPilotMode.OFF && !isSafeModeTriggered,
            systemStable: !profile.isTrustZoneDowngraded,
            lowRisk: riskLevel === AutoPilotRisk.LOW,
            seenBefore: action.seenInShadowMode === true,
            highConfidence: action.verificationConfidence >= config.minConfidence,
            highSystemAccuracy: profile.cfoAccuracyScore > 80,
            highCategoryConfidence: true,
            underUserLimit: impact <= profile.maxAutoBurnImpact,
            notGuardrailBreach: !isManualOnlyCategory && !isManualOnlyActionType,
            notUnderReview: !action.isUnderReview,
            envStable: profile.envUncertaintyScore <= (config.triggerStrictness === 'HIGH' ? 30 : config.triggerStrictness === 'MEDIUM' ? 45 : 60)
        };

        if (isSafeModeTriggered) {
             this.logger.warn(`SAFE_MODE FORCED for action ${actionId} due to rollback rate ${rollbackRate}`);
        }

        const isEligible = Object.values(checks).every(v => v === true);
        
        let reason = '';
        if (!isEligible) {
            reason = Object.entries(checks)
                .filter(([_, v]) => !v)
                .map(([k]) => k)
                .join(', ');
            
            if (isSafeModeTriggered) reason = `SAFE_MODE_ACTIVE (${reason})`;
        }

        return { isEligible, riskLevel, reason };
    }

    /**
     * Main Execution Loop logic. Schedules actions instead of executing.
     */
    async processAutoPilot(organizationId: string) {
        const profile = await this.prisma.startupProfile.findUnique({ 
            where: { organizationId },
            include: { user: true }
        });

        if (!profile) return;

        // 🌪️ ENVIRONMENT UNCERTAINTY LOCK (FINAL DECISION)
        if (profile.envUncertaintyScore > 40) {
            const msg = this.trustLanguage.autoPilotDisabledMessage('uncertainty');
            await this.disableAutoPilot(profile.id, `${msg.headline} ${msg.body}`);
            return;
        }

        const actions = await this.prisma.actionItem.findMany({
            where: { 
                organizationId, 
                status: ActionStatus.OPEN,
                isExecutable: true 
            }
        });

        for (const action of actions) {
            const { isEligible, riskLevel, reason } = await this.evaluateEligibility(action.id);

            // A. Shadow Mode Logic / Tag as "Seen"
            if (!action.seenInShadowMode) {
                if (isEligible || profile.shadowModeEnabled) {
                    const msg = this.trustLanguage.shadowModeMessage(action.title, Number(action.expectedImpact));
                    await this.logAutoPilotAction(profile.id, action.id, riskLevel, true, `${msg.headline} ${msg.body}`, AutoPilotLogStatus.SIMULATED);
                    await this.prisma.actionItem.update({ where: { id: action.id }, data: { seenInShadowMode: true } });
                }
                continue; // "NEVER execute unseen actions"
            }

            // B. Scheduled Execution
            if (isEligible) {
                // Check if already pending
                const existing = await this.prisma.autoPilotLog.findFirst({
                    where: { actionId: action.id, status: AutoPilotLogStatus.PENDING }
                });

                if (!existing) {
                    const delay = profile.autoPilotDelayMinutes || 30;
                    const executeAt = new Date();
                    executeAt.setMinutes(executeAt.getMinutes() + delay);

                    const msg = this.trustLanguage.pendingExecutionMessage(action.title, delay, Number(action.expectedImpact));
                    await this.logAutoPilotAction(profile.id, action.id, riskLevel, false, `${msg.headline} ${msg.body}`, AutoPilotLogStatus.PENDING, executeAt);
                    this.logger.log(`Auto-Pilot scheduled action ${action.id} for ${executeAt}`);
                    // Notify user (placeholder)
                    await this.notifyPreExecution(profile.id, action.title, delay);
                }
            }
        }
    }

    /**
     * Final Approval and Application. Called by a cron.
     */
    async finalizeAutoExecution(logId: string) {
        const log = await this.prisma.autoPilotLog.findUnique({
            where: { id: logId },
            include: { profile: { include: { user: true } }, action: true }
        });

        if (!log || log.status !== AutoPilotLogStatus.PENDING) return;

        // Final Permission Check (Conditions might have changed during window)
        const { isEligible, reason } = await this.evaluateEligibility(log.actionId);
        
        if (!isEligible) {
            const reasons = reason ? reason.split(', ') : ['safety re-check failed'];
            const msg = this.trustLanguage.blockedActionMessage(log.action.title, reasons);
            await this.prisma.autoPilotLog.update({
                where: { id: log.id },
                data: { status: AutoPilotLogStatus.CANCELLED, reason: `${msg.headline} ${msg.body}` }
            });
            return;
        }

        try {
            await this.autoExecution.applyAction(log.profile.userId, log.actionId);
            const msg = this.trustLanguage.autoExecutedMessage(log.action.title, Number(log.action.expectedImpact));
            await this.prisma.autoPilotLog.update({
                where: { id: log.id },
                data: { 
                    status: AutoPilotLogStatus.EXECUTED, 
                    executedAt: new Date(),
                    reason: `${msg.headline} ${msg.body}`,
                    metadata: {
                        whatChanged: log.action.description,
                        whySafe: log.reason, // Stores original schedule reason
                        expectedOutcome: log.action.expectedImpact
                    }
                }
            });
            
            // Update stats
            await this.prisma.startupProfile.update({
                where: { id: log.profileId },
                data: { totalAutoActions: { increment: 1 } }
            });

            this.logger.log(`Auto-Pilot successfully executed action ${log.actionId}`);
        } catch (err) {
            await this.prisma.autoPilotLog.update({
                where: { id: log.id },
                data: { status: AutoPilotLogStatus.CANCELLED, reason: `Execution failed: ${err.message}` }
            });
        }
    }

    async handleRollback(actionId: string) {
        const log = await this.prisma.autoPilotLog.findFirst({
            where: { actionId, status: AutoPilotLogStatus.EXECUTED }
        });

        if (log) {
            const profile = await this.prisma.startupProfile.findUnique({ where: { id: log.profileId } });
            if (profile) {
                const rolledBack = profile.rolledBackAutoActions + 1;
                const total = profile.totalAutoActions;
                const rate = total > 0 ? rolledBack / total : 0;

                const data: any = {
                    rolledBackAutoActions: rolledBack,
                    rollbackRate: rate
                };

                // Rollback Rate Lock logic (v2.1)
                const isEnteringSafeMode = rate > 0.20 && profile.autoPilotMode !== AutoPilotMode.SAFE_MODE;

                if (isEnteringSafeMode) {
                    data.autoPilotMode = AutoPilotMode.SAFE_MODE;
                    data.rollbackRecoveryCount = 0; // Reset recovery on new rollback
                    this.logger.warn(`Rollback rate > 20% for profile ${profile.id}. Downgrading to SAFE_MODE.`);
                    
                    // 🚨 Alert Severity (Safe Mode Notifications v2.1)
                    this.notifications.send({
                        userId: profile.userId,
                        title: '⚠️ CRITICAL: Safe Mode Entered',
                        message: 'FounderCFO has entered Safe Mode due to elevated rollback risk. Automation is paused to protect decision integrity.',
                        type: 'ERROR',
                        channels: ['IN_APP', 'EMAIL', 'WHATSAPP']
                    }).catch(e => this.logger.error(`Failed to send Safe Mode alert: ${e.message}`));
                } else if (rate > 0.20) {
                    // Already in safe mode, just reset progress
                    data.rollbackRecoveryCount = 0;
                }

                await this.prisma.startupProfile.update({
                    where: { id: profile.id },
                    data
                });

                await this.prisma.autoPilotLog.update({
                    where: { id: log.id },
                    data: { isRollback: true }
                });

                // Update Intelligence Feedback (v2.2)
                await this.prisma.decisionFeedback.updateMany({
                    where: { decisionId: actionId },
                    data: { rolledBack: true }
                });
            }
        }
    }

    /**
     * Recovery logic — called when a user MANUALLY executes a recommended action or 
     * when the system successfully verifies an outcome.
     */
    async trackManualSuccess(organizationId: string) {
        const profile = await this.prisma.startupProfile.findUnique({ where: { organizationId } });
        if (!profile || profile.autoPilotMode !== AutoPilotMode.SAFE_MODE) return;

        const currentRecovery = profile.rollbackRecoveryCount + 1;
        const currentRate = profile.rollbackRate;

        // Unlock criteria: rate < 15% AND 5 successful manual cycles
        if (currentRate < 0.15 && currentRecovery >= 5) {
            this.logger.log(`Safe Mode recovery complete for org ${organizationId}. Unlocking Auto-Pilot.`);
            await this.prisma.startupProfile.update({
                where: { organizationId },
                data: { 
                    autoPilotMode: AutoPilotMode.ASSISTED_MODE, // Standard assisted mode
                    rollbackRecoveryCount: 0,
                    isTrustZoneDowngraded: false
                }
            });
            
            this.notifications.send({
                userId: profile.userId,
                title: '🛡️ Trust Restored: Safe Mode Unlocked',
                message: 'FounderCFO has successfully recalibrated to your decision patterns. Automation is now available.',
                type: 'SUCCESS',
                channels: ['IN_APP', 'EMAIL']
            }).catch(() => {});
        } else {
            await this.prisma.startupProfile.update({
                where: { organizationId },
                data: { rollbackRecoveryCount: currentRecovery }
            });
        }
    }

    private async disableAutoPilot(profileId: string, reason: string) {
        await this.prisma.startupProfile.update({
            where: { id: profileId },
            data: { autoPilotMode: AutoPilotMode.OFF }
        });
        
        // Cancel all pending actions
        await this.prisma.autoPilotLog.updateMany({
            where: { profileId, status: AutoPilotLogStatus.PENDING },
            data: { status: AutoPilotLogStatus.CANCELLED, reason: `System Emergency Shutdown: ${reason}` }
        });

        this.logger.warn(`Emergency Shutdown for profile ${profileId}: ${reason}`);
    }

    async startShadow(userId: string, actionId: string) {
        const action = await this.prisma.actionItem.findUnique({ where: { id: actionId } });
        if (!action) throw new Error('Action not found');

        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) throw new Error('Profile not found');

        // Mark as seen in shadow mode
        await this.prisma.actionItem.update({
            where: { id: actionId },
            data: { seenInShadowMode: true }
        });

        const riskLevel = this.classifyRisk(action);
        const msg = this.trustLanguage.shadowModeMessage(action.title, Number(action.expectedImpact));
        
        await this.logAutoPilotAction(
            profile.id, 
            action.id, 
            riskLevel, 
            true, 
            `${msg.headline} ${msg.body}`, 
            AutoPilotLogStatus.SIMULATED
        );

        this.stateService.invalidateCache(profile.organizationId);
        return { message: 'Action moved to Shadow Mode' };
    }

    async scheduleAction(userId: string, actionId: string, customDelay?: number) {
        const action = await this.prisma.actionItem.findUnique({ where: { id: actionId } });
        if (!action) throw new Error('Action not found');

        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) throw new Error('Profile not found');

        const riskLevel = this.classifyRisk(action);
        
        // Delay Logic: low (5-10), med (15-30), high (120-1440)
        let delay = customDelay;
        if (!delay) {
            if (riskLevel === AutoPilotRisk.LOW) delay = 10;
            else if (riskLevel === AutoPilotRisk.MEDIUM) delay = 30;
            else delay = 120; // 2 hours for high risk
        }

        const executeAt = new Date();
        executeAt.setMinutes(executeAt.getMinutes() + delay);

        const msg = this.trustLanguage.pendingExecutionMessage(action.title, delay, Number(action.expectedImpact));
        
        // Cancel any existing simulated/pending logs for this action first to avoid duplicates
        await this.prisma.autoPilotLog.updateMany({
            where: { actionId, status: { in: [AutoPilotLogStatus.SIMULATED, AutoPilotLogStatus.PENDING] } },
            data: { status: AutoPilotLogStatus.CANCELLED, reason: 'Superseded by new schedule' }
        });

        const log = await this.logAutoPilotAction(
            profile.id, 
            action.id, 
            riskLevel, 
            false, 
            `${msg.headline} ${msg.body}`, 
            AutoPilotLogStatus.PENDING, 
            executeAt
        );

        this.stateService.invalidateCache(profile.organizationId);
        return { message: 'Action scheduled', executeAt, logId: log.id };
    }

    async cancelAction(logId: string) {
        const log = await this.prisma.autoPilotLog.findUnique({ 
            where: { id: logId },
            include: { profile: true }
        });
        if (!log) throw new Error('Log not found');

        await this.prisma.autoPilotLog.update({
            where: { id: logId },
            data: { 
                status: AutoPilotLogStatus.CANCELLED, 
                reason: 'Founder manually cancelled execution.' 
            }
        });

        this.stateService.invalidateCache(log.profile.organizationId);
        return { message: 'Action cancelled' };
    }

    async executeImmediately(userId: string, actionId: string) {
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) throw new Error('Profile not found');

        // Find the pending log if it exists
        const log = await this.prisma.autoPilotLog.findFirst({
            where: { actionId, status: AutoPilotLogStatus.PENDING }
        });

        if (log) {
            await this.finalizeAutoExecution(log.id);
        } else {
            // If no log, create one and execute
            const action = await this.prisma.actionItem.findUnique({ where: { id: actionId } });
            if (!action) throw new Error('Action not found');
            
            const riskLevel = this.classifyRisk(action);
            const msg = this.trustLanguage.autoExecutedMessage(action.title, Number(action.expectedImpact));
            
            const newLog = await this.logAutoPilotAction(
                profile.id, 
                action.id, 
                riskLevel, 
                false, 
                `${msg.headline} ${msg.body}`, 
                AutoPilotLogStatus.PENDING, 
                new Date()
            );
            await this.finalizeAutoExecution(newLog.id);
        }

        this.stateService.invalidateCache(profile.organizationId);
        return { message: 'Action executed immediately' };
    }

    async rollbackAction(userId: string, actionId: string) {
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        if (!profile) throw new Error('Profile not found');

        await this.autoExecution.rollbackExecution(userId, actionId);
        await this.handleRollback(actionId);

        this.stateService.invalidateCache(profile.organizationId);
        return { message: 'Action rolled back and moved to shadow state' };
    }

    private classifyRisk(action: ActionItem): AutoPilotRisk {
        const impact = Math.abs(Number(action.expectedImpact));
        if (action.actionType === 'STOP_HIRING') return AutoPilotRisk.HIGH;
        if (impact > 15) return AutoPilotRisk.HIGH;
        if (impact > 5) return AutoPilotRisk.MEDIUM;
        return AutoPilotRisk.LOW;
    }

    private async logAutoPilotAction(profileId: string, actionId: string, riskLevel: AutoPilotRisk, isSimulated: boolean, reason: string, status: AutoPilotLogStatus = AutoPilotLogStatus.EXECUTED, executeAt?: Date) {
        return this.prisma.autoPilotLog.create({
            data: {
                profileId,
                actionId,
                riskLevel,
                isSimulated,
                reason,
                status,
                executeAt,
                confidence: 100,
            }
        });
    }

    private async notifyPreExecution(profileId: string, actionTitle: string, delay: number) {
        // Placeholder for real notification
        this.logger.log(`NOTIFICATION to profile ${profileId}: Auto-Pilot will apply [${actionTitle}] in ${delay} minutes.`);
    }
    /**
     * Safety Backstop: Disables autopilot if too many bad outcomes occur.
     */
    async handleFailureBackstop(logId: string) {
        const log = await this.prisma.executionLog.findUnique({
            where: { id: logId },
            include: { profile: true }
        });

        if (!log || !log.profile) return;

        const isBadOutcome =
            log.decisionQuality === DecisionQuality.BAD &&
            log.classification === OutcomeClassification.BAD_DECISION_BAD_OUTCOME;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (isBadOutcome && log.executedAt >= sevenDaysAgo) {
            const newStreak = (log.profile.autoPilotFailureStreak || 0) + 1;
            if (newStreak >= 2) {
                const msg = this.trustLanguage.autoPilotDisabledMessage('failures');
                await this.prisma.startupProfile.update({
                    where: { id: log.profile.id },
                    data: {
                        autoPilotMode: AutoPilotMode.OFF,
                        autoPilotFailureStreak: 0,
                        lastAutoPilotFailureAt: new Date()
                    }
                });
                this.logger.warn(`Auto-Pilot EMERGENCY SHUTDOWN for profile ${log.profile.id} due to consecutive failures.`);
                // Cancel pending actions for this profile
                await this.prisma.autoPilotLog.updateMany({
                    where: { profileId: log.profile.id, status: AutoPilotLogStatus.PENDING },
                    data: { status: AutoPilotLogStatus.CANCELLED, reason: `${msg.headline} ${msg.body}` }
                });
            } else {
                await this.prisma.startupProfile.update({
                    where: { id: log.profile.id },
                    data: { autoPilotFailureStreak: newStreak }
                });
            }
        }
    }
}


