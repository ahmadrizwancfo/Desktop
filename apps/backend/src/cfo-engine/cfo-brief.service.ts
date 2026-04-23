import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoMetricsService } from './cfo-metrics.service';
import { CfoForecastService } from './cfo-forecast.service';

@Injectable()
export class CfoBriefService {
    private readonly logger = new Logger(CfoBriefService.name);

    constructor(
        private prisma: PrismaService,
        private cfoMetrics: CfoMetricsService,
        private forecast: CfoForecastService
    ) { }

    /**
     * Generates and stores the Weekly Brief using MetricSnapshots and Alerts/Decisions
     */
    async generateWeeklyBrief(organizationId: string) {
        const user = await this.prisma.user.findFirst({
            where: { organizationId }
        });
        if (!user) return null;

        // Ensure metrics are perfectly fresh before generating the brief
        const metrics = await this.cfoMetrics.getLatestMetrics(user.id);
        const forecastData = await this.forecast.generateForecast(user.id, organizationId);

        if (!metrics || !forecastData) {
            this.logger.warn(`No metrics/forecast exist to generate Weekly Brief for Org ${organizationId}`);
            return null;
        }

        // Gather 2 snapshots minimum to find trends
        const snapshots = await this.prisma.financialSnapshot.findMany({
            where: { userId: user.id },
            orderBy: { snapshotDate: 'desc' },
            take: 2,
        });

        // 1. Calculate Revenue Trend and Burn Trend
        let burnChangeStr = 'stable';
        let revenueTrendStr = 'stable';

        if (snapshots.length >= 2) {
            const current = snapshots[0];
            const previous = snapshots[1];
            
            if (Number(previous.burn) > 0) {
                const burnDiff = ((Number(current.burn) - Number(previous.burn)) / Number(previous.burn)) * 100;
                burnChangeStr = `${burnDiff > 0 ? '+' : ''}${Math.round(burnDiff)}%`;
            }
            if (Number(previous.revenue) > 0) {
                const revDiff = ((Number(current.revenue) - Number(previous.revenue)) / Number(previous.revenue)) * 100;
                revenueTrendStr = `${revDiff > 0 ? '+' : ''}${Math.round(revDiff)}%`;
            }
        }

        // 2. Extract biggest risk and suggested action from CfoDecision
        const topDecision = await this.prisma.cfoDecision.findFirst({
            where: { 
                startupProfile: { userId: user.id },
                status: 'OPEN',
                severity: { in: ['CRITICAL', 'HIGH'] }
            },
            orderBy: [
                { severity: 'asc' }, // Warning: severity is String 'CRITICAL' < 'HIGH' alphabetically (actually 'C' vs 'H'), but it's simpler to order by createdAt.
                { createdAt: 'desc' }
            ]
        });

        const topRisk = topDecision 
            ? `[${topDecision.decisionType}] ${topDecision.severity} Alert Active.`
            : 'No major risks detected this week.';

        const topActionObj = topDecision && Array.isArray(topDecision.recommendedActions) && topDecision.recommendedActions.length > 0 
            ? topDecision.recommendedActions[0] as any
            : null;
        
        const topRecommendation = topActionObj && topActionObj.action 
            ? String(topActionObj.action) 
            : topActionObj ? String(topActionObj) : 'Focus on keeping the revenue growing and controlling fixed costs.';

        const summaryText = `Your runway is currently ${metrics.runwayMonths.toFixed(1)} months. Burn is ${burnChangeStr} and Revenue trend is ${revenueTrendStr} versus the previous period.`;

        // DB writes
        const brief = await this.prisma.weeklyBrief.create({
            data: {
                userId: user.id,
                organizationId,
                weekStart: new Date(), // Using current timestamp as weekStart identifier
                summaryText,
                topRisk,
                topRecommendation,
                metricsJson: {
                    runway: metrics.runwayMonths,
                    burn: metrics.monthlyBurnRate,
                    cash: metrics.cashBalance,
                    burnTrend: burnChangeStr,
                    revenueTrend: revenueTrendStr,
                    forecast: {
                        dailyBurnRate: forecastData.dailyBurnRate,
                        runway_days_remaining: forecastData.runway_days_remaining,
                        zero_cash_date: forecastData.estimated_zero_cash_date
                    },
                    decisionSummary: topActionObj ? topActionObj : {}
                }
            }
        });

        this.logger.log(`Weekly Brief successfully generated for Org ${organizationId}`);
        return brief;
    }

    async getLatestBrief(userId: string) {
        return this.prisma.weeklyBrief.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
