import { Injectable } from '@nestjs/common';

export interface UnitEconomicsMetrics {
    cac: number;                    // Customer Acquisition Cost
    ltv: number;                    // Customer Lifetime Value
    ltvCacRatio: number;            // LTV:CAC ratio
    paybackPeriod: number;          // Months to recover CAC
    grossMargin: number;            // Gross margin percentage
    arpu: number;                   // Average Revenue Per User
    churnRate: number;              // Monthly churn rate
    averageCustomerLifespan: number; // In months
    mrr: number;                    // Monthly Recurring Revenue
    arr: number;                    // Annual Recurring Revenue
    healthScore: number;            // Overall unit economics health (0-100)
    healthStatus: 'excellent' | 'good' | 'needs_work' | 'critical';
}

export interface CohortData {
    month: string;
    customersAcquired: number;
    revenueMonth1: number;
    revenueMonth3: number;
    revenueMonth6: number;
    revenueMonth12: number;
    retentionMonth1: number;
    retentionMonth3: number;
    retentionMonth6: number;
    retentionMonth12: number;
}

export interface DecisionImpact {
    scenario: string;
    cacChange: number;
    ltvChange: number;
    paybackChange: number;
    recommendation: string;
    impact: 'positive' | 'negative' | 'neutral';
}

@Injectable()
export class UnitEconomicsService {
    /**
     * Calculate comprehensive unit economics metrics for an organization
     */
    async calculateMetrics(organizationId: string): Promise<UnitEconomicsMetrics> {
        // In production, these would be fetched from database
        // For now, using realistic mock data for a SaaS startup

        const totalMarketingSpend = 850000; // Last 12 months
        const totalSalesSpend = 450000;
        const customersAcquired = 48;
        const mrr = 320000;
        const totalCustomers = 145;
        const customersChurned = 8; // Last 12 months
        const cogs = 112000; // Cost of goods sold (monthly)

        // Calculate CAC
        const cac = (totalMarketingSpend + totalSalesSpend) / customersAcquired;

        // Calculate ARPU
        const arpu = mrr / totalCustomers;

        // Calculate Gross Margin
        const grossMargin = ((mrr - cogs) / mrr) * 100;

        // Calculate Churn Rate (monthly)
        const churnRate = (customersChurned / 12) / totalCustomers * 100;

        // Calculate Average Customer Lifespan
        const averageCustomerLifespan = 100 / churnRate; // 1 / churn rate in months

        // Calculate LTV
        const ltv = arpu * averageCustomerLifespan * (grossMargin / 100);

        // Calculate LTV:CAC Ratio
        const ltvCacRatio = ltv / cac;

        // Calculate Payback Period (months)
        const monthlyContributionMargin = arpu * (grossMargin / 100);
        const paybackPeriod = cac / monthlyContributionMargin;

        // Calculate ARR
        const arr = mrr * 12;

        // Calculate Health Score (0-100)
        let healthScore = 0;

        // LTV:CAC ratio scoring (ideal > 3)
        if (ltvCacRatio >= 5) healthScore += 30;
        else if (ltvCacRatio >= 3) healthScore += 25;
        else if (ltvCacRatio >= 2) healthScore += 15;
        else if (ltvCacRatio >= 1) healthScore += 5;

        // Payback period scoring (ideal < 12 months)
        if (paybackPeriod <= 6) healthScore += 25;
        else if (paybackPeriod <= 12) healthScore += 20;
        else if (paybackPeriod <= 18) healthScore += 10;
        else if (paybackPeriod <= 24) healthScore += 5;

        // Gross margin scoring (ideal > 70%)
        if (grossMargin >= 80) healthScore += 25;
        else if (grossMargin >= 70) healthScore += 20;
        else if (grossMargin >= 60) healthScore += 15;
        else if (grossMargin >= 50) healthScore += 10;

        // Churn rate scoring (ideal < 2%)
        if (churnRate <= 1) healthScore += 20;
        else if (churnRate <= 2) healthScore += 15;
        else if (churnRate <= 5) healthScore += 10;
        else if (churnRate <= 10) healthScore += 5;

        // Determine health status
        let healthStatus: 'excellent' | 'good' | 'needs_work' | 'critical';
        if (healthScore >= 80) healthStatus = 'excellent';
        else if (healthScore >= 60) healthStatus = 'good';
        else if (healthScore >= 40) healthStatus = 'needs_work';
        else healthStatus = 'critical';

        return {
            cac: Math.round(cac),
            ltv: Math.round(ltv),
            ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
            paybackPeriod: Math.round(paybackPeriod * 10) / 10,
            grossMargin: Math.round(grossMargin * 10) / 10,
            arpu: Math.round(arpu),
            churnRate: Math.round(churnRate * 100) / 100,
            averageCustomerLifespan: Math.round(averageCustomerLifespan * 10) / 10,
            mrr,
            arr,
            healthScore,
            healthStatus,
        };
    }

    /**
     * Get cohort analysis data
     */
    async getCohortAnalysis(organizationId: string): Promise<CohortData[]> {
        // Mock cohort data for demonstration
        const cohorts: CohortData[] = [
            {
                month: 'Sep 2025',
                customersAcquired: 12,
                revenueMonth1: 48000,
                revenueMonth3: 42000,
                revenueMonth6: 38000,
                revenueMonth12: 32000,
                retentionMonth1: 100,
                retentionMonth3: 92,
                retentionMonth6: 83,
                retentionMonth12: 75,
            },
            {
                month: 'Oct 2025',
                customersAcquired: 15,
                revenueMonth1: 60000,
                revenueMonth3: 54000,
                revenueMonth6: 48000,
                revenueMonth12: 0,
                retentionMonth1: 100,
                retentionMonth3: 93,
                retentionMonth6: 87,
                retentionMonth12: 0,
            },
            {
                month: 'Nov 2025',
                customersAcquired: 10,
                revenueMonth1: 40000,
                revenueMonth3: 36000,
                revenueMonth6: 0,
                revenueMonth12: 0,
                retentionMonth1: 100,
                retentionMonth3: 90,
                retentionMonth6: 0,
                retentionMonth12: 0,
            },
            {
                month: 'Dec 2025',
                customersAcquired: 18,
                revenueMonth1: 72000,
                revenueMonth3: 0,
                revenueMonth6: 0,
                revenueMonth12: 0,
                retentionMonth1: 100,
                retentionMonth3: 0,
                retentionMonth6: 0,
                retentionMonth12: 0,
            },
            {
                month: 'Jan 2026',
                customersAcquired: 14,
                revenueMonth1: 56000,
                revenueMonth3: 0,
                revenueMonth6: 0,
                revenueMonth12: 0,
                retentionMonth1: 100,
                retentionMonth3: 0,
                retentionMonth6: 0,
                retentionMonth12: 0,
            },
        ];

        return cohorts;
    }

    /**
     * Calculate decision impact on unit economics
     */
    async calculateDecisionImpact(
        organizationId: string,
        decision: {
            type: 'increase_marketing' | 'reduce_churn' | 'raise_prices' | 'cut_cogs' | 'expand_sales';
            magnitude: number; // percentage change
        }
    ): Promise<DecisionImpact> {
        const currentMetrics = await this.calculateMetrics(organizationId);

        let cacChange = 0;
        let ltvChange = 0;
        let paybackChange = 0;
        let recommendation = '';
        let impact: 'positive' | 'negative' | 'neutral' = 'neutral';

        switch (decision.type) {
            case 'increase_marketing':
                cacChange = decision.magnitude * 0.8; // CAC increases but less than spend
                ltvChange = decision.magnitude * 0.3; // Slight LTV increase from better customers
                paybackChange = decision.magnitude * 0.6;
                recommendation = cacChange > ltvChange
                    ? 'Marketing increase may hurt unit economics. Consider targeting higher-value segments.'
                    : 'Marketing increase should improve customer acquisition efficiency.';
                impact = cacChange > ltvChange ? 'negative' : 'positive';
                break;

            case 'reduce_churn':
                cacChange = 0;
                ltvChange = decision.magnitude * 1.5; // LTV improves significantly
                paybackChange = -decision.magnitude * 0.5;
                recommendation = 'Reducing churn is the highest-leverage activity for improving unit economics.';
                impact = 'positive';
                break;

            case 'raise_prices':
                cacChange = decision.magnitude * 0.2; // Slightly harder to acquire
                ltvChange = decision.magnitude * 1.2; // But higher LTV
                paybackChange = -decision.magnitude * 0.8;
                recommendation = ltvChange > cacChange
                    ? 'Price increase will improve unit economics if churn stays stable.'
                    : 'Monitor churn closely after price increase.';
                impact = 'positive';
                break;

            case 'cut_cogs':
                cacChange = 0;
                ltvChange = decision.magnitude * 0.7;
                paybackChange = -decision.magnitude * 0.4;
                recommendation = 'Reducing COGS improves gross margin and LTV. Ensure quality isn\'t affected.';
                impact = 'positive';
                break;

            case 'expand_sales':
                cacChange = decision.magnitude * 0.5;
                ltvChange = decision.magnitude * 0.4;
                paybackChange = decision.magnitude * 0.3;
                recommendation = 'Sales expansion increases CAC but can improve customer quality. Track deal sizes.';
                impact = ltvChange >= cacChange ? 'positive' : 'negative';
                break;
        }

        return {
            scenario: decision.type.replace(/_/g, ' '),
            cacChange: Math.round(cacChange * 10) / 10,
            ltvChange: Math.round(ltvChange * 10) / 10,
            paybackChange: Math.round(paybackChange * 10) / 10,
            recommendation,
            impact,
        };
    }

    /**
     * Get all decision scenarios with their impacts
     */
    async getAllDecisionScenarios(organizationId: string): Promise<DecisionImpact[]> {
        const scenarios = [
            { type: 'increase_marketing' as const, magnitude: 20 },
            { type: 'reduce_churn' as const, magnitude: 25 },
            { type: 'raise_prices' as const, magnitude: 15 },
            { type: 'cut_cogs' as const, magnitude: 10 },
            { type: 'expand_sales' as const, magnitude: 30 },
        ];

        const impacts = await Promise.all(
            scenarios.map(s => this.calculateDecisionImpact(organizationId, s))
        );

        return impacts;
    }
}
