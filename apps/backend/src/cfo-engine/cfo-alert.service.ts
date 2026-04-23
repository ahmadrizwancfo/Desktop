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

const SEVERITY_RANK: Record<string, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
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
     *
     * INTELLIGENCE RULES:
     * 1. Only alert for HIGH/CRITICAL severity
     * 2. If severity ESCALATED (e.g. MEDIUM→HIGH), always re-alert immediately
     * 3. If same severity, skip if within 24h dedup window
     * 4. Track firstDetectedAt, lastSentAt, previousSeverity on Alert table
     */
    async checkAndAlert(decisions: SavedDecision[], userId: string): Promise<void> {
        const alertable = decisions.filter(
            (d) => d.severity === 'CRITICAL' || d.severity === 'HIGH',
        );

        // Resolve organizationId once
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { organizationId: true },
        });
        const organizationId = user?.organizationId;

        for (const decision of alertable) {
            const notificationType = `CFO_ALERT_${decision.decisionType}`;

            // ── Check previous alert for this type + user ──────────────────────
            const previousAlert = await this.prisma.alert.findFirst({
                where: { userId, alertType: notificationType },
                orderBy: { createdAt: 'desc' },
            });

            const prevSeverityRank = previousAlert?.severity
                ? (SEVERITY_RANK[previousAlert.severity] ?? 0)
                : -1;
            const currentSeverityRank = SEVERITY_RANK[decision.severity] ?? 0;
            const isEscalation = currentSeverityRank > prevSeverityRank && previousAlert !== null;

            // ── Dedup: skip if same severity AND within 24h ───────────────────
            if (previousAlert && !isEscalation) {
                const timeSinceLastAlert = Date.now() - new Date(previousAlert.lastSentAt).getTime();
                if (timeSinceLastAlert < this.DEDUP_WINDOW_MS) {
                    this.logger.debug(
                        `Skipping ${notificationType} for user ${userId} — same severity within 24h`,
                    );
                    continue;
                }
            }

            if (isEscalation) {
                this.logger.warn(
                    `🔺 ESCALATION: ${notificationType} ${previousAlert?.severity} → ${decision.severity} for user ${userId}`,
                );
            }

            // ── Send notification ─────────────────────────────────────────────
            const emoji = DOMAIN_EMOJI[decision.decisionDomain] ?? '📌';
            const typeLabel = decision.decisionType.replace(/_/g, ' ');
            const domainLabel = decision.decisionDomain;
            const topAction = this.extractFirstAction(decision.recommendedActions);
            const factSummary = this.summarizeFacts(decision);

            const escalationPrefix = isEscalation
                ? `⬆️ ESCALATED from ${previousAlert?.severity} → ${decision.severity}\n\n`
                : '';

            await this.notificationsService.send({
                userId,
                title: `${emoji} ${typeLabel} — ${decision.severity} [${domainLabel}]`,
                message: `${escalationPrefix}${factSummary}\n\nRecommended: ${topAction}`,
                type: SEVERITY_TYPE_MAP[decision.severity] ?? 'WARNING',
                channels: ['IN_APP', 'EMAIL'],
            });

            // ── Persist to Alert table with intelligence fields ──────────────
            if (organizationId) {
                const firstDetectedAt = previousAlert?.firstDetectedAt ?? new Date();

                await this.prisma.alert.create({
                    data: {
                        userId,
                        organizationId,
                        decisionId: decision.id,
                        alertType: notificationType,
                        channel: 'IN_APP',
                        status: 'SENT',
                        severity: decision.severity,
                        message: `${escalationPrefix}${factSummary}\n\nRecommended: ${topAction}`,
                        previousSeverity: previousAlert?.severity ?? null,
                        firstDetectedAt,
                        lastSentAt: new Date(),
                    },
                }).catch((err: any) =>
                    this.logger.warn(`Alert persist failed: ${err.message}`),
                );
            }

            this.logger.log(
                `Alert sent: ${notificationType} → user ${userId} (${decision.severity}${isEscalation ? ' ESCALATED' : ''})`,
            );
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
                if (f.growth_rate !== undefined) {
                    return `Revenue ${f.trend_direction === 'down' ? 'declined' : 'grew'} ${Math.abs(f.growth_rate)}% month-over-month.`;
                }
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

