import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoAlertService } from './cfo-alert.service';

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
    recommendedActions: string[];
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

        // Run all 6 domain engines, collect non-null results
        const results: DecisionResult[] = [
            this.runSurvival(snap),
            this.runEfficiency(snap),
            this.runGrowth(snap),
            this.runHiring(snap),
            this.runFundraising(snap),
            this.runCompliance(snap),
        ].filter(Boolean) as DecisionResult[];

        // Persist to DB
        const saved = await Promise.all(
            results.map((r) => this.saveDecision(profileId, r)),
        );

        this.logger.log(
            `CFO engine: ${saved.length} decisions saved for profile ${profileId}`,
        );

        // Fire HIGH/CRITICAL alerts (non-blocking, 24h dedup)
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

    private runSurvival(s: StartupSnapshot): DecisionResult {
        const burn = s.monthlyExpenses - s.monthlyRevenue;

        // Profitable — no survival risk
        if (burn <= 0) {
            return {
                domain: 'SURVIVAL',
                decisionType: 'RUNWAY_RISK',
                severity: 'LOW',
                confidence: 0.98,
                facts: {
                    runway_months: 999,
                    monthly_burn: 0,
                    cash_balance: s.cashInBank,
                    monthly_revenue: s.monthlyRevenue,
                    monthly_expenses: s.monthlyExpenses,
                    status: 'profitable',
                },
                recommendedActions: [
                    'You are cashflow positive — great position',
                    'Consider reinvesting surplus into growth',
                    'Build a 6-month cash reserve buffer',
                ],
            };
        }

        const runway_months = Math.round((s.cashInBank / burn) * 10) / 10;

        let severity: Severity;
        if (runway_months < 3) severity = 'CRITICAL';
        else if (runway_months < 6) severity = 'HIGH';
        else if (runway_months < 9) severity = 'MEDIUM';
        else severity = 'LOW';

        const actions: string[] = [];
        if (severity === 'CRITICAL') {
            actions.push(
                'Reduce discretionary expenses immediately',
                'Delay all non-essential hiring',
                'Plan fundraising within 60 days',
                'Explore bridge financing or revenue-based financing',
            );
        } else if (severity === 'HIGH') {
            actions.push(
                'Begin fundraising conversations now',
                'Review and cut top 3 expense categories',
                'Model burn scenarios in the simulator',
            );
        } else if (severity === 'MEDIUM') {
            actions.push(
                'Maintain current burn discipline',
                'Set a fundraising or revenue target for next quarter',
            );
        } else {
            actions.push(
                'Runway is healthy — focus on growth',
                'Build a cash reserve of 12+ months',
            );
        }

        return {
            domain: 'SURVIVAL',
            decisionType: 'RUNWAY_RISK',
            severity,
            confidence: 0.97,
            facts: {
                runway_months,
                monthly_burn: Math.round(burn),
                cash_balance: s.cashInBank,
                monthly_revenue: s.monthlyRevenue,
                monthly_expenses: s.monthlyExpenses,
            },
            recommendedActions: actions,
        };
    }

    // ─── 2. EFFICIENCY — Burn vs Revenue ─────────────────────────────────────

    private runEfficiency(s: StartupSnapshot): DecisionResult | null {
        if (s.monthlyRevenue <= 0) return null; // pre-revenue — skip

        const burn_ratio = s.monthlyExpenses / s.monthlyRevenue;

        let severity: Severity;
        if (burn_ratio > 1.5) severity = 'HIGH';
        else if (burn_ratio > 1.0) severity = 'MEDIUM';
        else severity = 'LOW'; // profitable

        const actions =
            severity === 'HIGH'
                ? [
                    'Audit every expense category above ₹50K/month',
                    'Renegotiate SaaS and vendor contracts',
                    'Freeze non-critical headcount',
                    'Target a 20% burn reduction within 30 days',
                ]
                : severity === 'MEDIUM'
                    ? [
                        'Review expenses monthly',
                        'Grow revenue faster than costs',
                        'Identify top 2 cost drivers and challenge them',
                    ]
                    : [
                        'Expenses are under control — revenue exceeds burn',
                        'Focus on scaling revenue while maintaining margins',
                    ];

        return {
            domain: 'EFFICIENCY',
            decisionType: 'BURN_UNSUSTAINABLE',
            severity,
            confidence: 0.93,
            facts: {
                burn_ratio: Math.round(burn_ratio * 100) / 100,
                monthly_revenue: s.monthlyRevenue,
                monthly_expenses: s.monthlyExpenses,
                monthly_surplus_deficit: Math.round(s.monthlyRevenue - s.monthlyExpenses),
            },
            recommendedActions: actions,
        };
    }

    // ─── 3. GROWTH — Revenue Slowdown ────────────────────────────────────────

    private runGrowth(s: StartupSnapshot): DecisionResult | null {
        // Without historical data, use revenue-to-expense coverage as proxy.
        // If revenue < 5% of expenses, it's an early-stage slowdown signal.
        if (s.monthlyRevenue <= 0) return null; // pre-revenue skip

        const coverage = s.monthlyRevenue / s.monthlyExpenses;

        // Signal revenue slowdown if coverage is very low relative to burn
        // This is the best deterministic approximation without time-series data
        const isSlowSignal = coverage < 0.3; // revenue less than 30% of expenses
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
                signal: 'Revenue is significantly below expense base',
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

    // ─── Private: Save Decision ───────────────────────────────────────────────

    private async saveDecision(profileId: string, r: DecisionResult) {
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
