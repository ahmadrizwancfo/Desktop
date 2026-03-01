import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CFORecommendation {
    id: string;
    type: 'cost_reduction' | 'revenue_growth' | 'runway_extension' | 'risk_mitigation';
    title: string;
    description: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: {
        savings: number;        // Monthly savings in ₹
        runwayImpact: number;   // Impact in months
    };
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    actionable: boolean;
    simulationParams?: Record<string, number>;
}

export interface RiskItem {
    id: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    probability: number;       // 0-100%
    impact: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'MINOR';
    daysUntilCritical?: number;
    mitigation: string;
    affectedMetric: string;
}

@Injectable()
export class RecommendationsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate CFO recommendations based on financial data
     */
    async getRecommendations(organizationId: string): Promise<CFORecommendation[]> {
        // Get financial metrics
        const metrics = await this.getFinancialContext(organizationId);
        const recommendations: CFORecommendation[] = [];

        // 1. SaaS Optimization (if SaaS > 15% of burn)
        if (metrics.saasSpend > metrics.monthlyBurn * 0.15) {
            const potentialSavings = metrics.saasSpend * 0.25; // 25% reduction
            recommendations.push({
                id: 'saas-optimization',
                type: 'cost_reduction',
                title: 'Cut unused SaaS subscriptions',
                description: `Your SaaS spend (₹${this.formatCurrency(metrics.saasSpend)}/mo) is ${Math.round(metrics.saasSpend / metrics.monthlyBurn * 100)}% of burn. Review and cut unused tools.`,
                confidence: 'HIGH',
                impact: {
                    savings: potentialSavings,
                    runwayImpact: this.calculateRunwayImpact(metrics.currentCash, metrics.netBurn, potentialSavings),
                },
                urgency: metrics.runway < 6 ? 'CRITICAL' : 'HIGH',
                category: 'SaaS',
                actionable: true,
                simulationParams: { saasSpend: metrics.saasSpend - potentialSavings },
            });
        }

        // 2. Hiring Freeze (if runway < 9 months)
        if (metrics.runway < 9 && metrics.headcount > 3) {
            const hireCost = metrics.avgSalary;
            recommendations.push({
                id: 'hiring-freeze',
                type: 'runway_extension',
                title: 'Delay next hire to extend runway',
                description: `Each new hire costs ₹${this.formatCurrency(hireCost)}/mo. Delaying 1 hire extends runway by ${(hireCost / metrics.netBurn).toFixed(1)} months.`,
                confidence: 'HIGH',
                impact: {
                    savings: hireCost,
                    runwayImpact: hireCost / metrics.netBurn,
                },
                urgency: metrics.runway < 6 ? 'CRITICAL' : 'MEDIUM',
                category: 'Payroll',
                actionable: true,
                simulationParams: { headcount: metrics.headcount - 1 },
            });
        }

        // 3. Marketing ROI Review (if marketing > 20% of burn)
        if (metrics.marketingSpend > metrics.monthlyBurn * 0.20) {
            const potentialCut = metrics.marketingSpend * 0.30;
            recommendations.push({
                id: 'marketing-roi',
                type: 'cost_reduction',
                title: 'Review marketing spend ROI',
                description: `Marketing (₹${this.formatCurrency(metrics.marketingSpend)}/mo) is ${Math.round(metrics.marketingSpend / metrics.monthlyBurn * 100)}% of burn. Cut underperforming channels.`,
                confidence: 'MEDIUM',
                impact: {
                    savings: potentialCut,
                    runwayImpact: this.calculateRunwayImpact(metrics.currentCash, metrics.netBurn, potentialCut),
                },
                urgency: 'MEDIUM',
                category: 'Marketing',
                actionable: true,
                simulationParams: { marketingSpend: metrics.marketingSpend - potentialCut },
            });
        }

        // 4. Revenue Focus (if revenue growth < 10%)
        if (metrics.revenueGrowth < 10) {
            const targetRevenue = metrics.monthlyRevenue * 1.20;
            recommendations.push({
                id: 'revenue-focus',
                type: 'revenue_growth',
                title: 'Focus on revenue growth over burn reduction',
                description: `Revenue grew only ${metrics.revenueGrowth}% last month. A 20% increase extends runway more than cutting costs.`,
                confidence: 'MEDIUM',
                impact: {
                    savings: metrics.monthlyRevenue * 0.20,
                    runwayImpact: (metrics.monthlyRevenue * 0.20) / metrics.netBurn,
                },
                urgency: 'HIGH',
                category: 'Revenue',
                actionable: false,
            });
        }

        // 5. Critical Runway Warning
        if (metrics.runway < 6) {
            recommendations.unshift({
                id: 'runway-critical',
                type: 'risk_mitigation',
                title: 'CRITICAL: Runway below 6 months',
                description: `At current burn, you have ${metrics.runway.toFixed(1)} months runway. Immediate action required: cut 25% costs OR raise bridge round.`,
                confidence: 'HIGH',
                impact: {
                    savings: metrics.netBurn * 0.25,
                    runwayImpact: 2.5,
                },
                urgency: 'CRITICAL',
                category: 'Runway',
                actionable: true,
            });
        }

        // 6. Pricing Power
        if (metrics.monthlyRevenue > 100000 && metrics.revenueGrowth > 5) {
            const priceIncrease = metrics.monthlyRevenue * 0.10;
            recommendations.push({
                id: 'pricing-power',
                type: 'revenue_growth',
                title: 'Consider 10% price increase',
                description: `With steady growth, a 10% price increase could add ₹${this.formatCurrency(priceIncrease)}/mo without significant churn.`,
                confidence: 'LOW',
                impact: {
                    savings: priceIncrease,
                    runwayImpact: priceIncrease / metrics.netBurn,
                },
                urgency: 'LOW',
                category: 'Pricing',
                actionable: false,
            });
        }

        // Sort by urgency and confidence
        return this.prioritizeRecommendations(recommendations);
    }

    /**
     * Get risk assessment
     */
    async getRisks(organizationId: string): Promise<RiskItem[]> {
        const metrics = await this.getFinancialContext(organizationId);
        const risks: RiskItem[] = [];

        // 1. Runway Risk
        if (metrics.runway < 12) {
            const daysUntil6Months = Math.max(0, (metrics.runway - 6) * 30);
            risks.push({
                id: 'runway-risk',
                severity: metrics.runway < 6 ? 'HIGH' : metrics.runway < 9 ? 'MEDIUM' : 'LOW',
                title: `Runway drops below 6 months in ${daysUntil6Months} days`,
                description: `Current runway: ${metrics.runway.toFixed(1)} months. Burn: ₹${this.formatCurrency(metrics.netBurn)}/mo.`,
                probability: metrics.runway < 6 ? 95 : metrics.runway < 9 ? 70 : 40,
                impact: 'CRITICAL',
                daysUntilCritical: daysUntil6Months,
                mitigation: `Cut ₹${this.formatCurrency(metrics.netBurn * 0.25)}/mo or close bridge round within ${Math.round(daysUntil6Months / 7)} weeks`,
                affectedMetric: 'runway',
            });
        }

        // 2. Revenue Concentration Risk
        // In production, this would analyze customer data
        const concentrationRisk = 42; // Mock: 42% from single customer
        if (concentrationRisk > 30) {
            risks.push({
                id: 'concentration-risk',
                severity: concentrationRisk > 50 ? 'HIGH' : 'MEDIUM',
                title: `Single customer = ${concentrationRisk}% of revenue`,
                description: 'Losing this customer would severely impact cash flow and runway.',
                probability: 35,
                impact: 'SEVERE',
                mitigation: 'Diversify with 2-3 more enterprise clients',
                affectedMetric: 'revenue',
            });
        }

        // 3. Burn Acceleration Risk
        if (metrics.burnGrowth > 15) {
            risks.push({
                id: 'burn-acceleration',
                severity: metrics.burnGrowth > 25 ? 'HIGH' : 'MEDIUM',
                title: 'Burn increasing faster than revenue',
                description: `Burn grew ${metrics.burnGrowth}% vs revenue ${metrics.revenueGrowth}%.`,
                probability: 60,
                impact: 'MODERATE',
                mitigation: 'Review and freeze non-essential spending categories',
                affectedMetric: 'burn',
            });
        }

        // 4. Fixed Cost Creep
        const fixedCostRatio = 0.65; // Mock
        if (fixedCostRatio > 0.60) {
            risks.push({
                id: 'fixed-cost-creep',
                severity: 'LOW',
                title: 'Fixed costs rising as % of total',
                description: `${Math.round(fixedCostRatio * 100)}% of costs are fixed. Reduces flexibility.`,
                probability: 25,
                impact: 'MODERATE',
                mitigation: 'Shift to variable cost model where possible (contractors vs FTE)',
                affectedMetric: 'expenses',
            });
        }

        // 5. Compliance Risk (upcoming deadlines)
        const upcomingDeadlines = await this.getUpcomingDeadlines(organizationId);
        if (upcomingDeadlines.length > 0) {
            risks.push({
                id: 'compliance-risk',
                severity: 'MEDIUM',
                title: `${upcomingDeadlines.length} compliance deadlines in next 30 days`,
                description: 'Missing tax/regulatory deadlines incurs penalties.',
                probability: 20,
                impact: 'MODERATE',
                daysUntilCritical: 7,
                mitigation: 'Complete TDS, GST filings before due dates',
                affectedMetric: 'compliance',
            });
        }

        return risks.sort((a, b) => {
            const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Generate monthly narrative for founders
     */
    async getMonthlyNarrative(organizationId: string): Promise<{
        month: string;
        year: number;
        narrative: string;
        highlights: { metric: string; value: string; change: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
        focus: string;
    }> {
        const metrics = await this.getFinancialContext(organizationId);
        const month = new Date().toLocaleString('en-IN', { month: 'long' });
        const year = new Date().getFullYear();

        // Generate narrative
        const highlights = [
            {
                metric: 'Revenue',
                value: `₹${this.formatCurrency(metrics.monthlyRevenue)}`,
                change: `${metrics.revenueGrowth > 0 ? '+' : ''}${metrics.revenueGrowth}%`,
                sentiment: metrics.revenueGrowth > 0 ? 'positive' as const : 'negative' as const,
            },
            {
                metric: 'Burn',
                value: `₹${this.formatCurrency(metrics.netBurn)}`,
                change: `${metrics.burnGrowth > 0 ? '+' : ''}${metrics.burnGrowth}%`,
                sentiment: metrics.burnGrowth < 0 ? 'positive' as const : 'negative' as const,
            },
            {
                metric: 'Runway',
                value: `${metrics.runway.toFixed(1)} months`,
                change: `${metrics.runwayChange > 0 ? '+' : ''}${metrics.runwayChange.toFixed(1)}`,
                sentiment: metrics.runwayChange > 0 ? 'positive' as const : 'negative' as const,
            },
        ];

        // Create narrative text
        const revenueNarrative = metrics.revenueGrowth > 0
            ? `revenue grew ${metrics.revenueGrowth}%`
            : `revenue declined ${Math.abs(metrics.revenueGrowth)}%`;

        const burnNarrative = metrics.burnGrowth > 0
            ? `burn increased ${metrics.burnGrowth}% primarily due to ${metrics.burnGrowth > 15 ? 'scaling infrastructure' : 'operational costs'}`
            : `burn decreased ${Math.abs(metrics.burnGrowth)}%`;

        const focus = metrics.runway < 9
            ? 'extending runway through cost optimization'
            : metrics.revenueGrowth < 10
                ? 'accelerating revenue growth'
                : 'maintaining healthy unit economics';

        const narrative = `In ${month}, ${revenueNarrative}, while ${burnNarrative}. Current runway stands at ${metrics.runway.toFixed(1)} months. Focus should be on ${focus} to maintain ${metrics.runway < 9 ? 'survival' : 'growth'} trajectory.`;

        return {
            month,
            year,
            narrative,
            highlights,
            focus,
        };
    }

    /**
     * Get contextual AI prompts based on current financial state
     */
    async getContextualPrompts(organizationId: string): Promise<string[]> {
        const metrics = await this.getFinancialContext(organizationId);
        const prompts: string[] = [];

        // Always relevant
        prompts.push('What should I focus on this week?');

        // Runway-based prompts
        if (metrics.runway < 9) {
            prompts.push('How do I extend runway by 3 months?');
            prompts.push('What costs can I cut immediately?');
        }

        // Burn-based prompts
        if (metrics.burnGrowth > 10) {
            prompts.push('Why did my burn increase this month?');
        }

        // Revenue-based prompts
        if (metrics.revenueGrowth < 10) {
            prompts.push('How can I accelerate revenue growth?');
        }

        // Hiring-related
        if (metrics.runway > 12) {
            prompts.push('Can I afford to hire in the next quarter?');
        }

        // Investor-related
        prompts.push('What should I tell investors about this month?');

        return prompts.slice(0, 5); // Max 5 prompts
    }

    // ==================== PRIVATE HELPERS ====================

    private async getFinancialContext(organizationId: string) {
        // Use mock/default values for demo (in production, would query actual data)
        // This avoids TypeScript errors with schema fields
        const currentCash = 2000000;
        const monthlyRevenue = 320000;
        const monthlyBurn = 240000;
        const saasSpend = 50000;
        const marketingSpend = 80000;
        const headcount = 5;
        const avgSalary = 100000;

        const netBurn = Math.max(0, monthlyBurn - monthlyRevenue);
        const runway = netBurn > 0 ? currentCash / netBurn : 999;

        // Mock growth rates for demo
        const revenueGrowth = 18;
        const burnGrowth = 12;

        return {
            currentCash,
            monthlyRevenue,
            monthlyBurn,
            netBurn,
            runway,
            saasSpend,
            marketingSpend,
            headcount,
            avgSalary,
            revenueGrowth,
            burnGrowth,
            runwayChange: -0.5,
        };
    }

    private async getUpcomingDeadlines(organizationId: string) {
        // Return mock deadlines for demo
        return [
            { id: '1', title: 'TDS Q4 Filing', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { id: '2', title: 'GST Monthly Return', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
        ];
    }

    private calculateRunwayImpact(cash: number, currentBurn: number, savings: number): number {
        const newBurn = Math.max(0, currentBurn - savings);
        if (newBurn === 0) return 999;
        const newRunway = cash / newBurn;
        const currentRunway = currentBurn > 0 ? cash / currentBurn : 999;
        return newRunway - currentRunway;
    }

    private formatCurrency(amount: number): string {
        if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
        return `${amount}`;
    }

    private prioritizeRecommendations(recs: CFORecommendation[]): CFORecommendation[] {
        const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const confidenceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

        return recs.sort((a, b) => {
            const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (urgencyDiff !== 0) return urgencyDiff;
            return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        });
    }
}
