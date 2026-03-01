import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateDto } from './dto/calculate.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';

@Injectable()
export class SimulatorService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate runway and burn based on input variables
     * This is the core algorithm that powers the Decision Simulator
     */
    calculate(dto: CalculateDto) {
        const {
            headcount = 0,
            avgSalary = 100000,
            saasSpend = 0,
            marketingSpend = 0,
            otherExpenses = 0,
            monthlyRevenue = 0,
            currentCash = 0
        } = dto;

        // Calculate total monthly burn
        const payrollCost = headcount * avgSalary;
        const totalMonthlyBurn = payrollCost + saasSpend + marketingSpend + otherExpenses;

        // Net burn (expenses - revenue)
        const netBurn = totalMonthlyBurn - monthlyRevenue;

        // Runway calculation
        const runway = netBurn > 0 ? currentCash / netBurn : 999; // 999 = profitable

        // Calculate 12-month projection with confidence bands
        const forecast = this.generateForecast(currentCash, totalMonthlyBurn, monthlyRevenue);

        // Calculate impact of each variable
        const impacts = {
            headcount: {
                perUnit: avgSalary, // Cost per additional headcount
                runwayImpact: netBurn > 0 ? -avgSalary / netBurn : 0
            },
            saasSpend: {
                perUnit: 10000, // Per ₹10K change
                runwayImpact: netBurn > 0 ? 10000 / netBurn : 0
            },
            marketing: {
                perUnit: 10000,
                runwayImpact: netBurn > 0 ? 10000 / netBurn : 0
            },
            revenue: {
                perUnit: 50000, // Per ₹50K change
                runwayImpact: netBurn > 0 ? 50000 / netBurn : 0
            }
        };

        return {
            // Current state
            currentCash,
            monthlyRevenue,

            // Calculated burn
            payrollCost,
            totalMonthlyBurn,
            netBurn: Math.max(0, netBurn),

            // Runway
            runway: Math.round(runway * 10) / 10, // Round to 1 decimal
            runwayMonths: runway >= 999 ? 'Profitable' : `${Math.round(runway * 10) / 10} months`,

            // Forecast
            forecast,

            // Impacts for slider feedback
            impacts,

            // Quick insights
            insights: this.generateInsights(runway, netBurn, payrollCost, saasSpend, marketingSpend)
        };
    }

    /**
     * Generate 12-month cash forecast with confidence bands
     */
    private generateForecast(startCash: number, monthlyBurn: number, monthlyRevenue: number) {
        const months = 12;
        const forecast: { month: string; baseline: number; optimistic: number; conservative: number }[] = [];
        let currentMonth = new Date();

        // Baseline assumptions
        let baselineCash = startCash;

        // Optimistic assumptions: Revenue +20% YoY (1.6% MoM), Cost -10% YoY (-0.8% MoM)
        let optimisticCash = startCash;
        let optRevenue = monthlyRevenue;
        let optBurn = monthlyBurn;

        // Conservative assumptions: Revenue -20% YoY, Cost +10% YoY
        let conservativeCash = startCash;
        let consRevenue = monthlyRevenue;
        let consBurn = monthlyBurn;

        for (let i = 0; i < months; i++) {
            // Baseline: Flat growth for simplicity in baseline
            baselineCash -= (monthlyBurn - monthlyRevenue);

            // Optimistic
            optRevenue *= 1.016;
            optBurn *= 0.992;
            optimisticCash -= (optBurn - optRevenue);

            // Conservative
            consRevenue *= 0.984; // ~ -20% annual
            consBurn *= 1.008; // ~ +10% annual
            conservativeCash -= (consBurn - consRevenue);

            forecast.push({
                month: currentMonth.toLocaleString('default', { month: 'short' }),
                baseline: Math.max(0, Math.round(baselineCash)),
                optimistic: Math.max(0, Math.round(optimisticCash)),
                conservative: Math.max(0, Math.round(conservativeCash)),
            });

            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        return forecast;
    }

    /**
     * Calculate Break-Even Point
     */
    calculateBreakEven(fixedCosts: number, avgRevenuePerUnit: number, variableCostPerUnit: number) {
        const contributionMargin = avgRevenuePerUnit - variableCostPerUnit;

        if (contributionMargin <= 0) {
            return {
                breakEvenUnits: Infinity,
                breakEvenRevenue: Infinity,
                contributionMargin,
                isAchievable: false,
                message: 'Variable costs exceed revenue per unit. Unit economics are negative.'
            };
        }

        const breakEvenUnits = Math.ceil(fixedCosts / contributionMargin);
        const breakEvenRevenue = breakEvenUnits * avgRevenuePerUnit;

        return {
            breakEvenUnits,
            breakEvenRevenue,
            contributionMargin,
            contributionMarginRatio: (contributionMargin / avgRevenuePerUnit) * 100,
            isAchievable: true,
            message: `Need to sell ${breakEvenUnits} units to break even.`
        };
    }

    /**
     * Generate actionable insights based on current numbers
     */
    private generateInsights(runway: number, netBurn: number, payroll: number, saas: number, marketing: number) {
        const insights: { type: string; message: string }[] = [];

        if (runway < 6) {
            insights.push({
                type: 'critical',
                message: `Cash runway is ${runway.toFixed(1)} months - consider cost reduction immediately`
            });
        }

        if (saas > payroll * 0.3) {
            insights.push({
                type: 'warning',
                message: `SaaS spend is ${Math.round(saas / payroll * 100)}% of payroll - review subscriptions`
            });
        }

        if (marketing > netBurn * 0.4 && runway < 12) {
            insights.push({
                type: 'info',
                message: `Marketing is ${Math.round(marketing / netBurn * 100)}% of burn - evaluate ROI`
            });
        }

        return insights;
    }

    /**
     * Save a scenario for future reference
     */
    async createScenario(organizationId: string, dto: CreateScenarioDto) {
        const calculation = this.calculate({
            headcount: dto.headcount,
            avgSalary: dto.avgSalary || 100000,
            saasSpend: dto.saasSpend,
            marketingSpend: dto.marketingSpend,
            monthlyRevenue: dto.monthlyRevenue,
            currentCash: dto.currentCash,
        });

        return this.prisma.scenario.create({
            data: {
                name: dto.name,
                organizationId,
                headcount: dto.headcount,
                monthlySalary: dto.avgSalary || 100000,
                saasSpend: dto.saasSpend,
                marketingSpend: dto.marketingSpend,
                monthlyRevenue: dto.monthlyRevenue,
                currentCash: dto.currentCash,
                projectedBurn: calculation.netBurn,
                projectedRunway: calculation.runway,
            }
        });
    }

    /**
     * Get all saved scenarios for an organization
     */
    async getScenarios(organizationId: string) {
        return this.prisma.scenario.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
    }

    /**
     * Get a single scenario
     */
    async getScenario(id: string) {
        return this.prisma.scenario.findUnique({
            where: { id }
        });
    }

    /**
     * Delete a scenario
     */
    async deleteScenario(id: string) {
        return this.prisma.scenario.delete({
            where: { id }
        });
    }

    /**
     * Compare multiple scenarios
     */
    async compareScenarios(scenarioIds: string[]) {
        const scenarios = await this.prisma.scenario.findMany({
            where: { id: { in: scenarioIds } }
        });

        return scenarios.map(scenario => ({
            id: scenario.id,
            name: scenario.name,
            headcount: scenario.headcount,
            burn: Number(scenario.projectedBurn),
            runway: scenario.projectedRunway,
            createdAt: scenario.createdAt
        }));
    }

    /**
     * Get baseline metrics from latest financial data
     */
    async getBaseline(organizationId: string) {
        const latestMetrics = await this.prisma.financialMetrics.findFirst({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' }
        });

        if (!latestMetrics) {
            // Return defaults if no data
            return {
                headcount: 5,
                avgSalary: 100000,
                saasSpend: 50000,
                marketingSpend: 80000,
                otherExpenses: 50000,
                monthlyRevenue: 200000,
                currentCash: 2000000,
            };
        }

        return {
            headcount: 5, // Default, can be enhanced with actual data
            avgSalary: 100000,
            saasSpend: 50000,
            marketingSpend: 80000,
            otherExpenses: 50000,
            monthlyRevenue: Number(latestMetrics.revenue) || 200000,
            currentCash: Number(latestMetrics.totalAssets) || 2000000,
        };
    }
}
