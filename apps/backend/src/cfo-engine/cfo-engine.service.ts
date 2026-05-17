import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoAlertService } from './cfo-alert.service';
import { CfoForecastService } from './cfo-forecast.service';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DecisionDomain =
    | 'SURVIVAL'
    | 'EFFICIENCY'
    | 'GROWTH'
    | 'HIRING'
    | 'FUNDRAISING'
    | 'COMPLIANCE';

export interface DecisionResult {
    domain: DecisionDomain;
    decisionType: string;
    severity: Severity;
    confidence: number;
    facts: Record<string, any>;
    recommendedActions: any[];
}

interface StartupSnapshot {
    id: string;
    userId?: string;
    cashInBank: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    teamSize: number;
    stage: string;
    primaryGoal: string;
    country: string;
}

// ─── GST Deadline Helper ──────────────────────────────────────────────────────

function daysUntilGstDeadline(now: Date = new Date()): number {
    // GST GSTR-3B due: 20th of following month for most taxpayers
    const current20th = new Date(now.getFullYear(), now.getMonth(), 20);
    const next20th = new Date(now.getFullYear(), now.getMonth() + 1, 20);
    const target = now.getDate() <= 20 ? current20th : next20th;
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CfoEngineService {
    private readonly logger = new Logger(CfoEngineService.name);

    constructor(
        private prisma: PrismaService,
        private alertService: CfoAlertService,
        private forecastService: CfoForecastService
    ) { }

    // ─── Public API ──────────────────────────────────────────────────────────────

    async runEngine(profileId: string, userId?: string) {
        const profile = await this.prisma.startupProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile) throw new Error(`StartupProfile not found: ${profileId}`);

        const snap: StartupSnapshot = {
            id: profileId,
            userId,
            cashInBank: Number(profile.cashInBank),
            monthlyRevenue: Number(profile.monthlyRevenue),
            monthlyExpenses: Number(profile.monthlyExpenses),
            teamSize: Number(profile.teamSize),
            stage: profile.stage,
            primaryGoal: profile.primaryGoal,
            country: profile.country,
        };

        // Run all 6 domain engines
        const syncResults: (DecisionResult | null)[] = [
            this.runHiring(snap),
            this.runFundraising(snap),
            this.runCompliance(snap),
        ];
        const [growthResult, efficiencyResult, survivalResult] = await Promise.all([
            this.runGrowth(snap),
            this.runEfficiency(snap),
            this.runSurvival(snap)
        ]);
        
        syncResults.push(growthResult, efficiencyResult, survivalResult);
        const results = syncResults.filter(Boolean) as DecisionResult[];

        // Upsert to DB (update existing OPEN decisions, don't duplicate)
        const saved = await Promise.all(
            results.map((r) => this.upsertDecision(profileId, r)),
        );

        // AUTO-RESOLVE: mark any OPEN/ACKNOWLEDGED decisions NOT in current results as RESOLVED
        const currentTypes = results.map(r => r.decisionType);
        await this.prisma.cfoDecision.updateMany({
            where: {
                startupProfileId: profileId,
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
                decisionType: { notIn: currentTypes }
            },
            data: { 
                status: 'RESOLVED',
            }
        });

        this.logger.log(
            `CFO engine: ${saved.length} decisions upserted, and outdated mandates auto-resolved for profile ${profileId}`,
        );

        // Fire HIGH/CRITICAL alerts (non-blocking)
        if (userId) {
            this.alertService.checkAndAlert(saved, userId).catch((err) =>
                this.logger.error(`Alert dispatch failed: ${err.message}`),
            );
        }

        return saved;
    }

    async getDecisionsForProfile(profileId: string) {
        return this.prisma.cfoDecision.findMany({
            where: { startupProfileId: profileId },
            orderBy: [
                // Sort: CRITICAL first within each domain
                { createdAt: 'desc' },
            ],
            include: { aiExplanation: true },
        });
    }

    async updateStatus(decisionId: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') {
        return this.prisma.cfoDecision.update({
            where: { id: decisionId },
            data: { status },
        });
    }

    // ─── 1. SURVIVAL — Runway Risk ────────────────────────────────────────────

    private async runSurvival(s: StartupSnapshot): Promise<DecisionResult | null> {
        if (!s.userId) return null;
        const profile = await this.prisma.user.findUnique({ where: { id: s.userId }, select: { organizationId: true } });
        if (!profile?.organizationId) return null;

        const forecast = await this.forecastService.generateForecast(s.userId, profile.organizationId);
        if (!forecast) return null;

        const runway_months = forecast.runway_days_remaining / 30;

        let severity: Severity = 'LOW';
        let actions: any[] = [];

        if (forecast.netDailyBurnRate <= 0) {
            return {
                domain: 'SURVIVAL',
                decisionType: 'RUNWAY_RISK',
                severity: 'LOW',
                confidence: 0.98,
                facts: {
                    runway_days_remaining: 9999,
                    status: 'profitable',
                },
                recommendedActions: [{
                    problem: 'No cash flow shortage detected',
                    impact: 'Startup is structurally cashflow positive with 0% insolvency risk dynamically.',
                    action: 'Consider reinvesting surplus into growth or build a 6-month cash reserve buffer'
                }],
            };
        }
        if (runway_months < 3) {
            severity = 'CRITICAL';
            actions = [{
                problem: `Critical runway detected (${runway_months.toFixed(1)} months remaining).`,
                impact: `High risk of insolvency by ${forecast.estimated_zero_cash_date?.toDateString()}. Operations will halt.`,
                action: 'Start emergency fundraising immediately and freeze all non-essential marketing and hiring spend.'
            }];
        } else if (runway_months < 6) {
            severity = 'HIGH';
            actions = [{
                problem: `Limited runway detected (${runway_months.toFixed(1)} months remaining).`,
                impact: 'Insufficient buffer for next growth milestone without external injections.',
                action: 'You should start fundraising within 60 days to prevent panic bridging rounds.'
            }];
        } else if (runway_months < 9) {
            severity = 'MEDIUM';
            actions = [{
                problem: `Moderate runway footprint (${runway_months.toFixed(1)} months remaining).`,
                impact: 'Safe for the short-term, but dependent on sustained trajectory without bumps.',
                action: 'Prepare pitch deck updates and softly engage target investors.'
            }];
        } else {
            severity = 'LOW';
            actions = [{
                problem: 'Stable cash buffers.',
                impact: 'Extended survival ensures flexibility in market timing.',
                action: 'Capitalize on healthy runway to double down on product growth metrics.'
            }];
        }

        return {
            domain: 'SURVIVAL',
            decisionType: 'RUNWAY_RISK',
            severity,
            confidence: 0.96,
            facts: {
                runway_months: Math.round(runway_months * 10) / 10,
                runway_days: forecast.runway_days_remaining,
                estimated_zero_cash_date: forecast.estimated_zero_cash_date
            },
            recommendedActions: actions,
        };
    }

    private async runEfficiency(s: StartupSnapshot): Promise<DecisionResult | null> {
        if (s.monthlyRevenue <= 0 && s.monthlyExpenses <= 0) return null; // No context
        if (!s.userId) return null;
        const profile = await this.prisma.user.findUnique({ where: { id: s.userId }, select: { organizationId: true } });
        if (!profile?.organizationId) return null;

        let severity: Severity = 'LOW';
        let actions: any[] = [];
        let burn_ratio = 0;
        let facts: any = {
            monthly_revenue: s.monthlyRevenue,
            monthly_expenses: s.monthlyExpenses,
            monthly_surplus_deficit: Math.round(s.monthlyRevenue - s.monthlyExpenses),
        };

        if (s.monthlyRevenue > 0) {
            burn_ratio = s.monthlyExpenses / s.monthlyRevenue;
            facts.burn_ratio = Math.round(burn_ratio * 100) / 100;
        }

        const snapshots = await this.prisma.financialSnapshot.findMany({
            where: { userId: s.userId },
            orderBy: { snapshotDate: 'desc' },
            take: 2,
        });

        let burnIncreasedWarning = false;
        if (snapshots.length >= 2) {
            const currentBurn = Number(snapshots[0].burn) || 0;
            const previousBurn = Number(snapshots[1].burn) || 0;
            if (previousBurn > 0) {
                const increase = ((currentBurn - previousBurn) / previousBurn) * 100;
                if (increase >= 20) {
                    burnIncreasedWarning = true;
                    severity = 'HIGH';
                    facts.burn_increase_percent = Math.round(increase);
                    actions = [{
                        problem: `Burn Rate increasing dangerously (+${Math.round(increase)}%)`,
                        impact: 'Future runway is structurally compromised without an equivalent revenue offset.',
                        action: 'Reduce marketing spend or freeze non-essential hiring. Renegotiate unutilized SaaS seats.'
                    }];
                }
            }
        }

        if (!burnIncreasedWarning) {
            if (burn_ratio > 1.5) severity = 'HIGH';
            else if (burn_ratio > 1.0) severity = 'MEDIUM';
            else severity = 'LOW';

            actions =
                severity === 'HIGH'
                    ? [{
                        problem: `Unsustainable Burn Ratio (${burn_ratio.toFixed(2)}x Revenue)`,
                        impact: 'Company is systematically over-spending per dollar of revenue generated.',
                        action: 'Audit every expense category above $1K/month. Freeze headcount additions.'
                    }]
                    : severity === 'MEDIUM'
                        ? [{
                            problem: 'Expenses exceed operating revenue.',
                            impact: 'Depleting capital base without significant margin accumulation.',
                            action: 'Identify the top 2 cost drivers and challenge their ROI for the current quarter.'
                        }]
                        : [{
                            problem: 'No efficiency risk detected.',
                            impact: 'Sustained positive cash conversion cycle allows safe scale.',
                            action: 'Target higher customer acquisition volume aggressively.'
                        }];
        }

        return {
            domain: 'EFFICIENCY',
            decisionType: 'BURN_UNSUSTAINABLE',
            severity,
            confidence: 0.93,
            facts,
            recommendedActions: actions,
        };
    }

    // ─── 3. GROWTH — Revenue Trend (Time-Series Powered) ───────────────────────

    private async runGrowth(s: StartupSnapshot): Promise<DecisionResult | null> {
        if (s.monthlyRevenue <= 0) return null; // pre-revenue skip

        // Query FinancialSnapshot for time-series data
        const snapshots = await this.prisma.financialSnapshot.findMany({
            where: { userId: s.userId },
            orderBy: { snapshotDate: 'desc' },
            take: 2,
        });

        // If we have 2+ snapshots, use actual month-over-month growth
        if (snapshots.length >= 2) {
            const currentRevenue = Number(snapshots[0].revenue);
            const previousRevenue = Number(snapshots[1].revenue);

            if (previousRevenue > 0) {
                const growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
                const roundedRate = Math.round(growthRate * 10) / 10;

                let trendDirection: 'up' | 'flat' | 'down';
                let severity: Severity;
                let confidence = 0.92;

                if (growthRate > 10) {
                    trendDirection = 'up';
                    severity = 'LOW';
                } else if (growthRate >= 0) {
                    trendDirection = 'flat';
                    severity = 'MEDIUM';
                } else if (growthRate > -20) {
                    trendDirection = 'down';
                    severity = 'HIGH';
                } else {
                    trendDirection = 'down';
                    severity = 'CRITICAL';
                    confidence = 0.95;
                }

                // Healthy growth — no decision needed
                if (severity === 'LOW') return null;

                const actions: any[] =
                    severity === 'CRITICAL'
                        ? [{
                            problem: `Revenue is contracting rapidly (${roundedRate}% MoM)`,
                            impact: 'Top-line evaporation accelerates cash zero date unconditionally.',
                            action: 'Investigate root cause immediately. Pause all non-essential spending. Review churn data and customer feedback urgently.'
                        }]
                        : severity === 'HIGH'
                            ? [{
                                problem: `Revenue is declining (${roundedRate}% MoM)`,
                                impact: 'Negative momentum destabilizing target forecasting.',
                                action: 'Focus on retention or pricing optimization. Cut non-performing marketing spend.'
                            }]
                            : [{
                                problem: `Revenue growth is flat (${roundedRate}% MoM)`,
                                impact: 'Stagnation prevents escaping fixed-cost gravity well.',
                                action: 'Explore new acquisition channels and evaluate upsell opportunities with existing customers.'
                            }];

                return {
                    domain: 'GROWTH',
                    decisionType: 'REVENUE_SLOWDOWN',
                    severity,
                    confidence,
                    facts: {
                        growth_rate: roundedRate,
                        trend_direction: trendDirection,
                        current_revenue: currentRevenue,
                        previous_revenue: previousRevenue,
                        monthly_expenses: s.monthlyExpenses,
                        stage: s.stage,
                        data_source: 'time_series',
                    },
                    recommendedActions: actions,
                };
            }
        }

        // FALLBACK: No time-series data — use ratio-based approximation
        const coverage = s.monthlyRevenue / s.monthlyExpenses;
        const isSlowSignal = coverage < 0.3;
        if (!isSlowSignal && s.stage !== 'GROWTH' && s.stage !== 'SME') return null;

        const severity: Severity = coverage < 0.1 ? 'HIGH' : 'MEDIUM';

        return {
            domain: 'GROWTH',
            decisionType: 'REVENUE_SLOWDOWN',
            severity,
            confidence: 0.78,
            facts: {
                monthly_revenue: s.monthlyRevenue,
                monthly_expenses: s.monthlyExpenses,
                revenue_coverage_ratio: Math.round(coverage * 100) / 100,
                stage: s.stage,
                data_source: 'ratio_fallback',
            },
            recommendedActions: [
                'Review pricing strategy — could you charge more?',
                'Audit customer acquisition channels for efficiency',
                'Reduce non-performing marketing spend',
                'Consider a targeted outbound sales sprint',
            ],
        };
    }

    // ─── 4. HIRING — Affordability ────────────────────────────────────────────

    private runHiring(s: StartupSnapshot): DecisionResult {
        const burn = Math.max(s.monthlyExpenses - s.monthlyRevenue, 0);

        // Assume average hire cost of ₹80K/month (mid-market India tech)
        const ASSUMED_HIRE_COST = 80000;
        const new_burn = burn + ASSUMED_HIRE_COST;
        const new_runway = new_burn > 0 ? Math.round((s.cashInBank / new_burn) * 10) / 10 : 999;

        const severity: Severity = new_runway < 3 ? 'CRITICAL' : new_runway < 6 ? 'HIGH' : 'LOW';

        const actions =
            severity === 'CRITICAL' || severity === 'HIGH'
                ? [
                    'Delay next hire until runway exceeds 6 months post-hire',
                    'Consider freelancers or part-time contractors instead',
                    'Evaluate if existing team can cover the role short-term',
                    'Model different salary levels in the simulator',
                ]
                : [
                    'Runway supports hiring — proceed with standard hiring process',
                    'Ensure each new hire has a clear revenue or cost-saving ROI',
                ];

        return {
            domain: 'HIRING',
            decisionType: 'HIRING_RISK',
            severity,
            confidence: 0.85,
            facts: {
                current_runway_months: burn > 0 ? Math.round((s.cashInBank / burn) * 10) / 10 : 999,
                post_hire_runway_months: new_runway,
                assumed_hire_cost_monthly: ASSUMED_HIRE_COST,
                current_team_size: s.teamSize,
                cash_balance: s.cashInBank,
            },
            recommendedActions: actions,
        };
    }

    // ─── 5. FUNDRAISING — Readiness & Urgency ────────────────────────────────

    private runFundraising(s: StartupSnapshot): DecisionResult | null {
        // Only relevant if goal is RAISE
        if (s.primaryGoal !== 'RAISE') return null;

        const burn = s.monthlyExpenses - s.monthlyRevenue;
        const runway_months = burn > 0 ? Math.round((s.cashInBank / burn) * 10) / 10 : 999;

        const isUrgent = runway_months < 6;
        const severity: Severity = runway_months < 3 ? 'CRITICAL' : isUrgent ? 'HIGH' : 'MEDIUM';

        return {
            domain: 'FUNDRAISING',
            decisionType: 'FUNDRAISE_URGENCY',
            severity,
            confidence: 0.90,
            facts: {
                runway_months,
                fundraising_goal: 'RAISE',
                urgency: isUrgent ? 'high' : 'moderate',
                typical_fundraise_timeline_months: 4,
                cash_balance: s.cashInBank,
            },
            recommendedActions: [
                'Prepare and update your investor deck this week',
                'Start warm introductions to target VCs/angels immediately',
                'Freeze all major capital expenses during fundraise',
                'Set a target close date 3–4 months from today',
                'Track investor conversations in a pipeline tracker',
            ],
        };
    }

    // ─── 6. COMPLIANCE — India GST ───────────────────────────────────────────

    private runCompliance(s: StartupSnapshot): DecisionResult | null {
        // Only applicable for India-based companies
        if (s.country !== 'IN') return null;

        const daysLeft = daysUntilGstDeadline();
        if (daysLeft > 7) return null; // not within alert window

        const severity: Severity = daysLeft <= 2 ? 'CRITICAL' : daysLeft <= 5 ? 'HIGH' : 'MEDIUM';

        return {
            domain: 'COMPLIANCE',
            decisionType: 'GST_DUE',
            severity,
            confidence: 0.99,
            facts: {
                days_until_deadline: daysLeft,
                filing_type: 'GSTR-3B',
                deadline: '20th of current month',
                penalty_per_day: 50, // INR per day late fee
            },
            recommendedActions: [
                `File GSTR-3B within ${daysLeft} day${daysLeft === 1 ? '' : 's'} to avoid penalties`,
                'Verify all input tax credits are reconciled',
                'Ensure GST payments are made before the deadline',
                'Contact your CA if reconciliation is pending',
            ],
        };
    }

    // ─── Private: Upsert Decision (Step 4 — dedup, never duplicate) ────────────

    private async upsertDecision(profileId: string, r: DecisionResult) {
        // Look for an existing OPEN or ACKNOWLEDGED decision of the same type
        const existing = await this.prisma.cfoDecision.findFirst({
            where: {
                startupProfileId: profileId,
                decisionType: r.decisionType,
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existing) {
            // Update existing decision with fresh data
            this.logger.debug(
                `Updating existing ${r.decisionType} decision (${existing.id}): ${existing.severity} → ${r.severity}`,
            );
            return this.prisma.cfoDecision.update({
                where: { id: existing.id },
                data: {
                    severity: r.severity,
                    confidence: r.confidence,
                    facts: r.facts,
                    recommendedActions: r.recommendedActions,
                    // Keep status as-is (don't reset ACKNOWLEDGED → OPEN)
                    // updatedAt auto-updates via Prisma
                },
            });
        }

        // No existing → create new decision
        return this.prisma.cfoDecision.create({
            data: {
                startupProfileId: profileId,
                decisionDomain: r.domain as any,
                decisionType: r.decisionType,
                severity: r.severity,
                confidence: r.confidence,
                facts: r.facts,
                recommendedActions: r.recommendedActions,
                status: 'OPEN',
            },
        });
    }
}
