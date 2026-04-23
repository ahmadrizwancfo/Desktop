import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CfoBrainInsight {
    type: 'DIAGNOSTIC' | 'RISK' | 'ACTION';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    body: string;
    metric?: string;       // e.g. "₹4.4L/mo"
    category?: string;     // which spend category this relates to
    confidence: number;    // 0–1
    source: 'transaction_data' | 'trend_analysis' | 'projection';
}

// ─── Decision Engine V1 Output ────────────────────────────────────────────────

export interface DecisionEngineV1Output {
    /** Exact date the company runs out of money */
    deathClock: string;
    /** Days remaining (only shown when runway < 6 months) */
    daysLeft: number | null;
    /** The single most dangerous financial issue right now */
    criticalInsight: string;
    /** Binary forced decision: "You must X OR Y" */
    forcedDecision: string;
    /** 2-3 executable action steps — no fluff */
    actionPlan: string[];
    /** Secondary warnings (GST, liability, salary concentration, etc.) */
    secondaryWarnings: string[];
    /** Trust layer: transaction count + last sync info */
    trustLayer: string;
    /** Risk-adaptive tone of this briefing */
    tone: 'urgent' | 'cautious' | 'strategic';
    /** Special logic triggers that fired */
    triggers: string[];
    /** True when < 10 transactions — "no data" case */
    noDataCase: boolean;
    /** True when runway > 36 months or profitable */
    isInfiniteRunway: boolean;
}

export interface CfoBrainReport {
    generatedAt: string;
    organizationId: string;
    dataQuality: 'rich' | 'partial' | 'minimal';
    summary: {
        monthlyRevenue: number;
        monthlyExpenses: number;
        netBurn: number;
        cashInBank: number;
        runwayMonths: number;
        isSustainable: boolean;
        ghostLiabilities: number;
        topExpenseCategory: string;
        topExpenseAmount: number;
        burnTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
        revenueTrend: 'growing' | 'declining' | 'stable' | 'unknown';
        prevMonthlyRevenue: number;
        prevNetBurn: number;
    };
    insights: CfoBrainInsight[];
    categoryBreakdown: CategorySpend[];
    /** V1 Decision Engine: Death Clock, Forced Decisions, Action Plans */
    decisionEngine: DecisionEngineV1Output;
}

interface CategorySpend {
    category: string;
    amount: number;
    pct: number;                     // % of total expenses
    trend: 'up' | 'down' | 'stable' | 'new';
    prevAmount: number | null;       // last period's amount
    changePercent: number | null;    // MoM change
}

interface SnapshotRow {
    revenue: number;
    expenses: number;
    burn: number;
    cashBalance: number;
    snapshotDate: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
}

function pct(n: number): string {
    return `${Math.abs(Math.round(n))}%`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CfoBrainService {
    private readonly logger = new Logger(CfoBrainService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Generate a full CFO Brain report for an organization.
     * This is the main entry point — called after bank sync, manual trigger, or scheduler.
     */
    async generateReport(organizationId: string, userId?: string): Promise<CfoBrainReport> {
        this.logger.log(`Generating CFO Brain report for org ${organizationId}`);

        // ── 1. Gather raw data ───────────────────────────────────────────────
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true, balance: true },
        });
        const accountIds = bankAccounts.map(a => a.id);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Current period transactions (last 30 days)
        const currentTxs = await this.prisma.transaction.findMany({
            where: {
                bankAccountId: { in: accountIds },
                date: { gte: thirtyDaysAgo },
                deletedAt: null,
            },
            select: { amount: true, type: true, category: true, date: true, description: true },
        });

        // Previous period transactions (30–60 days ago) for trend comparison
        const prevTxs = await this.prisma.transaction.findMany({
            where: {
                bankAccountId: { in: accountIds },
                date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                deletedAt: null,
            },
            select: { amount: true, type: true, category: true },
        });

        // Historical snapshots for trend analysis
        const resolvedUserId = userId || await this.getOrgOwner(organizationId);
        const snapshots = resolvedUserId ? await this.prisma.financialSnapshot.findMany({
            where: { organizationId },
            orderBy: { snapshotDate: 'desc' },
            take: 6,
            select: { revenue: true, expenses: true, burn: true, cashBalance: true, snapshotDate: true },
        }) : [];

        // StartupProfile for context
        const profile = await this.prisma.startupProfile.findFirst({
            where: { organizationId },
            select: { stage: true, primaryGoal: true, teamSize: true },
        });

        // ── 2. Aggregate metrics (SSOT AUTHORITY LAYER) ──────────────────────
        // CORE PRINCIPLE: Strictly use 30-day trailing windows for all metrics.
        let monthlyRevenue = 0, monthlyExpenses = 0;
        const categorySums: Record<string, number> = {};
        const prevCategorySums: Record<string, number> = {};
        let prevRevenue = 0, prevExpenses = 0;

        for (const tx of currentTxs) {
            const amt = Number(tx.amount);
            if (tx.type === 'INCOME') {
                monthlyRevenue += amt;
            } else {
                monthlyExpenses += amt;
                const cat = tx.category || 'General';
                categorySums[cat] = (categorySums[cat] || 0) + amt;
            }
        }

        for (const tx of prevTxs) {
            const amt = Number(tx.amount);
            if (tx.type === 'INCOME') {
                prevRevenue += amt;
            } else {
                prevExpenses += amt;
                const cat = tx.category || 'General';
                prevCategorySums[cat] = (prevCategorySums[cat] || 0) + amt;
            }
        }

        /**
         * FORMULA: Net Burn = max(Expenses - Revenue, 0)
         * We do not assume negative burn (profit) as "negative expenses" for safety.
         */
        const netBurn = Math.max(0, monthlyExpenses - monthlyRevenue);

        /**
         * FORMULA: Cash = Total available balance across all active accounts.
         */
        const cashInBank = bankAccounts.reduce((s, a) => s + Number(a.balance), 0);
        
        /**
         * FORMULA: Ghost Liabilities (Conservative Buffer) = GST + TDS approximations (18% of monthly revenue)
         */
        const ghostLiabilities = monthlyRevenue * 0.18;

        /**
         * FORMULA: Real Runway = (Cash - Ghost_Liabilities) / Net Burn.
         */
        let isSustainable = false;
        let runwayMonths = 999;
        
        if (netBurn <= 0) {
            isSustainable = true;
        } else {
            runwayMonths = Math.min(Math.round(((cashInBank - ghostLiabilities) / Math.max(0.1, netBurn)) * 10) / 10, 36.0);
        }

        // ── 3. Category breakdown with trends ────────────────────────────────
        const allCategories = new Set([...Object.keys(categorySums), ...Object.keys(prevCategorySums)]);
        const categoryBreakdown: CategorySpend[] = [];

        for (const cat of allCategories) {
            const amount = categorySums[cat] || 0;
            const prevAmount = prevCategorySums[cat] || 0;
            const changePercent = prevAmount > 0
                ? Math.round(((amount - prevAmount) / prevAmount) * 100)
                : (amount > 0 ? 100 : 0);

            let trend: CategorySpend['trend'] = 'stable';
            if (prevAmount === 0 && amount > 0) trend = 'new';
            else if (changePercent > 10) trend = 'up';
            else if (changePercent < -10) trend = 'down';

            categoryBreakdown.push({
                category: cat,
                amount,
                pct: monthlyExpenses > 0 ? Math.round((amount / monthlyExpenses) * 100) : 0,
                trend,
                prevAmount: prevAmount > 0 ? prevAmount : null,
                changePercent: prevAmount > 0 ? changePercent : null,
            });
        }

        // Sort by amount descending
        categoryBreakdown.sort((a, b) => b.amount - a.amount);

        const topCategory = categoryBreakdown[0];

        // ── 4. Determine overall trends ──────────────────────────────────────
        const snapshotRows: SnapshotRow[] = snapshots.map(s => ({
            revenue: Number(s.revenue),
            expenses: Number(s.expenses),
            burn: Number(s.burn),
            cashBalance: Number(s.cashBalance),
            snapshotDate: s.snapshotDate,
        }));

        const burnTrend = this.computeTrend(
            prevExpenses > 0 ? prevExpenses - prevRevenue : null,
            netBurn,
        );
        const revenueTrend = this.computeRevenueTrend(prevRevenue, monthlyRevenue);

        const dataQuality: CfoBrainReport['dataQuality'] =
            currentTxs.length >= 10 && prevTxs.length >= 5 ? 'rich'
            : currentTxs.length >= 3 ? 'partial'
            : 'minimal';

        const integrationsCount = await this.prisma.integrationConnection.count({ where: { organizationId } });

        // ── 5. Generate insights ─────────────────────────────────────────────
        const insights: CfoBrainInsight[] = [];

        this.generateDiagnostics(insights, {
            monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
            prevRevenue, prevExpenses, categoryBreakdown, burnTrend, revenueTrend,
            profile,
        });

        this.generateRisks(insights, {
            monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
            categoryBreakdown, burnTrend, profile,
        });

        this.generateActions(insights, {
            monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
            categoryBreakdown, burnTrend, profile,
        });

        // Sort: critical first
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        this.logger.log(`CFO Brain: ${insights.length} insights generated (quality: ${dataQuality})`);

        // ── 6. Decision Engine V1 — the brutal-truth CFO layer ────────────
        const decisionEngine = this.generateDecisionEngineV1({
            monthlyRevenue,
            monthlyExpenses,
            netBurn,
            cashInBank,
            runwayMonths,
            isSustainable,
            ghostLiabilities,
            burnTrend,
            revenueTrend,
            categoryBreakdown,
            prevRevenue,
            prevExpenses,
            totalTransactions: currentTxs.length,
            dataQuality,
            profile,
            integrationsCount,
        });

        return {
            generatedAt: new Date().toISOString(),
            organizationId,
            dataQuality,
            summary: {
                monthlyRevenue,
                monthlyExpenses,
                netBurn,
                cashInBank,
                runwayMonths,
                isSustainable,
                ghostLiabilities,
                topExpenseCategory: topCategory?.category || 'N/A',
                topExpenseAmount: topCategory?.amount || 0,
                burnTrend,
                revenueTrend,
                prevMonthlyRevenue: prevRevenue,
                prevNetBurn: Math.max(0, prevExpenses - prevRevenue),
            },
            insights,
            categoryBreakdown,
            decisionEngine,
        };
    }

    // ─── DIAGNOSTIC Insights ──────────────────────────────────────────────────

    private generateDiagnostics(insights: CfoBrainInsight[], ctx: any): void {
        const { monthlyRevenue, monthlyExpenses, netBurn, prevRevenue, prevExpenses,
                categoryBreakdown, burnTrend, revenueTrend } = ctx;

        // D1: Burn change driver analysis
        if (prevExpenses > 0) {
            const burnChange = ((monthlyExpenses - prevExpenses) / prevExpenses) * 100;
            if (Math.abs(burnChange) > 5) {
                const increasedCats = categoryBreakdown
                    .filter((c: CategorySpend) => c.trend === 'up' && c.changePercent && c.changePercent > 15)
                    .slice(0, 3);
                const driverNames = increasedCats.length > 0
                    ? increasedCats.map((c: CategorySpend) => `${c.category} (+${c.changePercent}%)`).join(', ')
                    : 'multiple categories';

                insights.push({
                    type: 'DIAGNOSTIC',
                    severity: Math.abs(burnChange) > 25 ? 'high' : 'medium',
                    title: burnChange > 0 ? 'Burn rate increased' : 'Burn rate decreased',
                    body: burnChange > 0
                        ? `Your burn ${burnTrend === 'increasing' ? 'increased' : 'changed'} ${pct(burnChange)} this month, driven primarily by ${driverNames}. Monthly expenses went from ${fmt(prevExpenses)} → ${fmt(monthlyExpenses)}.`
                        : `Good news — your burn decreased ${pct(burnChange)} this month. Expenses dropped from ${fmt(prevExpenses)} → ${fmt(monthlyExpenses)}.`,
                    metric: fmt(netBurn) + '/mo',
                    confidence: 0.95,
                    source: 'transaction_data',
                });
            }
        }

        // D2: Revenue trend diagnostic
        if (prevRevenue > 0) {
            const revenueChange = ((monthlyRevenue - prevRevenue) / prevRevenue) * 100;
            if (Math.abs(revenueChange) > 5) {
                insights.push({
                    type: 'DIAGNOSTIC',
                    severity: revenueChange < -15 ? 'high' : revenueChange < 0 ? 'medium' : 'low',
                    title: revenueChange > 0 ? 'Revenue is growing' : 'Revenue declined',
                    body: revenueChange > 0
                        ? `Revenue grew ${pct(revenueChange)} month-over-month: ${fmt(prevRevenue)} → ${fmt(monthlyRevenue)}. Keep momentum — your trajectory supports sustainable scaling.`
                        : `Revenue dropped ${pct(revenueChange)} from ${fmt(prevRevenue)} → ${fmt(monthlyRevenue)}. Identify if this is seasonal, client churn, or pipeline delay.`,
                    metric: fmt(monthlyRevenue) + '/mo',
                    confidence: 0.93,
                    source: 'trend_analysis',
                });
            }
        }

        // D3: Concentration risk — if top category is >50% of spend
        const topCat = categoryBreakdown[0] as CategorySpend | undefined;
        if (topCat && topCat.pct > 50) {
            insights.push({
                type: 'DIAGNOSTIC',
                severity: topCat.pct > 70 ? 'high' : 'medium',
                title: `${topCat.category} dominates spending`,
                body: `${topCat.category} accounts for ${topCat.pct}% of total expenses (${fmt(topCat.amount)}/mo). High concentration means a single cost change here dramatically impacts your burn rate.`,
                category: topCat.category,
                confidence: 0.97,
                source: 'transaction_data',
            });
        }

        // D4: New expense category appeared
        const newCats = categoryBreakdown.filter((c: CategorySpend) => c.trend === 'new' && c.amount > 10000);
        for (const nc of newCats) {
            insights.push({
                type: 'DIAGNOSTIC',
                severity: nc.amount > 100000 ? 'medium' : 'low',
                title: `New spending: ${nc.category}`,
                body: `A new expense category "${nc.category}" appeared this month at ${fmt(nc.amount)}. This wasn't present in the prior period — verify this is expected.`,
                category: nc.category,
                metric: fmt(nc.amount),
                confidence: 0.90,
                source: 'transaction_data',
            });
        }
    }

    // ─── RISK Insights ────────────────────────────────────────────────────────

    private generateRisks(insights: CfoBrainInsight[], ctx: any): void {
        const { monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
                categoryBreakdown, burnTrend, profile } = ctx;

        // R1: Runway risk
        if (netBurn > 0 && !ctx.isSustainable) {
            let severity: CfoBrainInsight['severity'] = 'low';
            if (runwayMonths < 3) severity = 'critical';
            else if (runwayMonths < 6) severity = 'high';
            else if (runwayMonths < 9) severity = 'medium';

            const fundraiseCaveat = profile?.primaryGoal === 'RAISE'
                ? ` Fundraising typically takes 3–4 months — your window is ${runwayMonths < 6 ? 'closing' : 'open but limited'}.`
                : '';

            insights.push({
                type: 'RISK',
                severity,
                title: runwayMonths < 6 ? 'Runway is dangerously low' : 'Real Cash runway projection',
                body: `At current burn of ${fmt(netBurn)}/mo with ${fmt(cashInBank)} in bank (minus ${fmt(ctx.ghostLiabilities)} expected tax), you have ${runwayMonths >= 999 ? '∞' : runwayMonths.toFixed(1)} months of real runway.${fundraiseCaveat}`,
                metric: `${runwayMonths >= 999 ? '∞' : runwayMonths.toFixed(1)} months`,
                confidence: 0.97,
                source: 'projection',
            });
        }

        // R2: Burn acceleration risk
        if (burnTrend === 'increasing') {
            insights.push({
                type: 'RISK',
                severity: runwayMonths < 9 ? 'high' : 'medium',
                title: 'Burn rate is accelerating',
                body: `Your burn is trending upward month-over-month. If this continues, your ${runwayMonths.toFixed(1)}-month runway will shrink faster than projected. The top growing categories are: ${categoryBreakdown.filter((c: CategorySpend) => c.trend === 'up').slice(0, 2).map((c: CategorySpend) => c.category).join(', ') || 'various'}.`,
                confidence: 0.88,
                source: 'trend_analysis',
            });
        }

        // R3: Revenue dependency risk (expenses > 2x revenue)
        if (monthlyRevenue > 0 && monthlyExpenses > monthlyRevenue * 2) {
            const ratio = (monthlyExpenses / monthlyRevenue).toFixed(1);
            insights.push({
                type: 'RISK',
                severity: 'high',
                title: 'Expense-to-revenue ratio is critical',
                body: `You're spending ${ratio}× what you earn. Every ₹1 of revenue costs ₹${ratio} to generate. This ratio must come down for sustainability — target <1.5× within 60 days.`,
                metric: `${ratio}× ratio`,
                confidence: 0.94,
                source: 'transaction_data',
            });
        }

        // R4: Single-vendor risk (any category >40% and trending up)
        const riskyVendor = categoryBreakdown.find(
            (c: CategorySpend) => c.pct > 40 && c.trend === 'up'
        );
        if (riskyVendor) {
            insights.push({
                type: 'RISK',
                severity: 'medium',
                title: `Rising dependency on ${riskyVendor.category}`,
                body: `${riskyVendor.category} spending is ${fmt(riskyVendor.amount)}/mo (${riskyVendor.pct}% of expenses) and still growing${riskyVendor.changePercent ? ` (+${riskyVendor.changePercent}%)` : ''}. Diversify or renegotiate to reduce concentration risk.`,
                category: riskyVendor.category,
                confidence: 0.85,
                source: 'transaction_data',
            });
        }
    }

    // ─── ACTION Insights ──────────────────────────────────────────────────────

    private generateActions(insights: CfoBrainInsight[], ctx: any): void {
        const { monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
                categoryBreakdown, profile } = ctx;

        // A1: Cut top non-payroll expense to extend runway
        if (netBurn > 0) {
            const cuttable = categoryBreakdown.find(
                (c: CategorySpend) => c.category !== 'Payroll' && c.category !== 'Revenue' && c.amount > 0
            );
            if (cuttable) {
                const cutAmount = cuttable.amount * 0.15;
                const newBurn = Math.max(0, netBurn - cutAmount);
                const newRunway = newBurn > 0 ? cashInBank / newBurn : 999;
                const runwayGain = Math.max(0, newRunway - runwayMonths);

                insights.push({
                    type: 'ACTION',
                    severity: runwayMonths < 6 ? 'high' : 'medium',
                    title: `Reduce ${cuttable.category} spend by 15%`,
                    body: `Cutting ${cuttable.category} by 15% saves ${fmt(cutAmount)}/mo, reducing burn from ${fmt(netBurn)} → ${fmt(newBurn)}/mo. This extends runway by ~${runwayGain.toFixed(1)} months (${runwayMonths.toFixed(1)} → ${newRunway >= 999 ? '∞' : newRunway.toFixed(1)}).`,
                    category: cuttable.category,
                    metric: `+${runwayGain.toFixed(1)} months`,
                    confidence: 0.92,
                    source: 'projection',
                });
            }
        }

        // A2: Revenue growth impact
        if (monthlyRevenue > 0 && netBurn > 0) {
            const revenueBoost = monthlyRevenue * 0.20;
            const newBurn = Math.max(0, netBurn - revenueBoost);
            const newRunway = newBurn > 0 ? cashInBank / newBurn : 999;
            const runwayGain = Math.max(0, newRunway - runwayMonths);

            insights.push({
                type: 'ACTION',
                severity: 'medium',
                title: 'Grow revenue 20% to transform runway',
                body: `If revenue increases by 20% (${fmt(revenueBoost)}/mo), your burn drops to ${fmt(newBurn)}/mo and runway extends to ${newRunway >= 999 ? '∞ (profitable!)' : newRunway.toFixed(1) + ' months'} (+${runwayGain.toFixed(1)} months). Focus on top-line growth via upsells, new clients, or pricing optimization.`,
                metric: `+${fmt(revenueBoost)}/mo`,
                confidence: 0.85,
                source: 'projection',
            });
        }

        // A3: Fundraise timing recommendation
        if (profile?.primaryGoal === 'RAISE' && runwayMonths < 12) {
            const urgency = runwayMonths < 6 ? 'immediately' : 'within the next 30 days';
            insights.push({
                type: 'ACTION',
                severity: runwayMonths < 6 ? 'critical' : 'high',
                title: `Begin fundraising ${urgency}`,
                body: `With ${runwayMonths.toFixed(1)} months runway and a typical raise cycle of 3–4 months, you should start ${urgency}. Prepare: updated pitch deck, last 6 months' financials, and a clear use-of-funds plan. Target close before runway hits 3 months.`,
                metric: `${runwayMonths.toFixed(1)} mo left`,
                confidence: 0.90,
                source: 'projection',
            });
        }

        // A4: Hire timing (if team is small and runway supports it)
        if (profile?.teamSize && profile.teamSize < 10 && runwayMonths > 12 && monthlyRevenue > monthlyExpenses * 0.7) {
            insights.push({
                type: 'ACTION',
                severity: 'low',
                title: 'Runway supports a strategic hire',
                body: `With ${runwayMonths.toFixed(0)}-month runway and revenue at ${Math.round((monthlyRevenue / monthlyExpenses) * 100)}% of expenses, you can afford a hire at ~₹80K/mo. An engineering or sales hire could accelerate your path to profitability. Model the impact in the scenario simulator.`,
                confidence: 0.80,
                source: 'projection',
            });
        }

        // A5: Specific category cut — find the most inflated category
        const inflated = categoryBreakdown.find(
            (c: CategorySpend) => c.trend === 'up' && c.changePercent && c.changePercent > 30 && c.category !== 'Payroll'
        );
        if (inflated && netBurn > 0) {
            const overspend = inflated.amount - (inflated.prevAmount || 0);
            const savingsIfReverted = overspend;
            const newBurn = Math.max(0, netBurn - savingsIfReverted);
            const newRunway = newBurn > 0 ? cashInBank / newBurn : 999;

            insights.push({
                type: 'ACTION',
                severity: 'high',
                title: `Audit ${inflated.category} — spiked ${inflated.changePercent}%`,
                body: `${inflated.category} spending jumped from ${fmt(inflated.prevAmount || 0)} → ${fmt(inflated.amount)}/mo (+${inflated.changePercent}%). If you revert to last month's level, you save ${fmt(savingsIfReverted)}/mo and runway extends to ${newRunway >= 999 ? '∞' : newRunway.toFixed(1)} months.`,
                category: inflated.category,
                metric: `+${fmt(savingsIfReverted)}/mo saved`,
                confidence: 0.88,
                source: 'transaction_data',
            });
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private computeTrend(prevBurn: number | null, currentBurn: number): CfoBrainReport['summary']['burnTrend'] {
        if (prevBurn === null || prevBurn <= 0) return 'unknown';
        const change = ((currentBurn - prevBurn) / prevBurn) * 100;
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    private computeRevenueTrend(prevRevenue: number, currentRevenue: number): CfoBrainReport['summary']['revenueTrend'] {
        if (prevRevenue <= 0) return 'unknown';
        const change = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        if (change > 5) return 'growing';
        if (change < -5) return 'declining';
        return 'stable';
    }

    private async getOrgOwner(organizationId: string): Promise<string | null> {
        const user = await this.prisma.user.findFirst({
            where: { organizationId },
            select: { id: true },
        });
        return user?.id || null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DECISION ENGINE V1 — "You are the core intelligence layer of FounderCFO"
    //
    // Your job is NOT to describe data.
    // Your job is to: Detect risk. Predict failure. Force decisions. Drive survival.
    // ══════════════════════════════════════════════════════════════════════════

    private generateDecisionEngineV1(ctx: {
        monthlyRevenue: number;
        monthlyExpenses: number;
        netBurn: number;
        cashInBank: number;
        runwayMonths: number;
        isSustainable: boolean;
        ghostLiabilities: number;
        burnTrend: CfoBrainReport['summary']['burnTrend'];
        revenueTrend: CfoBrainReport['summary']['revenueTrend'];
        categoryBreakdown: CategorySpend[];
        prevRevenue: number;
        prevExpenses: number;
        totalTransactions: number;
        dataQuality: CfoBrainReport['dataQuality'];
        profile: { stage?: string; primaryGoal?: string; teamSize?: number } | null;
        integrationsCount: number;
    }): DecisionEngineV1Output {
        const {
            monthlyRevenue, monthlyExpenses, netBurn, cashInBank, runwayMonths,
            isSustainable, ghostLiabilities,
            burnTrend, revenueTrend, categoryBreakdown, prevRevenue, prevExpenses,
            totalTransactions, dataQuality, profile, integrationsCount
        } = ctx;

        const triggers: string[] = [];

        // ── NO DATA OR SYNCING CASE ──────────────────────────────────────────
        // Only kick back if absolutely no transactions AND no integration connected
        if (totalTransactions < 10 && integrationsCount === 0) {
            return {
                deathClock: "Let's generate your first CFO insights.",
                daysLeft: null,
                criticalInsight: 'Your AI CFO needs real financial data.',
                forcedDecision: 'Connect your bank account OR upload bank statements to unlock your CFO intelligence.',
                actionPlan: [
                    'Connect your primary business bank account',
                    'Upload last 3 months of bank statements',
                    'Add any pending invoices or liabilities',
                ],
                secondaryWarnings: [],
                trustLayer: `Based on ${totalTransactions} transactions — not enough for reliable insights.`,
                tone: 'cautious',
                triggers: ['NO_DATA'],
                noDataCase: true,
                isInfiniteRunway: false,
            };
        } else if (totalTransactions < 10 && integrationsCount > 0) {
            // "Syncing" or No Real Transactions Yet State
            return {
                deathClock: "Syncing data from your integrations...",
                daysLeft: null,
                criticalInsight: "We are listening for your first transactions.",
                forcedDecision: 'Wait for the sync to complete or check your connection status.',
                actionPlan: [
                    'Ensure your integration allows read access.',
                    'Check back in a few minutes.'
                ],
                secondaryWarnings: [],
                trustLayer: `Validating connection...`,
                tone: 'strategic',
                triggers: ['SYNCING'],
                noDataCase: false, // Ensures Dashboard stays alive
                isInfiniteRunway: false,
            };
        }

        // ── 1. DEATH CLOCK — Convert runway to exact date ────────────────────
        const now = new Date();
        let deathClock: string;
        let daysLeft: number | null = null;

        const isInfiniteRunway = netBurn <= 0 || runwayMonths >= 36;
        
        if (netBurn <= 0) {
            // Profitable or break-even
            deathClock = 'You are cash-flow positive. No death clock — capital is not your constraint.';
        } else if (runwayMonths >= 36) {
            deathClock = 'Runway > 36 months — capital is not your constraint (Very Strong).';
        } else {
            const deathDate = new Date(now.getTime() + runwayMonths * 30.44 * 24 * 60 * 60 * 1000);
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const formattedDate = deathDate.toLocaleDateString('en-IN', options);
            deathClock = `You will run out of money on ${formattedDate}.`;

            if (runwayMonths < 6) {
                daysLeft = Math.round(runwayMonths * 30.44);
                deathClock += ` At current burn, you have ${daysLeft} days left.`;
            }
        }

        // ── TONE SELECTION ────────────────────────────────────────────────────
        let tone: DecisionEngineV1Output['tone'];
        if (runwayMonths < 6) {
            tone = 'urgent';           // 🔴 HIGH RISK
        } else if (runwayMonths < 12) {
            tone = 'cautious';         // 🟠 MEDIUM RISK
        } else {
            tone = 'strategic';        // 🟢 LOW RISK
        }

        // ── SPECIAL LOGIC: Detect Triggers ───────────────────────────────────

        // Burn Spike Detection (burn_trend > +15%)
        let burnChangePercent = 0;
        if (prevExpenses > 0) {
            const prevBurn = Math.max(0, prevExpenses - prevRevenue);
            if (prevBurn > 0) {
                burnChangePercent = Math.round(((netBurn - prevBurn) / prevBurn) * 100);
            } else if (netBurn > 0) {
                burnChangePercent = 100; // went from profitable to burning
            }
        }
        if (burnChangePercent > 15) {
            triggers.push('BURN_SPIKE');
        }

        // Revenue Drop Detection (revenue_trend < -10%)
        let revenueChangePercent = 0;
        if (prevRevenue > 0) {
            revenueChangePercent = Math.round(((monthlyRevenue - prevRevenue) / prevRevenue) * 100);
        }
        if (revenueChangePercent < -10) {
            triggers.push('REVENUE_DROP');
        }

        // Expense Dominance (any category > 40%)
        const dominantCategories = categoryBreakdown.filter(c => c.pct > 40);
        if (dominantCategories.length > 0) {
            triggers.push('EXPENSE_DOMINANCE');
        }

        // ── 2. TOP CRITICAL INSIGHT — The MOST dangerous issue ────────────────
        let criticalInsight: string;

        if (triggers.includes('BURN_SPIKE') && burnChangePercent > 0) {
            // Find the driver categories
            const drivers = categoryBreakdown
                .filter(c => c.trend === 'up' && c.changePercent && c.changePercent > 10)
                .slice(0, 2);
            const driverStr = drivers.length > 0
                ? `, mainly due to ${drivers.map(d => `${d.category} (+${fmt(d.amount - (d.prevAmount || 0))})`).join(' and ')}`
                : '';
            criticalInsight = `Your burn increased ${Math.abs(burnChangePercent)}% in the last 30 days${driverStr}.`;
        } else if (triggers.includes('REVENUE_DROP')) {
            criticalInsight = `Revenue dropped ${Math.abs(revenueChangePercent)}% while expenses ${prevExpenses > 0 && Math.abs(((monthlyExpenses - prevExpenses) / prevExpenses) * 100) < 5 ? 'stayed flat' : 'are shifting'}. This is eroding your runway fast.`;
        } else if (tone === 'urgent') {
            criticalInsight = `You have less than ${runwayMonths.toFixed(1)} months of cash left. At ${fmt(netBurn)}/month burn, your company is on a countdown.`;
        } else if (triggers.includes('EXPENSE_DOMINANCE')) {
            const dom = dominantCategories[0];
            criticalInsight = `${dom.category} accounts for ${dom.pct}% of your total expenses (${fmt(dom.amount)}/mo). This concentration is a single point of failure.`;
        } else if (revenueTrend === 'declining') {
            criticalInsight = `Revenue is on a declining trend. Your income dropped from ${fmt(prevRevenue)} → ${fmt(monthlyRevenue)} this month.`;
        } else if (burnTrend === 'increasing') {
            criticalInsight = `Your burn rate is trending upward. Expenses moved from ${fmt(prevExpenses)} → ${fmt(monthlyExpenses)} this month.`;
        } else if (netBurn <= 0) {
            criticalInsight = `You are profitable with ${fmt(monthlyRevenue)}/mo revenue against ${fmt(monthlyExpenses)}/mo expenses. Protect this margin.`;
        } else {
            criticalInsight = `Net burn is ${fmt(netBurn)}/mo against ${fmt(cashInBank)} in the bank. Runway sits at ${runwayMonths.toFixed(1)} months.`;
        }

        // ── 3. FORCED DECISION — Binary, no optional advice ──────────────────
        let forcedDecision: string;

        if (netBurn <= 0) {
            forcedDecision = `You must maintain profitability OR risk falling back into burn mode. Do not let expenses cross ${fmt(monthlyRevenue)}/mo.`;
        } else if (tone === 'urgent') {
            // Find the largest cuttable category
            const cuttable = categoryBreakdown.find(c => c.category !== 'Payroll' && c.amount > 0);
            const cutTarget = cuttable ? fmt(cuttable.amount * 0.3) : fmt(netBurn * 0.3);
            const cutCategory = cuttable?.category || 'non-payroll expenses';
            forcedDecision = `You must cut ${cutCategory} by at least ${cutTarget}/month OR you will run out of cash in ${runwayMonths.toFixed(0)} months.`;
        } else if (tone === 'cautious') {
            const revenueGap = fmt(netBurn);
            forcedDecision = `You must increase revenue by ${revenueGap}/month OR reduce burn immediately. Your current trajectory gives you ${runwayMonths.toFixed(0)} months.`;
        } else {
            // Strategic
            forcedDecision = `You must reinvest at least 15% of surplus into growth OR risk stagnation. Your runway of ${runwayMonths.toFixed(0)} months gives you room — use it.`;
        }

        // ── 4. ACTION PLAN — 2-3 specific, executable steps ──────────────────
        const actionPlan: string[] = [];

        if (tone === 'urgent') {
            const topExpCat = categoryBreakdown.find(c => c.category !== 'Payroll' && c.amount > 0);
            if (topExpCat) {
                actionPlan.push(`Cut ${topExpCat.category} by ${Math.min(topExpCat.pct > 30 ? 30 : 15, 50)}% — saves ~${fmt(topExpCat.amount * 0.15)}/mo`);
            }
            if (triggers.includes('BURN_SPIKE')) {
                actionPlan.push('Freeze all new spending commitments for 30 days');
            }
            actionPlan.push('Pause hiring and non-essential marketing immediately');
            if (profile?.primaryGoal === 'RAISE') {
                actionPlan.push('Start emergency fundraising conversations this week');
            } else {
                actionPlan.push('Delay all non-essential expenses until burn stabilizes');
            }
        } else if (tone === 'cautious') {
            const inflated = categoryBreakdown.find(c => c.trend === 'up' && c.changePercent && c.changePercent > 15 && c.category !== 'Payroll');
            if (inflated) {
                actionPlan.push(`Reduce ${inflated.category} by ${Math.round(inflated.changePercent! * 0.5)}% — it spiked ${inflated.changePercent}% this month`);
            }
            actionPlan.push(`Target revenue growth of ${fmt(netBurn * 0.2)}/mo through upsells or new clients`);
            actionPlan.push('Review all subscriptions and vendor contracts for savings');
        } else {
            // Strategic
            actionPlan.push('Allocate budget to highest-ROI growth channels');
            actionPlan.push('Build a 12-month cash reserve if not already in place');
            if (profile?.teamSize && profile.teamSize < 15) {
                actionPlan.push('Consider a strategic hire in sales or product to accelerate growth');
            }
        }

        // Limit to 3 steps max
        const finalActionPlan = actionPlan.slice(0, 3);

        // ── 5. SECONDARY WARNINGS ────────────────────────────────────────────
        const secondaryWarnings: string[] = [];

        // GST / Liability Impact (India Focus)
        // Check for upcoming compliance deadlines
        const gstDeadlineDay = 20;
        const today = new Date();
        const daysToGst = gstDeadlineDay - today.getDate();
        if (daysToGst > 0 && daysToGst <= 10) {
            secondaryWarnings.push(`GST filing deadline is in ${daysToGst} days. Upcoming statutory payments will reduce your available cash.`);
        }

        // Salary concentration warning
        const payrollCat = categoryBreakdown.find(c => c.category === 'Payroll' || c.category === 'Salaries' || c.category === 'Salary');
        if (payrollCat && payrollCat.pct > 50) {
            secondaryWarnings.push(`Salary expenses are ${payrollCat.pct}% of burn (${fmt(payrollCat.amount)}/mo) — very high risk. Any team changes have outsized impact.`);
        }

        // Expense dominance warning (if not already the critical insight)
        if (triggers.includes('EXPENSE_DOMINANCE') && !criticalInsight.includes('accounts for')) {
            for (const dom of dominantCategories) {
                secondaryWarnings.push(`${dom.category} at ${dom.pct}% of total spend is a concentration risk.`);
            }
        }

        // Revenue dependency ratio
        if (monthlyRevenue > 0 && monthlyExpenses > monthlyRevenue * 2) {
            const ratio = (monthlyExpenses / monthlyRevenue).toFixed(1);
            secondaryWarnings.push(`You're spending ${ratio}× what you earn. Every ₹1 of revenue costs ₹${ratio} to generate.`);
        }

        // Burn spike warning as secondary if not the primary critical insight
        if (triggers.includes('BURN_SPIKE') && !criticalInsight.includes('burn increased')) {
            secondaryWarnings.push(`Burn spike detected: expenses jumped ${burnChangePercent}% month-over-month.`);
        }

        // Revenue drop warning as secondary if not the primary critical insight
        if (triggers.includes('REVENUE_DROP') && !criticalInsight.includes('Revenue dropped')) {
            secondaryWarnings.push(`Revenue decline detected: down ${Math.abs(revenueChangePercent)}% from last month.`);
        }

        // ── 6. TRUST LAYER — Always show source transparency ─────────────────
        let trustLayer = `Based on ${totalTransactions} transactions.`;

        // Data quality caveat
        if (dataQuality === 'minimal') {
            trustLayer += ' Insights are based on limited data. Connect more sources for accuracy.';
        } else if (dataQuality === 'partial') {
            trustLayer += ' Partial data — some insights may improve with more transaction history.';
        }

        this.logger.log(`Decision Engine V1: tone=${tone}, triggers=[${triggers.join(',')}], daysLeft=${daysLeft ?? 'N/A'}`);

        return {
            deathClock,
            daysLeft,
            criticalInsight,
            forcedDecision,
            actionPlan: finalActionPlan,
            secondaryWarnings,
            trustLayer,
            tone,
            triggers,
            noDataCase: false,
            isInfiniteRunway,
        };
    }
}
