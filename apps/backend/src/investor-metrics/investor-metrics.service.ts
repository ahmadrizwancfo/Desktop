import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface InvestorMetrics {
    burnMultiple: number;
    revenueGrowthRate: number;
    grossMargin: number;
    cashEfficiency: number;
    runwayQualityScore: number;
    netBurnRate: number;
    monthlyRecurringRevenue: number;
    currentCash: number;
    runway: number;
}

export interface ReadinessAssessment {
    stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b';
    score: number;
    isReady: boolean;
    gaps: { metric: string; current: number; required: number; gap: string }[];
    strengths: string[];
    recommendations: string[];
}

export interface DataRoomDocument {
    type: string;
    title: string;
    description: string;
    generatedAt: Date;
    downloadUrl?: string;
}

// Stage requirements for investor readiness
const STAGE_REQUIREMENTS = {
    'pre-seed': {
        minRevenue: 0,
        maxBurnMultiple: Infinity,
        minGrossMargin: 0,
        minRunway: 3,
        minGrowthRate: 0,
    },
    'seed': {
        minRevenue: 100000, // ₹1L MRR
        maxBurnMultiple: 5,
        minGrossMargin: 40,
        minRunway: 6,
        minGrowthRate: 10,
    },
    'series-a': {
        minRevenue: 500000, // ₹5L MRR
        maxBurnMultiple: 3,
        minGrossMargin: 50,
        minRunway: 12,
        minGrowthRate: 15,
    },
    'series-b': {
        minRevenue: 2000000, // ₹20L MRR
        maxBurnMultiple: 2,
        minGrossMargin: 60,
        minRunway: 18,
        minGrowthRate: 20,
    },
};

@Injectable()
export class InvestorMetricsService {
    constructor(private prisma: PrismaService) { }

    async calculateMetrics(organizationId: string): Promise<InvestorMetrics> {
        // Get financial data
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                bankAccounts: true,
            },
        });

        // Get last 3 months of transactions for trends
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                bankAccount: {
                    organizationId,
                },
                date: { gte: threeMonthsAgo },
            },
            orderBy: { date: 'asc' },
        });

        // Calculate monthly revenue and expenses
        const monthlyData = this.groupByMonth(transactions);
        const latestMonth = monthlyData[monthlyData.length - 1] || { revenue: 0, expenses: 0 };
        const previousMonth = monthlyData[monthlyData.length - 2] || { revenue: 0, expenses: 0 };

        // Core metrics
        const monthlyRevenue = latestMonth.revenue;
        const monthlyExpenses = latestMonth.expenses;
        const netBurn = monthlyExpenses - monthlyRevenue;
        const currentCash = org?.bankAccounts?.reduce((sum, acc) => sum + (acc.balance?.toNumber() || 0), 0) || 0;

        // Burn Multiple = Net Burn / Net New ARR
        const newARR = (monthlyRevenue - previousMonth.revenue) * 12;
        const burnMultiple = newARR > 0 ? Math.abs(netBurn * 12) / newARR : Infinity;

        // Revenue Growth Rate (MoM)
        const revenueGrowthRate = previousMonth.revenue > 0
            ? ((monthlyRevenue - previousMonth.revenue) / previousMonth.revenue) * 100
            : 0;

        // Gross Margin (assuming COGS is 30% of revenue for now)
        const estimatedCOGS = monthlyRevenue * 0.3;
        const grossMargin = monthlyRevenue > 0
            ? ((monthlyRevenue - estimatedCOGS) / monthlyRevenue) * 100
            : 0;

        // Cash Efficiency = Revenue / Cash Spent
        const cashEfficiency = monthlyExpenses > 0 ? monthlyRevenue / monthlyExpenses : 0;

        // Runway in months
        const runway = netBurn > 0 ? currentCash / netBurn : 24; // Default to 24 if profitable

        // Runway Quality Score (0-100)
        // Based on: runway length, burn trajectory, revenue growth
        const runwayQualityScore = this.calculateRunwayQuality(runway, revenueGrowthRate, burnMultiple);

        return {
            burnMultiple: Math.round(burnMultiple * 10) / 10,
            revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
            grossMargin: Math.round(grossMargin * 10) / 10,
            cashEfficiency: Math.round(cashEfficiency * 100) / 100,
            runwayQualityScore: Math.round(runwayQualityScore),
            netBurnRate: Math.round(netBurn),
            monthlyRecurringRevenue: Math.round(monthlyRevenue),
            currentCash: Math.round(currentCash),
            runway: Math.round(runway * 10) / 10,
        };
    }

    async getReadinessAssessment(organizationId: string): Promise<ReadinessAssessment> {
        const metrics = await this.calculateMetrics(organizationId);

        // Determine current stage readiness
        const stages: ('pre-seed' | 'seed' | 'series-a' | 'series-b')[] = ['pre-seed', 'seed', 'series-a', 'series-b'];
        let currentStage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' = 'pre-seed';
        let nextStage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' = 'seed';

        // Find highest stage they qualify for
        for (const stage of stages) {
            const req = STAGE_REQUIREMENTS[stage];
            if (
                metrics.monthlyRecurringRevenue >= req.minRevenue &&
                metrics.burnMultiple <= req.maxBurnMultiple &&
                metrics.grossMargin >= req.minGrossMargin &&
                metrics.runway >= req.minRunway &&
                metrics.revenueGrowthRate >= req.minGrowthRate
            ) {
                currentStage = stage;
                const idx = stages.indexOf(stage);
                nextStage = stages[Math.min(idx + 1, stages.length - 1)];
            }
        }

        const nextReq = STAGE_REQUIREMENTS[nextStage];
        const gaps: { metric: string; current: number; required: number; gap: string }[] = [];
        const strengths: string[] = [];

        // Analyze gaps and strengths
        if (metrics.monthlyRecurringRevenue < nextReq.minRevenue) {
            gaps.push({
                metric: 'MRR',
                current: metrics.monthlyRecurringRevenue,
                required: nextReq.minRevenue,
                gap: `Need ₹${((nextReq.minRevenue - metrics.monthlyRecurringRevenue) / 100000).toFixed(1)}L more MRR`,
            });
        } else {
            strengths.push(`Strong MRR at ₹${(metrics.monthlyRecurringRevenue / 100000).toFixed(1)}L`);
        }

        if (metrics.burnMultiple > nextReq.maxBurnMultiple) {
            gaps.push({
                metric: 'Burn Multiple',
                current: metrics.burnMultiple,
                required: nextReq.maxBurnMultiple,
                gap: `Reduce burn multiple from ${metrics.burnMultiple}x to ${nextReq.maxBurnMultiple}x`,
            });
        } else {
            strengths.push(`Efficient burn at ${metrics.burnMultiple}x`);
        }

        if (metrics.grossMargin < nextReq.minGrossMargin) {
            gaps.push({
                metric: 'Gross Margin',
                current: metrics.grossMargin,
                required: nextReq.minGrossMargin,
                gap: `Improve gross margin by ${(nextReq.minGrossMargin - metrics.grossMargin).toFixed(0)}%`,
            });
        } else {
            strengths.push(`Healthy gross margin at ${metrics.grossMargin}%`);
        }

        if (metrics.runway < nextReq.minRunway) {
            gaps.push({
                metric: 'Runway',
                current: metrics.runway,
                required: nextReq.minRunway,
                gap: `Extend runway by ${(nextReq.minRunway - metrics.runway).toFixed(1)} months`,
            });
        } else {
            strengths.push(`Comfortable runway of ${metrics.runway} months`);
        }

        // Calculate readiness score
        const score = this.calculateReadinessScore(metrics, nextReq);
        const isReady = gaps.length === 0;

        // Generate recommendations
        const recommendations = this.generateRecommendations(gaps, metrics);

        return {
            stage: currentStage,
            score,
            isReady,
            gaps,
            strengths,
            recommendations,
        };
    }

    async generateDataRoomDocuments(organizationId: string): Promise<DataRoomDocument[]> {
        const now = new Date();

        return [
            {
                type: 'pl_statement',
                title: 'Profit & Loss Statement',
                description: 'Monthly P&L for the last 12 months',
                generatedAt: now,
            },
            {
                type: 'cash_flow',
                title: 'Cash Flow Statement',
                description: 'Monthly cash flow analysis',
                generatedAt: now,
            },
            {
                type: 'balance_sheet',
                title: 'Balance Sheet',
                description: 'Current financial position',
                generatedAt: now,
            },
            {
                type: 'monthly_summary',
                title: 'Monthly Financial Summary',
                description: 'Key metrics and highlights',
                generatedAt: now,
            },
            {
                type: 'kpi_definitions',
                title: 'KPI Definitions',
                description: 'How we calculate our metrics',
                generatedAt: now,
            },
            {
                type: 'revenue_breakdown',
                title: 'Revenue Breakdown',
                description: 'Revenue by customer, product, and cohort',
                generatedAt: now,
            },
            {
                type: 'expense_analysis',
                title: 'Expense Analysis',
                description: 'Detailed expense categorization',
                generatedAt: now,
            },
            {
                type: 'runway_forecast',
                title: 'Runway Forecast',
                description: '12-month cash runway projection',
                generatedAt: now,
            },
        ];
    }

    async generateNarrative(
        organizationId: string,
        tone: 'founder' | 'investor' | 'board'
    ): Promise<{ narrative: string; highlights: { label: string; value: string }[] }> {
        const metrics = await this.calculateMetrics(organizationId);
        const assessment = await this.getReadinessAssessment(organizationId);

        let narrative: string;
        const highlights: { label: string; value: string }[] = [];

        switch (tone) {
            case 'founder':
                narrative = this.generateFounderNarrative(metrics, assessment);
                highlights.push(
                    { label: 'Runway', value: `${metrics.runway} months` },
                    { label: 'Monthly Burn', value: `₹${(metrics.netBurnRate / 100000).toFixed(1)}L` },
                    { label: 'Next Milestone', value: assessment.gaps[0]?.metric || 'On Track' },
                );
                break;

            case 'investor':
                narrative = this.generateInvestorNarrative(metrics, assessment);
                highlights.push(
                    { label: 'MRR', value: `₹${(metrics.monthlyRecurringRevenue / 100000).toFixed(1)}L` },
                    { label: 'Growth Rate', value: `${metrics.revenueGrowthRate}% MoM` },
                    { label: 'Burn Multiple', value: `${metrics.burnMultiple}x` },
                    { label: 'Gross Margin', value: `${metrics.grossMargin}%` },
                );
                break;

            case 'board':
                narrative = this.generateBoardNarrative(metrics, assessment);
                highlights.push(
                    { label: 'Cash Position', value: `₹${(metrics.currentCash / 100000).toFixed(1)}L` },
                    { label: 'Runway', value: `${metrics.runway} months` },
                    { label: 'Stage', value: assessment.stage.toUpperCase() },
                );
                break;
        }

        return { narrative, highlights };
    }

    // Helper methods
    private groupByMonth(transactions: any[]): { month: string; revenue: number; expenses: number }[] {
        const grouped = new Map<string, { revenue: number; expenses: number }>();

        for (const txn of transactions) {
            const month = txn.date.toISOString().slice(0, 7);
            if (!grouped.has(month)) {
                grouped.set(month, { revenue: 0, expenses: 0 });
            }
            const data = grouped.get(month)!;
            const amount = txn.amount?.toNumber() || 0;
            if (txn.type === 'CREDIT') {
                data.revenue += amount;
            } else {
                data.expenses += Math.abs(amount);
            }
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, ...data }));
    }

    private calculateRunwayQuality(runway: number, growthRate: number, burnMultiple: number): number {
        let score = 0;

        // Runway length (40 points max)
        if (runway >= 18) score += 40;
        else if (runway >= 12) score += 30;
        else if (runway >= 6) score += 20;
        else if (runway >= 3) score += 10;

        // Growth rate (30 points max)
        if (growthRate >= 20) score += 30;
        else if (growthRate >= 15) score += 25;
        else if (growthRate >= 10) score += 20;
        else if (growthRate >= 5) score += 10;

        // Burn efficiency (30 points max)
        if (burnMultiple <= 1) score += 30;
        else if (burnMultiple <= 2) score += 25;
        else if (burnMultiple <= 3) score += 20;
        else if (burnMultiple <= 5) score += 10;

        return Math.min(score, 100);
    }

    private calculateReadinessScore(metrics: InvestorMetrics, requirements: any): number {
        let score = 0;
        let total = 0;

        // MRR (25 points)
        total += 25;
        if (metrics.monthlyRecurringRevenue >= requirements.minRevenue) {
            score += 25;
        } else {
            score += (metrics.monthlyRecurringRevenue / requirements.minRevenue) * 25;
        }

        // Burn Multiple (25 points)
        total += 25;
        if (metrics.burnMultiple <= requirements.maxBurnMultiple) {
            score += 25;
        } else {
            score += Math.max(0, 25 - (metrics.burnMultiple - requirements.maxBurnMultiple) * 5);
        }

        // Gross Margin (25 points)
        total += 25;
        if (metrics.grossMargin >= requirements.minGrossMargin) {
            score += 25;
        } else {
            score += (metrics.grossMargin / requirements.minGrossMargin) * 25;
        }

        // Runway (25 points)
        total += 25;
        if (metrics.runway >= requirements.minRunway) {
            score += 25;
        } else {
            score += (metrics.runway / requirements.minRunway) * 25;
        }

        return Math.round((score / total) * 100);
    }

    private generateRecommendations(gaps: any[], metrics: InvestorMetrics): string[] {
        const recs: string[] = [];

        for (const gap of gaps) {
            switch (gap.metric) {
                case 'MRR':
                    recs.push('Focus on customer acquisition and upselling existing accounts');
                    recs.push('Consider launching a higher-tier pricing plan');
                    break;
                case 'Burn Multiple':
                    recs.push('Review and optimize marketing spend efficiency');
                    recs.push('Focus on organic growth channels to reduce CAC');
                    break;
                case 'Gross Margin':
                    recs.push('Audit vendor contracts for cost optimization');
                    recs.push('Consider automation to reduce service delivery costs');
                    break;
                case 'Runway':
                    recs.push('Implement cost reduction measures');
                    recs.push('Consider bridge financing or revenue-based financing');
                    break;
            }
        }

        return recs.slice(0, 4);
    }

    private generateFounderNarrative(metrics: InvestorMetrics, assessment: ReadinessAssessment): string {
        const runwayStatus = metrics.runway >= 12 ? 'healthy' : metrics.runway >= 6 ? 'manageable' : 'concerning';

        return `This month, we're at ₹${(metrics.monthlyRecurringRevenue / 100000).toFixed(1)}L MRR with ${metrics.runway} months of runway. ` +
            `Our burn is ${runwayStatus} at ₹${(Math.abs(metrics.netBurnRate) / 100000).toFixed(1)}L/month. ` +
            (assessment.gaps.length > 0
                ? `Key focus area: ${assessment.gaps[0].gap}.`
                : `We're on track for ${assessment.stage === 'series-b' ? 'continued growth' : `${assessment.stage.replace('-', ' ')} readiness`}.`);
    }

    private generateInvestorNarrative(metrics: InvestorMetrics, assessment: ReadinessAssessment): string {
        return `We are generating ₹${(metrics.monthlyRecurringRevenue / 100000).toFixed(1)}L in MRR, growing at ${metrics.revenueGrowthRate}% month-over-month. ` +
            `Our burn multiple of ${metrics.burnMultiple}x demonstrates ${metrics.burnMultiple <= 2 ? 'capital efficient growth' : 'intentional GTM investment'}. ` +
            `With ${metrics.grossMargin}% gross margins and ${metrics.runway} months runway, ` +
            `we are positioned for ${assessment.stage === 'seed' ? 'Series A' : assessment.stage === 'series-a' ? 'Series B' : 'continued scaling'} discussions.`;
    }

    private generateBoardNarrative(metrics: InvestorMetrics, assessment: ReadinessAssessment): string {
        return `Cash position: ₹${(metrics.currentCash / 100000).toFixed(1)}L | Runway: ${metrics.runway} months | ` +
            `MRR: ₹${(metrics.monthlyRecurringRevenue / 100000).toFixed(1)}L (+${metrics.revenueGrowthRate}% MoM) | ` +
            `Burn: ₹${(Math.abs(metrics.netBurnRate) / 100000).toFixed(1)}L/mo | ` +
            `Stage: ${assessment.stage.toUpperCase()} | Readiness Score: ${assessment.score}%`;
    }
}
