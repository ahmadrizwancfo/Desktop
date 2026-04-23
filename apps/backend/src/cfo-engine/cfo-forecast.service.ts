import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoMetricsService } from './cfo-metrics.service';

@Injectable()
export class CfoForecastService {
    private readonly logger = new Logger(CfoForecastService.name);

    constructor(
        private prisma: PrismaService,
        private cfoMetrics: CfoMetricsService
    ) { }

    /**
     * Compute explicit true daily burn relying on 30-day lookback window.
     */
    async generateForecast(userId: string, organizationId: string) {
        const metrics = await this.cfoMetrics.getLatestMetrics(userId);
        if (!metrics) return null;

        const profile = await this.prisma.startupProfile.findFirst({
            where: { organizationId }
        });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                bankAccount: { organizationId },
                date: { gte: thirtyDaysAgo }
            }
        });

        let totalExpense = 0;
        let totalIncome = 0;

        for (const t of transactions) {
            const amount = Number(t.amount);
            if (t.type === 'EXPENSE') {
                let multiplier = 1.0;
                
                // Active System Adjustments
                if (profile?.targetBurn) multiplier *= profile.targetBurn;
                if (profile?.growthMode) {
                    if (t.category.toLowerCase().includes('marketing') || t.category.toLowerCase().includes('ads')) {
                        multiplier *= profile.marketingMultiplier;
                    }
                    if (t.category.toLowerCase().includes('sales')) {
                        multiplier *= profile.salesMultiplier;
                    }
                }
                
                totalExpense += amount * multiplier;
            } else if (t.type === 'INCOME') {
                totalIncome += amount;
            }
        }

        const dailyBurnRate = totalExpense / 30;
        const netDailyBurnRate = (totalExpense - totalIncome) / 30;

        let runway_days_remaining = 9999;
        let estimated_zero_cash_date: Date | null = null;

        if (netDailyBurnRate > 0) {
            runway_days_remaining = metrics.cashBalance / netDailyBurnRate;
            estimated_zero_cash_date = new Date(Date.now() + runway_days_remaining * 24 * 60 * 60 * 1000);
        }

        return {
            dailyBurnRate,
            netDailyBurnRate,
            runway_days_remaining: Math.round(runway_days_remaining),
            estimated_zero_cash_date,
            cashBalance: metrics.cashBalance,
            activeAdjustments: {
                targetBurn: profile?.targetBurn || 1.0,
                hiringFreeze: profile?.hiringFreeze || false,
                growthMode: profile?.growthMode || false
            }
        };
    }

    /**
     * Simulation sandbox injecting multiplier rules.
     */
    async simulateScenario(userId: string, organizationId: string, modifiers: { burnInc?: number, revDrop?: number, addedCosts?: number }) {
        const base = await this.generateForecast(userId, organizationId);
        if (!base) return null;

        const { burnInc = 0, revDrop = 0, addedCosts = 0 } = modifiers;

        // Reconstruct base totals tracking for 30 days
        const currentDailyExpense = base.dailyBurnRate;
        const currentDailyIncome = currentDailyExpense - base.netDailyBurnRate;

        // Apply impacts
        const newDailyExpense = (currentDailyExpense * (1 + burnInc)) + (addedCosts / 30);
        const newDailyIncome = currentDailyIncome * (1 - revDrop);

        const newNetDailyBurnRate = newDailyExpense - newDailyIncome;

        let new_runway_days_remaining = 9999;
        let new_estimated_zero_cash_date: Date | null = null;

        if (newNetDailyBurnRate > 0) {
            new_runway_days_remaining = base.cashBalance / newNetDailyBurnRate;
            new_estimated_zero_cash_date = new Date(Date.now() + new_runway_days_remaining * 24 * 60 * 60 * 1000);
        }

        let newRiskLevel = 'LOW';
        if (new_runway_days_remaining < 90) newRiskLevel = 'CRITICAL';
        else if (new_runway_days_remaining < 180) newRiskLevel = 'HIGH';
        else if (new_runway_days_remaining < 360) newRiskLevel = 'MEDIUM';

        return {
            new_daily_burn: newDailyExpense,
            new_runway_days_remaining: Math.round(new_runway_days_remaining),
            new_estimated_zero_cash_date,
            newRiskLevel,
            confidence: Math.max(60, 95 - (burnInc * 100) - (revDrop * 100)), // Scale confidence down by uncertainty
            assumptions: [
                'Revenue remains constant unless modified',
                'One-off expenses are excluded',
                'Historical spending patterns persist',
                revDrop > 0 ? `Revenue drops by ${Math.round(revDrop * 100)}%` : 'No revenue drop assumed',
                burnInc > 0 ? `Costs increase by ${Math.round(burnInc * 100)}%` : 'No cost increase assumed'
            ]
        };
    }
}
