import { Injectable, Logger } from '@nestjs/common';
import { SmartNotificationsService } from '../notifications/smart-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface SavedDecision {
    id: string;
    decisionType: string;
    decisionDomain: string;
    severity: string;
    facts: any;
    recommendedActions: any;
}

const DOMAIN_EMOJI: Record<string, string> = {
    SURVIVAL: '🚨',
    EFFICIENCY: '📊',
    GROWTH: '📈',
    HIRING: '👥',
    FUNDRAISING: '💰',
    COMPLIANCE: '📋',
};

const SEVERITY_TYPE_MAP: Record<string, 'ERROR' | 'WARNING'> = {
    CRITICAL: 'ERROR',
    HIGH: 'WARNING',
};

@Injectable()
export class CfoAlertService {
    private readonly logger = new Logger(CfoAlertService.name);
    private readonly DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

    constructor(
        private prisma: PrismaService,
        private notificationsService: SmartNotificationsService,
    ) { }

    /**
     * Fire alerts for HIGH/CRITICAL decisions.
     * Deduplication: one alert per decisionType per user per 24h.
     */
    async checkAndAlert(decisions: SavedDecision[], userId: string): Promise<void> {
        const alertable = decisions.filter(
            (d) => d.severity === 'CRITICAL' || d.severity === 'HIGH',
        );

        for (const decision of alertable) {
            const notificationType = `CFO_ALERT_${decision.decisionType}`;

            // Dedup: skip if already alerted in the last 24h
            const alreadySent = await this.prisma.notification.findFirst({
                where: {
                    userId,
                    type: notificationType,
                    createdAt: { gte: new Date(Date.now() - this.DEDUP_WINDOW_MS) },
                },
            });

            if (alreadySent) {
                this.logger.debug(
                    `Skipping duplicate ${notificationType} for user ${userId} (last: ${alreadySent.createdAt.toISOString()})`,
                );
                continue;
            }

            const emoji = DOMAIN_EMOJI[decision.decisionDomain] ?? '📌';
            const typeLabel = decision.decisionType.replace(/_/g, ' ');
            const domainLabel = decision.decisionDomain;
            const topAction = this.extractFirstAction(decision.recommendedActions);
            const factSummary = this.summarizeFacts(decision);

            await this.notificationsService.send({
                userId,
                title: `${emoji} ${typeLabel} — ${decision.severity} [${domainLabel}]`,
                message: `${factSummary}\n\nRecommended: ${topAction}`,
                type: SEVERITY_TYPE_MAP[decision.severity] ?? 'WARNING',
                channels: ['IN_APP', 'EMAIL'],
            });

            this.logger.log(`Alert sent: ${notificationType} → user ${userId} (${decision.severity})`);
        }
    }

    private extractFirstAction(actions: any): string {
        if (Array.isArray(actions) && actions.length > 0) return String(actions[0]);
        if (typeof actions === 'string') return actions;
        return 'Review your dashboard for details.';
    }

    private summarizeFacts(decision: SavedDecision): string {
        const f = decision.facts as Record<string, any>;
        switch (decision.decisionType) {
            case 'RUNWAY_RISK':
                return `Runway is ${f.runway_months ?? '?'} months at ₹${f.monthly_burn ? (Number(f.monthly_burn) / 100000).toFixed(1) + 'L' : '?'}/month burn.`;
            case 'BURN_UNSUSTAINABLE':
                return `Burn ratio is ${f.burn_ratio}x revenue — expenses exceed income.`;
            case 'REVENUE_SLOWDOWN':
                return `Revenue covers only ${Math.round((f.revenue_coverage_ratio ?? 0) * 100)}% of expenses.`;
            case 'HIRING_RISK':
                return `Next hire would drop runway to ${f.post_hire_runway_months ?? '?'} months.`;
            case 'FUNDRAISE_URGENCY':
                return `Runway is ${f.runway_months ?? '?'} months — fundraising window is narrowing.`;
            case 'GST_DUE':
                return `GSTR-3B due in ${f.days_until_deadline ?? '?'} day(s). ₹50/day penalty if missed.`;
            default:
                return `${decision.severity} severity ${decision.decisionDomain} alert detected.`;
        }
    }
}
