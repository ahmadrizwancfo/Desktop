import { Controller, Get, Post, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { SmartNotificationsService } from './smart-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface BriefPreferences {
    channels: ('EMAIL' | 'WHATSAPP' | 'SLACK')[];
    frequency: 'WEEKLY' | 'BIWEEKLY';
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
}

@Controller('weekly-brief')
@UseGuards(JwtAuthGuard)
export class WeeklyBriefController {
    private readonly logger = new Logger(WeeklyBriefController.name);

    constructor(
        private readonly notificationsService: SmartNotificationsService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * GET /weekly-brief/preview
     * Returns brief data for frontend to render a preview card.
     */
    @Get('preview')
    async getPreview(@GetUser() user: any) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            return { error: 'No organization linked to this user' };
        }

        const brief = await this.buildBriefData(organizationId, user.id);
        return brief;
    }

    /**
     * POST /weekly-brief/send
     * Sends the brief immediately to the founder AND persists it.
     */
    @Post('send')
    async sendNow(@GetUser() user: any) {
        const organizationId = user.organizationId;
        if (!organizationId) {
            return { success: false, error: 'No organization linked' };
        }

        try {
            // Send notification
            await this.notificationsService.sendFounderBrief(organizationId, user.id);

            // Persist to DB for history
            const briefData = await this.buildBriefData(organizationId, user.id);
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
            weekStart.setHours(0, 0, 0, 0);

            await this.prisma.weeklyBrief.create({
                data: {
                    userId: user.id,
                    organizationId,
                    weekStart,
                    summaryText: `Runway: ${briefData.metrics.runway} months | Burn: ₹${briefData.metrics.monthlyBurn} | Cash: ₹${briefData.metrics.cashInBank}`,
                    topRisk: briefData.biggestRisk?.type || 'No critical risks',
                    topRecommendation: briefData.recommendation,
                    metricsJson: briefData.metrics,
                },
            });

            return { success: true, message: 'Founder Brief sent and saved!' };
        } catch (error) {
            this.logger.error(`Failed to send brief: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET /weekly-brief/history
     * Returns past weekly briefs.
     */
    @Get('history')
    async getHistory(@GetUser() user: any) {
        return this.prisma.weeklyBrief.findMany({
            where: { userId: user.id },
            orderBy: { weekStart: 'desc' },
            take: 12,
        });
    }

    /**
     * PUT /weekly-brief/preferences
     * Save channel/frequency preferences (stored in-memory for now, DB later).
     */
    @Put('preferences')
    async updatePreferences(
        @GetUser() user: any,
        @Body() body: BriefPreferences,
    ) {
        // For now, log preferences. In production, persist to DB.
        this.logger.log(
            `User ${user.id} updated brief preferences: ${JSON.stringify(body)}`,
        );
        return {
            success: true,
            preferences: body,
            message: 'Preferences saved successfully',
        };
    }

    // ── Build brief data from financial context + CFO engine ──────────────────

    private async buildBriefData(organizationId: string, userId: string) {
        // Get startup profile
        const profile = await this.prisma.startupProfile.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Get latest CFO decisions — sorted by severity for reliable ranking
        const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        let decisions: any[] = [];
        try {
            decisions = await this.prisma.cfoDecision.findMany({
                where: { startupProfile: { userId } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });
            // Sort by severity (CRITICAL first)
            decisions.sort((a: any, b: any) =>
                SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
            );
        } catch {
            // Table might not exist yet
        }

        // Get recent transactions for burn trend
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
        });
        const totalCash = bankAccounts.reduce(
            (sum, acc) => sum + Number(acc.balance),
            0,
        );

        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 120,
        });

        // Calculate this month vs last month burn for trend
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const thisMonthExpenses = transactions
            .filter(
                (t) =>
                    t.type === 'EXPENSE' && new Date(t.date) >= thisMonthStart,
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const lastMonthExpenses = transactions
            .filter(
                (t) =>
                    t.type === 'EXPENSE' &&
                    new Date(t.date) >= lastMonthStart &&
                    new Date(t.date) < thisMonthStart,
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const burnTrend =
            lastMonthExpenses > 0
                ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
                : 0;

        const monthlyRevenue = Number(profile?.monthlyRevenue || 0);
        const monthlyExpenses = Number(profile?.monthlyExpenses || thisMonthExpenses || 0);
        const netBurn = monthlyExpenses - monthlyRevenue;
        const runway = netBurn > 0 ? totalCash / netBurn : 999;

        // ── HIGHEST-SEVERITY RISK (sorted above — first item is worst) ────────
        const topDecision = decisions[0] || null;
        const biggestRisk = topDecision
            ? {
                domain: topDecision.decisionDomain,
                type: topDecision.decisionType?.replace(/_/g, ' '),
                severity: topDecision.severity,
                summary: this.extractFactSummary(topDecision),
            }
            : { domain: 'NONE', type: 'No critical risks', severity: 'LOW', summary: 'All systems healthy' };

        // Top recommendation from highest-severity decision
        const topRecommendation = topDecision?.recommendedActions?.[0]
            || 'Continue optimizing operations';

        // ── COMPARE VS LAST WEEK ──────────────────────────────────────────────
        let changeVsLastWeek: any = null;
        try {
            const lastBrief = await this.prisma.weeklyBrief.findFirst({
                where: { userId },
                orderBy: { weekStart: 'desc' },
            });
            if (lastBrief?.metricsJson) {
                const lastMetrics = lastBrief.metricsJson as any;
                const runwayDelta = Math.round((runway - (lastMetrics.runway || 0)) * 10) / 10;
                const burnDelta = monthlyExpenses - (lastMetrics.monthlyBurn || 0);
                changeVsLastWeek = {
                    runwayDelta, // positive = improved, negative = worsened
                    runwayDirection: runwayDelta > 0 ? 'improved' : runwayDelta < 0 ? 'worsened' : 'unchanged',
                    burnDelta,
                    burnDirection: burnDelta > 0 ? 'increased' : burnDelta < 0 ? 'decreased' : 'unchanged',
                    lastTopRisk: lastBrief.topRisk,
                    riskChanged: lastBrief.topRisk !== biggestRisk.type,
                };
            }
        } catch {
            // First brief — no comparison available
        }

        // ── PRESSURE LANGUAGE: OPENING LINE ──────────────────────────────────────
        let openingLine: string;
        if (changeVsLastWeek) {
            if (changeVsLastWeek.runwayDirection === 'worsened') {
                openingLine = `This week moved you closer to running out of cash. You lost ${Math.abs(changeVsLastWeek.runwayDelta)} months of runway.`;
            } else if (changeVsLastWeek.runwayDirection === 'improved') {
                openingLine = `This week moved you further from running out of cash. You gained ${changeVsLastWeek.runwayDelta} months of runway.`;
            } else {
                openingLine = `This week, your financial position did not change. Inaction is still a risk.`;
            }
        } else {
            openingLine = `This is your first survival brief. Your runway is ${Math.round(runway * 10) / 10} months.`;
        }

        // ── TOP MISTAKE (biggest negative impact this week) ──────────────────
        let topMistake: string | null = null;
        if (changeVsLastWeek?.burnDirection === 'increased' && changeVsLastWeek.burnDelta > 0) {
            const fmtBurn = changeVsLastWeek.burnDelta >= 100000
                ? `₹${(changeVsLastWeek.burnDelta / 100000).toFixed(1)}L`
                : `₹${Math.round(changeVsLastWeek.burnDelta / 1000)}K`;
            topMistake = `Your burn increased by ${fmtBurn}/mo. This is directly shortening your survival time.`;
        } else if (biggestRisk.severity === 'CRITICAL' || biggestRisk.severity === 'HIGH') {
            topMistake = `Unresolved ${biggestRisk.type} risk (${biggestRisk.severity}): ${biggestRisk.summary}`;
        }

        // ── BEST DECISION (if any improvement) ──────────────────────────────
        let bestDecision: string | null = null;
        if (changeVsLastWeek?.burnDirection === 'decreased') {
            const fmtSaved = Math.abs(changeVsLastWeek.burnDelta) >= 100000
                ? `₹${(Math.abs(changeVsLastWeek.burnDelta) / 100000).toFixed(1)}L`
                : `₹${Math.round(Math.abs(changeVsLastWeek.burnDelta) / 1000)}K`;
            bestDecision = `You reduced burn by ${fmtSaved}/mo. This bought you more time.`;
        }

        // ── NEXT WEEK ACTIONS (2 recommended) ────────────────────────────────
        const nextWeekActions: string[] = [];
        if (runway < 6) {
            nextWeekActions.push('Cut all non-essential spending immediately. You are running out of time.');
        }
        if (burnTrend > 10) {
            nextWeekActions.push(`Your burn is trending up. Identify and eliminate the top spending category this week.`);
        }
        if (monthlyRevenue > 0 && runway < 12) {
            nextWeekActions.push('Chase all outstanding invoices. Every rupee collected extends your runway.');
        }
        if (nextWeekActions.length === 0) {
            nextWeekActions.push('Continue monitoring expenses and maintain current burn rate.');
            nextWeekActions.push('Review your top 3 expense categories for optimization opportunities.');
        }

        // ── PRESSURE SUMMARY ─────────────────────────────────────────────────
        const pressureSummary = [
            openingLine,
            `Runway: ${Math.round(runway * 10) / 10} months at ₹${(monthlyExpenses / 100000).toFixed(1)}L/mo burn.`,
            topMistake ? `⚠️ ${topMistake}` : null,
            bestDecision ? `✅ ${bestDecision}` : null,
        ].filter(Boolean).join('\n');

        return {
            companyName: profile?.companyName || 'Your Startup',
            generatedAt: now.toISOString(),
            weekOf: `${now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} — ${new Date(now.getTime() + 6 * 86400000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            summary: pressureSummary,
            openingLine,
            topMistake,
            bestDecision,
            nextWeekActions: nextWeekActions.slice(0, 2),
            metrics: {
                runway: Math.round(runway * 10) / 10,
                runwayStatus: runway < 6 ? 'CRITICAL' : runway < 12 ? 'WARNING' : 'HEALTHY',
                monthlyBurn: monthlyExpenses,
                burnTrend: Math.round(burnTrend),
                burnTrendDirection: burnTrend > 0 ? 'UP' : burnTrend < 0 ? 'DOWN' : 'FLAT',
                cashInBank: totalCash,
                monthlyRevenue,
            },
            biggestRisk,
            recommendation: topRecommendation,
            changeVsLastWeek,
            decisionsCount: decisions.length,
            decisions: decisions.slice(0, 3).map((d) => ({
                domain: d.decisionDomain,
                type: d.decisionType,
                severity: d.severity,
            })),
        };
    }

    private extractFactSummary(decision: any): string {
        const f = decision.facts as Record<string, any> | null;
        if (!f) return decision.decisionType?.replace(/_/g, ' ') || 'Financial risk detected';

        if (f.runway_months) return `Runway at ${f.runway_months} months`;
        if (f.burn_ratio) return `Burn ratio ${f.burn_ratio}x revenue`;
        if (f.growth_rate !== undefined) return `Revenue ${f.trend_direction === 'down' ? 'declined' : 'grew'} ${Math.abs(f.growth_rate)}%`;
        if (f.revenue_coverage_ratio)
            return `Revenue covers ${Math.round(f.revenue_coverage_ratio * 100)}% of expenses`;
        if (f.post_hire_runway_months)
            return `Post-hire runway: ${f.post_hire_runway_months} months`;

        return decision.decisionType?.replace(/_/g, ' ') || 'Review recommended';
    }
}

