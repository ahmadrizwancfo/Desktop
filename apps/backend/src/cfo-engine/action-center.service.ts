import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialMath } from '../common/math/financial-math.util';

export type ActionType = 
    | 'INVOICE_REMINDER'
    | 'VENDOR_NEGOTIATION'
    | 'PAYROLL_RESERVATION'
    | 'MARKETING_BUDGET_ADJUSTMENT'
    | 'HIRING_BUDGET_RESERVATION'
    | 'GST_PAYMENT_SCHEDULE'
    | 'BOARD_SUMMARY_GENERATE'
    | 'FINANCE_TEAM_TASK'
    | 'WEEKLY_CASH_REVIEW';

export type ActionStatus = 'PREPARED' | 'APPROVED' | 'REJECTED' | 'SNOOZED' | 'COMPLETED';
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CreateActionDto {
    organizationId: string;
    sourceModule: 'DecisionLab' | 'Dashboard' | 'AiCopilot' | 'RiskEngine';
    actionType: ActionType;
    title: string;
    description?: string;
    urgency: UrgencyLevel;
    financialImpact?: string;
    payload: any;
    scheduledFor?: string;
    userId?: string;
}

// Mock Integration Adapters Interface
export class IntegrationAdapters {
    private static logger = new Logger('IntegrationAdapters');

    static async executeEmailAdapter(to: string, subject: string, body: string) {
        this.logger.log(`[EmailAdapter] Mock Email Sent to ${to} | Subject: "${subject}"`);
        return { success: true, provider: 'SendGridMock', sentAt: new Date().toISOString() };
    }

    static async executeWhatsAppAdapter(phone: string, message: string) {
        this.logger.log(`[WhatsAppAdapter] Mock WhatsApp Message Sent to ${phone}`);
        return { success: true, provider: 'TwilioWhatsAppMock', sentAt: new Date().toISOString() };
    }

    static async executeSlackAdapter(channel: string, text: string) {
        this.logger.log(`[SlackAdapter] Mock Slack Alert Posted to ${channel}`);
        return { success: true, provider: 'SlackWebhookMock', postedAt: new Date().toISOString() };
    }

    static async executeCalendarAdapter(title: string, date: string) {
        this.logger.log(`[CalendarAdapter] Mock Google Calendar Event Created: "${title}" on ${date}`);
        return { success: true, provider: 'GoogleCalendarMock', eventId: `cal_${Date.now()}` };
    }
}

@Injectable()
export class ActionCenterService {
    private readonly logger = new Logger(ActionCenterService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Create a Prepared Founder Action (AI / System Prepares Work, Founder Approves).
     */
    async createAction(dto: CreateActionDto) {
        this.logger.log(`Creating Prepared Action [${dto.actionType}] for Org ${dto.organizationId}`);

        const action = await this.prisma.founderAction.create({
            data: {
                organizationId: dto.organizationId,
                sourceModule: dto.sourceModule,
                actionType: dto.actionType,
                title: dto.title,
                description: dto.description || '',
                urgency: dto.urgency,
                status: 'PREPARED',
                financialImpact: dto.financialImpact || '0.00',
                payload: dto.payload,
                createdById: dto.userId || null,
                scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
                auditTrail: [
                    {
                        step: 'PREPARED',
                        actor: dto.userId || 'AI_PREPARATION_ENGINE',
                        timestamp: new Date().toISOString(),
                        notes: 'Action work prepared by AI engine awaiting founder approval.',
                    }
                ],
            },
        });

        this.eventEmitter.emit('action.created', { organizationId: dto.organizationId, actionId: action.id, action });
        return action;
    }

    /**
     * Fetch Actions for Organization grouped by Urgent, Scheduled, and Completed.
     */
    async getActionsGrouped(organizationId: string) {
        const allActions = await this.prisma.founderAction.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const urgent = allActions.filter(a => a.status === 'PREPARED' && (a.urgency === 'CRITICAL' || a.urgency === 'HIGH'));
        const scheduled = allActions.filter(a => a.status === 'PREPARED' && (a.urgency === 'MEDIUM' || a.urgency === 'LOW' || a.scheduledFor !== null));
        const completed = allActions.filter(a => a.status === 'COMPLETED' || a.status === 'APPROVED' || a.status === 'REJECTED');

        return {
            urgent,
            scheduled,
            completed,
            totalCount: allActions.length,
        };
    }

    /**
     * Founder Approves Action -> Executes Integration Adapters & Log Audit Trail.
     */
    async approveAction(actionId: string, organizationId: string, userId?: string) {
        const action = await this.prisma.founderAction.findFirst({
            where: { id: actionId, organizationId },
        });

        if (!action) throw new NotFoundException('Action item not found.');
        if (action.status === 'COMPLETED') throw new BadRequestException('Action has already been completed.');

        this.logger.log(`Founder Approved Action [${action.id}] (${action.actionType})`);

        // Execute Integration Adapters based on actionType
        let executionResult: any = { executed: true };
        const payload: any = action.payload || {};

        if (action.actionType === 'INVOICE_REMINDER') {
            executionResult = await IntegrationAdapters.executeEmailAdapter(
                payload.recipientEmail || 'customer@example.com',
                payload.subject || `Friendly Reminder: Overdue Invoice ${payload.invoiceId || ''}`,
                payload.body || 'Please review your pending balance.'
            );
        } else if (action.actionType === 'VENDOR_NEGOTIATION') {
            executionResult = await IntegrationAdapters.executeEmailAdapter(
                payload.vendorEmail || 'vendor@example.com',
                'Proposal: Payment Terms Adjustment',
                payload.body || 'We would like to request an extension on upcoming invoice due dates.'
            );
        } else if (action.actionType === 'WEEKLY_CASH_REVIEW') {
            executionResult = await IntegrationAdapters.executeCalendarAdapter(
                'Weekly CFO Cash Flow Review',
                new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            );
        }

        const existingAudit: any[] = (action.auditTrail as any[]) || [];
        existingAudit.push({
            step: 'APPROVED_AND_EXECUTED',
            actor: userId || 'FOUNDER',
            timestamp: new Date().toISOString(),
            executionResult,
        });

        const updated = await this.prisma.founderAction.update({
            where: { id: actionId },
            data: {
                status: 'COMPLETED',
                approvedById: userId || null,
                auditTrail: existingAudit,
            },
        });

        this.eventEmitter.emit('action.approved', { organizationId, actionId, updated });
        return updated;
    }

    /**
     * Founder Rejects Action.
     */
    async rejectAction(actionId: string, organizationId: string, userId?: string, reason?: string) {
        const action = await this.prisma.founderAction.findFirst({
            where: { id: actionId, organizationId },
        });

        if (!action) throw new NotFoundException('Action item not found.');

        const existingAudit: any[] = (action.auditTrail as any[]) || [];
        existingAudit.push({
            step: 'REJECTED',
            actor: userId || 'FOUNDER',
            timestamp: new Date().toISOString(),
            reason: reason || 'Rejected by founder.',
        });

        return await this.prisma.founderAction.update({
            where: { id: actionId },
            data: {
                status: 'REJECTED',
                auditTrail: existingAudit,
            },
        });
    }

    /**
     * Snooze Action for 24 Hours.
     */
    async snoozeAction(actionId: string, organizationId: string) {
        const action = await this.prisma.founderAction.findFirst({
            where: { id: actionId, organizationId },
        });

        if (!action) throw new NotFoundException('Action item not found.');

        const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return await this.prisma.founderAction.update({
            where: { id: actionId },
            data: {
                status: 'SNOOZED',
                scheduledFor: snoozeUntil,
            },
        });
    }

    /**
     * Edit Action Title & Payload before Approval.
     */
    async editAction(actionId: string, organizationId: string, title?: string, payload?: any) {
        const action = await this.prisma.founderAction.findFirst({
            where: { id: actionId, organizationId },
        });

        if (!action) throw new NotFoundException('Action item not found.');

        return await this.prisma.founderAction.update({
            where: { id: actionId },
            data: {
                ...(title ? { title } : {}),
                ...(payload ? { payload } : {}),
            },
        });
    }

    /**
     * Calculate Action Center Executive Metrics.
     */
    async getActionMetrics(organizationId: string) {
        const actions = await this.prisma.founderAction.findMany({
            where: { organizationId },
        });

        const totalGenerated = actions.length;
        const approvedCount = actions.filter(a => a.status === 'COMPLETED' || a.status === 'APPROVED').length;
        const rejectedCount = actions.filter(a => a.status === 'REJECTED').length;

        let totalRunwayPreservedDecimal = FinancialMath.toDecimal(0);
        let collectionsAcceleratedDecimal = FinancialMath.toDecimal(0);

        for (const a of actions.filter(a => a.status === 'COMPLETED')) {
            const val = FinancialMath.toDecimal(a.financialImpact);
            if (a.actionType === 'INVOICE_REMINDER') {
                collectionsAcceleratedDecimal = collectionsAcceleratedDecimal.plus(val);
            } else {
                totalRunwayPreservedDecimal = totalRunwayPreservedDecimal.plus(val);
            }
        }

        return {
            totalGenerated,
            approvedCount,
            rejectedCount,
            approvalRatePercent: totalGenerated > 0 ? Math.round((approvedCount / totalGenerated) * 100) : 0,
            estimatedRunwayPreserved: FinancialMath.toString(totalRunwayPreservedDecimal),
            collectionsAccelerated: FinancialMath.toString(collectionsAcceleratedDecimal),
        };
    }
}
