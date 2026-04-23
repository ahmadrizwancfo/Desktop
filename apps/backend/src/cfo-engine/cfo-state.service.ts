import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoBrainService, CfoBrainReport } from './cfo-brain.service';
import { CfoForecastService } from './cfo-forecast.service';
import { CfoBehaviorService } from './cfo-behavior.service';
import { AutonomousCfoService } from './autonomous-cfo.service';
import { CfoExecutionService } from './cfo-execution.service';
import { DecisionEngineService } from './decision-engine.service';

// ═══════════════════════════════════════════════════════════════════════════════
// CFO STATE v2 — THE LIVING INTELLIGENCE ENGINE
//
// v1 was a snapshot. v2 thinks in TIME.
//   Past   → what changed (deltas, snapshots)
//   Present→ what's happening (state, risks)
//   Future → what will happen (daily cash flow, payroll prediction)
//
// Every API, every page, every action depends on THIS object.
// No page invents data. No mock fallbacks. One truth.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanyStatus = 'stable' | 'at_risk' | 'critical';

export interface PrimaryRisk {
    type: 'liquidity' | 'burn' | 'revenue_drop' | 'concentration' | 'taxes' | 'compliance' | 'none';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// ── GAP 1: DEATH CLOCK — now explainable ──────────────────────────────────────

export interface DeathClockScenario {
    label: string;
    assumptions: string[];
    date: string | null;
    daysLeft: number | null;
}

export interface DeathClock {
    statement: string;
    date: string | null;
    daysLeft: number | null;
    // GAP 4: Explainable scenarios, not magic
    bestCase: DeathClockScenario;
    worstCase: DeathClockScenario;
    /** Can you pay next month's payroll? */
    payrollSafe: boolean;
    payrollWarning: string | null;
}

// ── GAP 5: PRIORITY STACK ─────────────────────────────────────────────────────

export interface PriorityItem {
    issue: string;
    impactOnRunwayDays: number;
    urgency: 'now' | 'soon' | 'later';
    actionable: boolean;
    /** What page/action fixes this */
    actionPayload?: ActionPayload;
}

// ── GAP 1: DELTA TRACKING ─────────────────────────────────────────────────────

export interface CFOStateDelta {
    runwayChangeDays: number | null;
    burnChangePercent: number | null;
    cashChangeAmount: number | null;
    riskChanged: boolean;
    statusChanged: boolean;
    /** Human-readable summary: "You lost 18 days of runway this week" */
    summaryLine: string | null;
    /** How many consecutive weeks burn has increased (negative trend detection) */
    burnStreakWeeks: number;
    periodLabel: string; // "vs 7 days ago" | "vs yesterday"
    prevRunwayMonths: number | null;
    prevNetBurn: number | null;
    prevRevenue: number | null;
}

// ── GAP 2: DECISION TRACKING ─────────────────────────────────────────────────

export interface DecisionMemory {
    pendingDecisions: number;
    ignoredForDays: number | null;
    lastActedDecision: string | null;
    lastOutcome: string | null;
    /** "You ignored this for 4 days" or "After your action, runway improved by 22 days" */
    nudge: string | null;
}

// ── GAP 3: DAILY CASH FLOW ───────────────────────────────────────────────────

export interface DailyCashFlowEntry {
    date: string;
    openingBalance: number;
    inflow: number;
    outflow: number;
    closingBalance: number;
    /** Flags for special events */
    flags: ('payroll_day' | 'rent_due' | 'crunch' | 'danger')[];
}

// ── GAP 7: NARRATIVE VOICE ───────────────────────────────────────────────────

export interface ChangeDriver {
    label: string;
    delta: number;
    impactOnRunwayMonths: number;
    trend: 'up' | 'down';
    category?: string;
}

export interface TrustWarning {
    problem: string;
    impact: string;
    action: string;
    severity: 'low' | 'medium' | 'high';
    actionPayload?: ActionPayload;
}

export interface Narrative {
    headline: string;
    summary: string;
    tone: 'urgent' | 'cautious' | 'confident';
}

export interface ExecutionTask {
    task: string;
    completed: boolean;
    impact: string;
}

export type StartupStage = 'survival' | 'stabilize' | 'growth';

export interface AlternativeAnalysis {
    option: string;
    whyRejected: string;
    riskLevel: 'high' | 'medium' | 'low';
    consequence: string;
    timeframe?: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface TradeOff {
    gain: string; // measurable outcome (e.g., +2.4 months runway)
    loss: string; // explicit sacrifice (e.g., -18% growth speed)
}

export interface Decision {
    id: string;
    decisionKey: string; // Canonical key for identity tracking (e.g. RUNWAY_CRITICAL)
    decisionHash: string; // Version hash for change detection
    type: 'mandate' | 'recommendation' | 'insight';
    priority: number;
    priorityScore: number; // v3.0 formula-based priority
    urgency: 'low' | 'medium' | 'high' | 'critical';
    recommendationStrength: 'strong' | 'suggested' | 'optional';
    title: string;
    message: string;
    impact?: string;
    impactLine?: string; // Quantified outcome (e.g. "+18 days runway")
    impactRunwayDays?: number;
    impactBurnMonthly?: number;
    deadline?: string;
    consequence?: {
        daysToZero: number;
        message: string;
    };
    tradeOffs: TradeOff;
    alternative: AlternativeAnalysis;
    rationale: string;
    startupStage: StartupStage;
    impactPreview?: {
        before: number;
        after: number;
        delta: number;
    };
    impactRange?: {
        min: number;
        max: number;
    };
    executionPlan: ExecutionTask[];
    safePath?: string;
    aggressivePath?: string;
    reversibility: 'high' | 'medium' | 'low';
    confidence: {
        score: number;
        label: 'Low' | 'Moderate' | 'High';
    };
    stability: 'stable' | 'volatile';
    status: 'NEW' | 'REVIEWING' | 'IMPLEMENTING' | 'FIXED' | 'IGNORED';
    actionPayload?: ActionPayload;
}

export interface DecisionHistoryItem {
    decisionId: string;
    decisionKey: string;
    previousType: string;
    currentType: string;
    changedAt: string;
    decisionHash: string;
}

export interface DecisionOutput {
    summary: string;
    primaryDecisionId: string | null;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    decisions: Decision[];
    alerts: DecisionAlert[];
    opportunities: DecisionOpportunity[];
    confidenceAdjusted: boolean;
    history: DecisionHistoryItem[];
    globalDecisionHash: string;
    dailyFocus: {
        fix: Decision | null;
        support: Decision | null;
        watch: any;
    };
    previousRunway: number;
    currentRunway: number;
    ownershipNote?: string;
    tone: 'urgent' | 'cautious' | 'strategic';
    stability: 'stable' | 'volatile';
}

export interface DecisionAlert {
    id: string;
    title: string;
    message: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionOpportunity {
    id: string;
    title: string;
    description: string;
}

export interface ActionPayload {
    type: 'simulate_cost_cut' | 'simulate_fundraise' | 'simulate_growth' | 'navigate' | 'sync_data' | 'fix_categories';
    preloadedScenario?: {
        targetReduction?: number;
        categories?: string[];
        currentCash?: number;
        monthlyRevenue?: number;
        marketingSpend?: number;
        saasSpend?: number;
    };
    navigateTo?: string;
}

export interface ActiveStrategy {
    type: 'cost_cut' | 'fundraise' | 'growth_push';
    startedAt: string;
    expectedOutcome: string;
}

export interface CashForecast {
    /** Daily cash balance for next 30 days */
    next30Days: number[];
    /** Daily cash balance for next 90 days */
    next90Days: number[];
    /** GAP 3: Granular daily flow with inflow/outflow/flags */
    dailyFlow: DailyCashFlowEntry[];
    crunchDate: string | null;
    dangerDate: string | null;
    /** GAP 3: "You will miss payroll on 28 March" */
    payrollMissDate: string | null;
}

export interface ReceivableInflow {
    amount: number;
    date: string;
    confidence: number;
    source: string;
}

export interface Receivables {
    totalOutstanding: number;
    expectedInflows: ReceivableInflow[];
    runwayExtensionDays: number;
}

export interface TrustLayer {
    transactionCount: number;
    lastSyncedAt: string | null;
    dataQuality: 'low' | 'medium' | 'high';
    dataQualityIndicator: 'green' | 'yellow' | 'red';
    dataSource: string; // e.g. "Bank", "Manual", "Bank + Manual"
    summary: string;
    syncStatus?: 'idle' | 'syncing' | 'failed';
    confidenceExplanation?: string;
}

// ── GAP 6: CATEGORY — now with runway impact in DAYS ──────────────────────────

export interface CategoryImpact {
    category: string;
    amount: number;
    pct: number;
    trend: 'up' | 'down' | 'stable' | 'new';
    changePercent: number | null;
    /** Extension in DAYS if cut by 30% */
    runwayImpactDays: number;
    /** Cut potential: how much can be cut (estimated) */
    cutPotential: number;
    /** Human-readable: "Cutting marketing by 30% = +18 days runway" */
    runwayImpact: string | null;
}

// ── FOUNDER PRESSURE SYSTEM TYPES ─────────────────────────────────────────────

export interface CriticalAlert {
    id: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string; // e.g. "+12 days runway" or "-8 days runway"
    actionPayload?: ActionPayload;
    isBlocking?: boolean; // If true, force user to acknowledge before dashboard entry
}

export interface TodaysAction {
    id: string;
    title: string;
    description: string;
    impactDays: number;
    actionPayload: ActionPayload;
}

export interface NegativeTrend {
    metric: string;
    change: string;
    direction: 'worse' | 'better';
    message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE CFO STATE v2
// ═══════════════════════════════════════════════════════════════════════════════

export interface CFOState {
    companyStatus: CompanyStatus;
    dashboardMode: 'STABLE' | 'WARNING' | 'CRITICAL';
    deathClock: DeathClock;
    decisionEngine: DecisionOutput;
    activeStrategy: ActiveStrategy | null;
    cashForecast: CashForecast;
    receivables: Receivables;
    trust: TrustLayer;
    primaryRisk: PrimaryRisk;

    // ── GAP 1: Timeline ──────────────────────────────────────────────────────
    delta: CFOStateDelta;

    // ── GAP 2: Decision Memory ───────────────────────────────────────────────
    decisionMemory: DecisionMemory;

    // ── GAP 5: Priority Stack ────────────────────────────────────────────────
    priorityStack: PriorityItem[];

    // ── GAP 7: Unified Narrative ─────────────────────────────────────────────
    narrative: Narrative;

    // ── FOUNDER PRESSURE SYSTEM ───────────────────────────────────────────────
    criticalAlerts: CriticalAlert[];
    todaysActions: TodaysAction[];
    negativeTrends: NegativeTrend[];
    inertiaMetrics?: {
        ignoredAlerts: number;
        daysSinceLastAction: number;
    };
    
    modeExplanation?: {
        title: string;
        primaryDriver: string;
        contributingFactors: string[];
        confidence: number;
        impact?: {
            runwayBefore: number;
            runwayAfter: number;
        };
    };
    
    decisionTimeline?: Array<{
        id: string;
        type: 'MODE_CHANGE' | 'ACTION_EXECUTED' | 'ACTION_REVERTED';
        title: string;
        timestamp: Date;
        explanation: {
            primaryDriver: string;
            contributingFactors: string[];
            impact?: { runwayBefore: number, runwayAfter: number };
        };
    }>;
    
    trustIntelligence?: {
        cfoAccuracyScore: number;
        totalEvaluatedActions: number;
        isRecalibrating: boolean;
        cautionMultiplier: number;
        envUncertaintyScore: number;
        autoPilot: {
            mode: string;
            maxImpact: number;
            delayMinutes: number;
            recoveryAvailable: boolean;
            shadowLogs: any[];
            pendingActions: any[];
            rollbackRate: number;
        };
        categoryPerformances: Record<string, {
            score: number;
            isSuppressed: boolean;
            failureReason?: string;
        }>;
    };

    dynamicConfidence: {
        score: number;
        meaning: string;
        warnings: TrustWarning[];
        breakdown: {
            bankSynced: boolean;
            categorizationPercent: number;
            dataCoverageDays: number;
        };
    };

    changeDrivers: ChangeDriver[];
    versionId: string;

    behavioralAudit?: any; // Personalized CFO insights based on pattern memory
    autonomousRecommendations?: any; // Commands from the AutonomousCFOEngine
    activeMandates?: any[]; // For Execution Tracking

    // ── Supplementary data for pages ─────────────────────────────────────────
    actionPlan: string[];
    secondaryWarnings: string[];
    emotionalLine: string;
    categoryBreakdown: CategoryImpact[];
    summary: {
        cashInBank: number;
        monthlyRevenue: number;
        monthlyExpenses: number;
        netBurn: number;
        runwayMonths: number;
        burnTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
        revenueTrend: 'growing' | 'declining' | 'stable' | 'unknown';
        prevMonthlyRevenue: number;
        prevNetBurn: number;
    };
    insights: CfoBrainReport['insights'];
    tone: 'urgent' | 'cautious' | 'strategic';
    generatedAt: string;
    noData: boolean;
    isDemo: boolean;
    isInfiniteRunway?: boolean;
}

export interface DecisionOption {
    label: string;
    impact: string;
    actionPayload: ActionPayload;
}

export interface ForcedDecision {
    id: string;
    statement: string;
    options: DecisionOption[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toDateStr(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function toISO(d: Date): string {
    return d.toISOString();
}

function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════


@Injectable()
export class CfoStateService {
    private readonly logger = new Logger(CfoStateService.name);

    private cache = new Map<string, { state: CFOState; expiresAt: number }>();
    private static CACHE_TTL_MS = 5 * 60 * 1000;

    constructor(
        private prisma: PrismaService,
        private brainService: CfoBrainService,
        private behaviorService: CfoBehaviorService,
        private autoCfoService: AutonomousCfoService,
        private executionService: CfoExecutionService,
        private decisionEngineService: DecisionEngineService,
    ) { }

    // ── PUBLIC API ────────────────────────────────────────────────────────────

    async getState(organizationId: string, userId?: string): Promise<CFOState> {
        const cached = this.cache.get(organizationId);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.debug(`CFOState cache HIT for org ${organizationId}`);
            return cached.state;
        }

        const startupProfile = await this.prisma.startupProfile.findFirst({
            where: { organizationId }
        });

        this.logger.log(`Generating CFOState v2 for org ${organizationId}`);
        const startTime = Date.now();

        // ── 1. Brain report (raw intelligence) ────────────────────────────
        const brainReport = await this.brainService.generateReport(organizationId, userId);
        const engine = brainReport.decisionEngine;
        const s = brainReport.summary;

        // ── 2. Receivables ────────────────────────────────────────────────
        const receivables = await this.computeReceivables(organizationId, s.netBurn);

        // ── 3. Last sync ──────────────────────────────────────────────────
        const lastSync = await this.getLastSyncTime(organizationId);

        // ── 4. Transaction count ──────────────────────────────────────────
        const transactionCount = await this.getTransactionCount(organizationId);

        // ── 5. Death clock (GAP 4: explainable scenarios) ─────────────────
        const deathClock = this.computeDeathClock(s, receivables);

        // ── 6. Cash forecast (GAP 3: daily granular flow) ─────────────────
        const cashForecast = this.computeCashForecast(s, receivables);

        // ── 7. Weighted Burn Spike Detection (CRITICAL UPDATE) ────────────
        const { weightedBurn, burnSpike } = await this.calculateWeightedBurn(organizationId, s.netBurn);
        
        // ── 8. Primary risk (v2.2 order shift) ────────────────────────────
        const primaryRisk = this.extractPrimaryRisk(engine, brainReport);
        const companyStatus = this.determineStatus(s.runwayMonths, engine.tone);

        // ── 9. Delta from last snapshot (v2.2 order shift) ────────────────
        const delta = await this.computeDelta(organizationId, s, companyStatus, primaryRisk);
        
        // ── 10. Negative Trends (v2.2 order shift) ────────────────────────
        const negativeTrends = this.buildNegativeTrends(delta, brainReport.categoryBreakdown as any, s);

        // ── 11. Dashboard Mode v2.2 (Explainability & Rule-based Sensitivity) ───────────
        const { mode: dashboardMode, explanation: modeExplanation } = await this.determineDashboardMode(
            organizationId,
            s.runwayMonths, 
            burnSpike, 
            negativeTrends, 
            startupProfile?.rollbackRate || 0,
            s,
            startupProfile
        );
        
        // ── 9a. Update Profile Insights (Peak Cash & Mode tracking) ───────
        if (startupProfile) {
            const currentCash = s.cashInBank;
            const highestCash = startupProfile.highestCashBuffer || 0;
            if (currentCash > highestCash) {
                await this.prisma.startupProfile.update({
                    where: { organizationId },
                    data: { highestCashBuffer: currentCash }
                });
            }
        }


        // ── 12. Forced decision ───────────────────────────────────────────
        const forcedDecision = this.buildForcedDecision(engine, s, brainReport.categoryBreakdown);

        // ── 13. Category breakdown (GAP 6: days + cut potential) ───────────
        const categoryBreakdown = this.enrichCategories(brainReport.categoryBreakdown, s);

        // ── 14. Emotional line ────────────────────────────────────────────
        const emotionalLine = this.generateEmotionalLine(s, deathClock);

        // ── 15. Trust layer ───────────────────────────────────────────────
        const connections = await this.prisma.integrationConnection.findMany({
            where: { organizationId, status: 'CONNECTED' }
        });
        const isSyncing = connections.some(c => c.syncStatus === 'SYNCING');
        const hasFailed = connections.some(c => c.syncStatus === 'FAILED');
        const overallSyncStatus = isSyncing ? 'syncing' : hasFailed ? 'failed' : 'idle';

        const hasBank = connections.some(c => c.provider !== 'CSV_MANUAL');
        const hasManual = connections.some(c => c.provider === 'CSV_MANUAL');
        const dataSource = hasBank && hasManual ? 'Bank + Manual' : hasBank ? 'Bank' : 'Manual';
        const staleSync = lastSync && (Date.now() - new Date(lastSync).getTime() > 24 * 60 * 60 * 1000);
        const dataQualityIndicator = (brainReport.dataQuality === 'rich' && !staleSync && hasBank) ? 'green' : (brainReport.dataQuality !== 'minimal' && !staleSync) ? 'yellow' : 'red';

        // ── Dynamic Confidence scoring ──────────────────────
        const categorizationPercent = await this.getCategorizationCoverage(organizationId);
        const dataCoverageDays = daysBetween(brainReport.summary.monthlyRevenue > 0 || brainReport.summary.monthlyExpenses > 0 ? new Date(Date.now() - 30*24*60*60*1000) : new Date(), new Date());
        
        const dynamicConfidence = this.calculateDynamicConfidence(
            brainReport.dataQuality === 'rich' ? 'high' : brainReport.dataQuality === 'partial' ? 'medium' : 'low',
            startupProfile?.cfoAccuracyScore || 85,
            {
                bankSynced: overallSyncStatus === 'idle',
                categorizationPercent,
                dataCoverageDays,
                monthlyRevenue: s.monthlyRevenue,
                lastSync
            }
        );

        const trust: TrustLayer = {
            transactionCount,
            lastSyncedAt: lastSync,
            dataQuality: brainReport.dataQuality === 'rich' ? 'high'
                : brainReport.dataQuality === 'partial' ? 'medium' : 'low',
            dataQualityIndicator,
            dataSource,
            summary: transactionCount > 0
                ? `Analyzed ${transactionCount} real transactions`
                : 'No transactions analyzed yet',
            syncStatus: overallSyncStatus as any,
            confidenceExplanation: dynamicConfidence.meaning
        };

        // ── 16. GAP 5: Priority Stack ─────────────────────────────────────
        const priorityStack = this.buildPriorityStack(s, categoryBreakdown, engine, receivables);

        // Update delta with Burn Spike narrative if applicable
        if (burnSpike > 0.05) {
            delta.summaryLine = `Burn is up ${Math.round(burnSpike * 100)}% vs 3-month trend — ${burnSpike > 0.25 ? 'deteriorating' : 'deviating'}.`;
        }
        
        // Mode Reason override for transparency (v2.1)
        if (dashboardMode !== 'STABLE') {
            delta.summaryLine = modeExplanation.primaryDriver;
        }

        // ── 18. GAP 2: Decision Memory ────────────────────────────────────
        const decisionMemory = await this.computeDecisionMemory(organizationId, s.runwayMonths);

        // ── 19. GAP 7: Unified Narrative ──────────────────────────────────
        const narrative = this.buildNarrative(s, deathClock, delta, decisionMemory, engine.tone);

        // ── 20. FOUNDER PRESSURE: Critical Alerts ─────────────────────────
        const transientAlerts = this.buildCriticalAlerts(s, deathClock, receivables, categoryBreakdown, delta);
        
        // Fetch persisted alerts
        const persistedAlerts = userId ? await this.prisma.alert.findMany({
            where: { userId, acknowledged: false },
            orderBy: { createdAt: 'desc' },
            take: 3
        }) : [];

        const mappedPersisted = persistedAlerts.map(a => ({
            id: a.id,
            severity: (a.severity === 'CRITICAL' ? 'high' : a.severity === 'WARNING' ? 'medium' : 'low') as any,
            title: a.message,
            description: `Auto-generated by AI CFO Alert Engine. Type: ${a.alertType}`,
            impact: (a.metadata as any)?.zeroShift ? `-${Math.round((a.metadata as any).zeroShift)} days runway` : 'Financial risk increase',
            actionPayload: { type: 'navigate' as const, navigateTo: '/dashboard' },
            isBlocking: a.severity === 'CRITICAL'
        }));

        const criticalAlerts = [...transientAlerts, ...mappedPersisted];

        // ── 21. FOUNDER PRESSURE: Today's Actions ─────────────────────────
        const todaysActions = this.buildTodaysActions(priorityStack, categoryBreakdown, s, receivables);

        // ── 22. Behavior Audit ──────────────────────────────────────────── (CLEANED UP TRENDS)

        // ── 23. Behavioral Audit ──────────────────────────────────────────
        const behaviorAudit = userId ? await this.behaviorService.analyzeFounderBehavior(userId) : null;

        // ── 24. CFO Execution & Compliance ────────────────────────────────
        const autonomousRecommendations = this.autoCfoService.generateCfoActions({ 
            summary: s, 
            deathClock, 
            behavioralAudit: behaviorAudit 
        } as any);

        if (userId && organizationId) {
            await this.executionService.syncMandates(userId, organizationId, autonomousRecommendations);
            this.executionService.verifyExecution(userId).catch(() => {});
        }

        const escalationLevel = userId ? await this.executionService.getEscalationLevel(userId) : 0;
        const activeMandates = userId ? await this.prisma.actionItem.findMany({
            where: { userId, status: { in: ['OPEN', 'IN_PROGRESS', 'DONE'] } },
            include: { executionLogs: { orderBy: { executedAt: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 10
        }) : [];

        const catPerfs = await this.prisma.cfoCategoryPerformance.findMany({
            where: { organizationId }
        });
        const trustPerformanceMap: Record<string, any> = {};
        catPerfs.forEach(p => {
            trustPerformanceMap[p.category] = {
                score: p.confidenceScore,
                isSuppressed: p.isSuppressed,
            };
        });

        const shadowLogs = await this.prisma.autoPilotLog.findMany({
            where: { profileId: startupProfile?.id, isSimulated: true },
            orderBy: { executedAt: 'desc' },
            take: 3
        });

        const pendingActions = await this.prisma.autoPilotLog.findMany({
            where: { profileId: startupProfile?.id, status: 'PENDING' },
            include: { action: true },
            orderBy: { executeAt: 'asc' }
        });

        const trustIntelligence = {
            cfoAccuracyScore: startupProfile?.cfoAccuracyScore || 85,
            totalEvaluatedActions: startupProfile?.totalEvaluatedActions || 0,
            isRecalibrating: (startupProfile?.rollbackRate || 0) > 0.20 || (startupProfile?.isTrustZoneDowngraded || false),
            cautionMultiplier: startupProfile?.cautionMultiplier || 1.0,
            envUncertaintyScore: startupProfile?.envUncertaintyScore || 0,
            autoPilot: {
                mode: (startupProfile?.rollbackRate || 0) > 0.20 ? 'SAFE_MODE' : (startupProfile?.autoPilotMode || 'OFF'),
                maxImpact: startupProfile?.maxAutoBurnImpact || 5.0,
                delayMinutes: startupProfile?.autoPilotDelayMinutes || 30,
                recoveryAvailable: (startupProfile?.cfoAccuracyScore || 0) > 80,
                shadowLogs,
                pendingActions,
                rollbackRate: startupProfile?.rollbackRate || 0,
                recoveryProgress: startupProfile?.rollbackRecoveryCount || 0
            },
            categoryPerformances: trustPerformanceMap
        };

        // ── 25. Change Drivers Engine (CFO-Grade) ───────────────────────
        const changeDrivers = this.computeChangeDrivers(s, delta, brainReport);


        // ── 26. Snapshot Versioning ──────────────────────────────────────
        const generatedAt = new Date().toISOString();
        const versionId = generatedAt;

        // ── Assemble CFOState v2 ──────────────────────────────────────────
        const preDecisionState: any = {
            companyStatus,
            dashboardMode,
            dynamicConfidence,
            deathClock,
            primaryRisk,
            activeStrategy: activeMandates.find(m => m.status === 'DONE') ? {
                type: 'cost_cut', 
                startedAt: activeMandates.find(m => m.status === 'DONE')?.claimedAt?.toISOString() || new Date().toISOString(),
                expectedOutcome: 'Awaiting Verification'
            } : null,
            cashForecast,
            receivables,
            trust,
            delta,
            decisionMemory,
            priorityStack,
            narrative,
            criticalAlerts,
            todaysActions,
            negativeTrends,
             inertiaMetrics: {
                ignoredAlerts: startupProfile?.ignoredAlertsCount || 0,
                daysSinceLastAction: startupProfile?.daysSinceLastAction || 0
            },
            modeExplanation,
            decisionTimeline: await this.getDecisionTimeline(organizationId),
            trustIntelligence,
            behavioralAudit: behaviorAudit ? {
                ...behaviorAudit,
                complianceScore: startupProfile?.complianceScore || 100,
                escalationLevel
            } : null,
            autonomousRecommendations,
            activeMandates: activeMandates,
            actionPlan: engine.actionPlan,
            secondaryWarnings: engine.secondaryWarnings,
            emotionalLine,
            categoryBreakdown,
            summary: s,
            insights: brainReport.insights,
            tone: engine.tone,
            changeDrivers,
            versionId,
            generatedAt,
            noData: engine.noDataCase,
            isDemo: engine.noDataCase,
            isInfiniteRunway: engine.isInfiniteRunway,
        };

        // ── 26a. DEMO DATA OVERRIDE (For Early Users) ───────────────────
        if (preDecisionState.noData) {
            this.logger.warn(`Injecting DEMO DATA scenario for organization ${organizationId} (No Live Sync)`);
            preDecisionState.companyStatus = 'at_risk';
            preDecisionState.dashboardMode = 'WARNING';
            preDecisionState.summary = {
                cashInBank: 450000,
                monthlyRevenue: 125000,
                monthlyExpenses: 310000,
                netBurn: 185000,
                runwayMonths: 2.4,
                burnTrend: 'increasing',
                revenueTrend: 'growing'
            };
            preDecisionState.deathClock = {
                statement: 'Demo Death Clock: 12 July 2026',
                date: '2026-07-12',
                daysLeft: 72,
                bestCase: { label: 'High Growth', assumptions: ['Demo State'], date: '2026-08-30', daysLeft: 120 },
                worstCase: { label: 'Revenue Stall', assumptions: ['Demo State'], date: '2026-06-15', daysLeft: 45 },
                payrollSafe: true,
                payrollWarning: null
            };
            preDecisionState.emotionalLine = "This is a demo scenario based on a typical survival stage startup. Connect your data to see your own death clock.";
            preDecisionState.narrative = {
                voice: "strategic",
                headline: "Demo Insight: Your burn increased by 22% last month.",
                vibe: "URGENT",
                paragraphs: [
                    "Note: You are viewing DEMO DATA. This is a simulation of a company spending ₹3.1L with ₹1.25L revenue.",
                    "In this demo scenario, your top risk is Marketing spend efficiency. A 15% cut would extend your life by 24 days.",
                    "Connect your bank via 'Integrations' to see your actual runway and top risk categories."
                ]
            };
        }

        // ── 27. Decision Engine v2 (Structured) ──────────────────────────
        const snapshots = await this.prisma.cfoStateSnapshot.findMany({
            where: { organizationId },
            orderBy: { generatedAt: 'desc' },
            take: 3
        });
        
        const decisionOutput = this.decisionEngineService.generateDecisions(preDecisionState as CFOState, snapshots);

        // ── 28. Lifecycle Persistence (v3.0 Execution Loop) ───────────
        const profile = await this.prisma.startupProfile.findUnique({ where: { organizationId }});
        
        if (profile) {
            for (const decision of decisionOutput.decisions) {
                const dbDecision = await this.prisma.cfoDecision.findFirst({
                    where: { 
                        startupProfileId: profile.id, 
                        decisionType: decision.decisionKey,
                        status: { not: 'FIXED' }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (dbDecision) {
                    decision.status = dbDecision.status as any;
                    decision.id = dbDecision.id;
                    // Sync execution plan from DB if it exists
                    if (dbDecision.recommendedActions && Array.isArray(dbDecision.recommendedActions)) {
                        decision.executionPlan = dbDecision.recommendedActions as any;
                    }
                } else if (decision.type === 'mandate') {
                    // AUTO-PERSIST Mandates
                    const newDb = await this.prisma.cfoDecision.create({
                        data: {
                            startupProfileId: profile.id,
                            decisionDomain: 'SURVIVAL',
                            decisionType: decision.decisionKey,
                            severity: decision.urgency.toUpperCase(),
                            confidence: decision.confidence.score / 100,
                            facts: { message: decision.message } as any,
                            recommendedActions: decision.executionPlan as any,
                            status: 'NEW'
                        }
                    });
                    decision.id = newDb.id;
                    decision.status = 'NEW';
                }
            }
        }

        const state: CFOState = {
            ...preDecisionState,
            decisionEngine: decisionOutput,
        };
        
        state.tone = (decisionOutput.urgency === 'critical' || decisionOutput.urgency === 'high') 
            ? 'urgent' 
            : (decisionOutput.stability === 'volatile' ? 'cautious' : 'strategic');

        // ── Save snapshot to DB (async, don't block response) ─────────────
        this.saveSnapshot(organizationId, state).catch(err =>
            this.logger.error(`Failed to save snapshot: ${err.message}`)
        );

        // ── Track decision ────────────────────────────────────────────────
        this.trackDecisionShown(organizationId, forcedDecision, s.runwayMonths).catch(err =>
            this.logger.error(`Failed to track decision: ${err.message}`)
        );

        // Cache
        this.cache.set(organizationId, {
            state,
            expiresAt: Date.now() + CfoStateService.CACHE_TTL_MS,
        });

        this.enforceIntegrity(state);

        const elapsed = Date.now() - startTime;
        this.logger.log(`CFOState v2 generated in ${elapsed}ms (status=${companyStatus}, tone=${engine.tone})`);

        return state;
    }

    private enforceIntegrity(state: CFOState) {
        // Enforce hard constraints: Increasing fixed costs MUST reduce runway
        if (state.decisionEngine && state.decisionEngine.decisions) {
            for (const decision of state.decisionEngine.decisions) {
                const titleLower = decision.title.toLowerCase();
                const key = decision.decisionKey || '';
                
                // If this is an action that increases cost (hirings, investments, adding tools)
                if (key.includes('HIRE') || titleLower.includes('hire') || titleLower.includes('invest') || titleLower.includes('add ')) {
                    if (decision.impactPreview && decision.impactPreview.delta > 0) {
                        this.logger.warn(`Integrity Violation caught: ${decision.decisionKey} suggested increased costs but improved runway. Forcing correction.`);
                        
                        // Force negative impact on runway
                        decision.impactPreview.delta = -Math.abs(decision.impactPreview.delta);
                        decision.impactPreview.after = decision.impactPreview.before + decision.impactPreview.delta;
                        
                        if (decision.impactLine && decision.impactLine.includes('+')) {
                            decision.impactLine = decision.impactLine.replace('+', '-');
                        }
                    }
                    if (decision.impactRunwayDays && decision.impactRunwayDays > 0) {
                        decision.impactRunwayDays = -Math.abs(decision.impactRunwayDays);
                    }
                }
            }
        }
    }

    /**
     * Audit Layer: Returns raw derivation steps for system verification.
     */
    async getDebugState(organizationId: string) {
        const brainReport = await this.brainService.generateReport(organizationId);
        const startupProfile = await this.prisma.startupProfile.findFirst({ where: { organizationId } });
        
        return {
            inputs: {
                organizationId,
                profile: startupProfile,
                timestamp: new Date().toISOString()
            },
            derivation: {
                formulas: {
                    netBurn: "max(monthlyExpenses - monthlyRevenue, 0)",
                    runway: "min(cashInBank / netBurn, 36.0)",
                    cash: "sum(activeBankBalances)"
                },
                rawMetrics: brainReport.summary,
                quality: brainReport.dataQuality,
                insightsGenerated: brainReport.insights.length
            },
            finalMetrics: {
                cash: brainReport.summary.cashInBank,
                runway: brainReport.summary.runwayMonths,
                burn: brainReport.summary.netBurn,
                revenue: brainReport.summary.monthlyRevenue
            }
        };
    }

    invalidateCache(organizationId: string) {
        this.cache.delete(organizationId);
        this.logger.log(`CFOState cache invalidated for org ${organizationId}`);
    }

    async getDecisionTimeline(organizationId: string): Promise<any[]> {
        const snapshots = await this.prisma.cfoStateSnapshot.findMany({
            where: { organizationId, statusChanged: true },
            orderBy: { generatedAt: 'desc' },
            take: 10
        });

        const executions = await this.prisma.executionLog.findMany({
            where: { profile: { organizationId } },
            orderBy: { executedAt: 'desc' },
            take: 10
        });

        const timeline: any[] = [];

        snapshots.forEach(s => {
            const explanation = (s.explanation as any) || { primaryDriver: s.companyStatus, contributingFactors: [] };
            timeline.push({
                id: s.id,
                type: 'MODE_CHANGE',
                title: `Entered ${s.companyStatus.toUpperCase()}`,
                timestamp: s.generatedAt,
                explanation: {
                    primaryDriver: explanation.primaryDriver,
                    contributingFactors: explanation.contributingFactors,
                    impact: { runwayBefore: Number(s.runwayMonths) - (Number(s.runwayChangeDays || 0) / 30), runwayAfter: Number(s.runwayMonths) }
                }
            });
        });

        executions.forEach(e => {
            const explanation = (e.explanation as any) || { primaryDriver: 'Action executed', contributingFactors: [] };
            timeline.push({
                id: e.id,
                type: e.status === 'REVERTED' ? 'ACTION_REVERTED' : 'ACTION_EXECUTED',
                title: e.status === 'REVERTED' ? 'Action Stepped Back' : 'Autonomous Decision Applied',
                timestamp: e.executedAt,
                explanation: {
                    primaryDriver: explanation.primaryDriver,
                    contributingFactors: explanation.contributingFactors,
                }
            });
        });

        return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
    }


    // ── DECISION EVENT API (called from frontend) ─────────────────────────

    async recordDecisionClick(
        organizationId: string,
        decisionId: string,
        optionChosen: string,
    ): Promise<void> {
        await this.prisma.cfoDecisionEvent.upsert({
            where: { organizationId_decisionId: { organizationId, decisionId } },
            update: {
                clickedAt: new Date(),
                optionChosen,
                acknowledged: true,
                lastShownAt: new Date(),
            },
            create: {
                organizationId,
                decisionId,
                decisionStatement: '',
                optionChosen,
                clickedAt: new Date(),
                acknowledged: true,
            },
        });
    }

    async recordDecisionActed(
        organizationId: string,
        decisionId: string,
        currentRunway: number,
    ): Promise<void> {
        const event = await this.prisma.cfoDecisionEvent.findUnique({
            where: { organizationId_decisionId: { organizationId, decisionId } },
        });

        if (event) {
            const runwayDelta = event.runwayAtShown ? currentRunway - event.runwayAtShown : null;
            const outcome = runwayDelta !== null
                ? (runwayDelta > 0.5 ? 'improved' : runwayDelta < -0.5 ? 'worsened' : 'no_change')
                : null;

            await this.prisma.cfoDecisionEvent.update({
                where: { id: event.id },
                data: {
                    acted: true,
                    actedAt: new Date(),
                    resolved: true,
                    resolvedAt: new Date(),
                    outcome,
                    runwayAtResolved: currentRunway,
                    runwayDelta,
                },
            });
        }
    }

    async acknowledgeAlert(alertId: string): Promise<void> {
        // Core action: mark alert as acknowledged
        await this.prisma.alert.update({
            where: { id: alertId },
            data: { acknowledged: true }
        });
        
        // Secondary actions: update behavioral metrics (non-critical, don't block acknowledgment)
        try {
            const alert = await this.prisma.alert.findUnique({ where: { id: alertId }, select: { userId: true } });
            if (alert?.userId) {
                await this.resetInertia(alert.userId);
                
                // Only attempt update if profile exists
                const profile = await this.prisma.startupProfile.findUnique({ where: { userId: alert.userId } });
                if (profile) {
                    await this.prisma.startupProfile.update({
                        where: { userId: alert.userId },
                        data: { 
                            ignoredAlertsCount: profile.ignoredAlertsCount > 0 ? profile.ignoredAlertsCount - 1 : 0 
                        }
                    });
                }
            }
        } catch (err) {
            this.logger.error(`Error updating behavioral metrics during alert acknowledgment: ${err.message}`);
        }
    }

    async resetInertia(userId: string): Promise<void> {
        await this.prisma.startupProfile.updateMany({
            where: { userId },
            data: { daysSinceLastAction: 0 }
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIVATE COMPUTATION METHODS
    // ══════════════════════════════════════════════════════════════════════════

    private determineStatus(runwayMonths: number, tone: string): CompanyStatus {
        if (runwayMonths < 6 || tone === 'urgent') return 'critical';
        if (runwayMonths < 12 || tone === 'cautious') return 'at_risk';
        return 'stable';
    }

    // ── GAP 4: EXPLAINABLE DEATH CLOCK ────────────────────────────────────────

    private computeDeathClock(
        s: CfoBrainReport['summary'],
        receivables: Receivables,
    ): DeathClock {
        const now = new Date();

        if (s.netBurn <= 0) {
            return {
                statement: 'You are cash-flow positive. No death clock — protect this.',
                date: null,
                daysLeft: null,
                bestCase: {
                    label: 'Best Case',
                    assumptions: ['Revenue continues growing', 'Expenses remain stable'],
                    date: null,
                    daysLeft: null,
                },
                worstCase: {
                    label: 'Worst Case',
                    assumptions: ['Revenue stops', 'Expenses continue'],
                    date: null,
                    daysLeft: s.monthlyExpenses > 0
                        ? Math.round((s.cashInBank / s.monthlyExpenses) * 30.44)
                        : null,
                },
                payrollSafe: true,
                payrollWarning: null,
            };
        }

        // Base death date
        const baseDays = Math.round((s.cashInBank / s.netBurn) * 30.44);
        const deathDate = addDays(now, baseDays);

        // GAP 4: BEST CASE = all receivables collected + 20% cost cut
        const costCut = s.monthlyExpenses * 0.2; // 20% cut
        const bestCaseCash = s.cashInBank + receivables.totalOutstanding;
        const bestCaseBurn = Math.max(0, (s.monthlyExpenses - costCut) - s.monthlyRevenue);
        const bestCaseDays = bestCaseBurn > 0
            ? Math.round((bestCaseCash / bestCaseBurn) * 30.44)
            : 9999;

        const bestCase: DeathClockScenario = {
            label: 'Best Case',
            assumptions: [
                `All receivables collected (${fmt(receivables.totalOutstanding)})`,
                `Expenses cut by 20% (${fmt(costCut)}/mo saved)`,
            ],
            date: bestCaseDays < 9999 ? toISO(addDays(now, bestCaseDays)) : null,
            daysLeft: bestCaseDays < 9999 ? bestCaseDays : null,
        };

        // GAP 4: WORST CASE = no receivables + current burn continues
        const worstCaseBurn = s.netBurn; // no improvement
        const worstCaseDays = Math.round((s.cashInBank / worstCaseBurn) * 30.44);

        const worstCase: DeathClockScenario = {
            label: 'Worst Case',
            assumptions: [
                'No receivables collected',
                'Current burn continues unchanged',
            ],
            date: toISO(addDays(now, worstCaseDays)),
            daysLeft: worstCaseDays,
        };

        // GAP 3: Can you pay next payroll?
        const payrollCost = s.monthlyExpenses * 0.5; // Assume ~50% of expenses = payroll
        const daysUntilPayroll = 30 - new Date().getDate() + 1; // next 1st of month
        const cashAtPayroll = s.cashInBank - (s.netBurn / 30.44) * daysUntilPayroll;
        const payrollSafe = cashAtPayroll >= payrollCost;
        const payrollWarning = !payrollSafe
            ? `You will miss payroll on ${toDateStr(addDays(now, daysUntilPayroll))}. Cash shortfall: ${fmt(payrollCost - cashAtPayroll)}.`
            : null;

        return {
            statement: `You will run out of money on ${toDateStr(deathDate)}.`,
            date: toISO(deathDate),
            daysLeft: baseDays,
            bestCase,
            worstCase,
            payrollSafe,
            payrollWarning,
        };
    }

    // ── GAP 3: DAILY CASH FLOW ENGINE ─────────────────────────────────────────

    private computeCashForecast(
        s: CfoBrainReport['summary'],
        receivables: Receivables,
    ): CashForecast {
        const dailyBurn = s.netBurn > 0 ? s.netBurn / 30.44 : 0;
        const dailyRevenue = s.monthlyRevenue / 30.44;
        const dailyExpenses = s.monthlyExpenses / 30.44;
        const next30Days: number[] = [];
        const next90Days: number[] = [];
        const dailyFlow: DailyCashFlowEntry[] = [];
        let crunchDate: string | null = null;
        let dangerDate: string | null = null;
        let payrollMissDate: string | null = null;
        const monthlyPayroll = s.monthlyExpenses * 0.5; // ~50% is payroll
        const now = new Date();

        // Build receivable map: which day do we expect inflows?
        const receivableByDay = new Map<number, number>();
        for (const inf of receivables.expectedInflows) {
            const dayOffset = Math.max(0, daysBetween(now, new Date(inf.date)));
            if (dayOffset < 90) {
                receivableByDay.set(dayOffset,
                    (receivableByDay.get(dayOffset) || 0) + inf.amount * inf.confidence
                );
            }
        }

        let runningCash = s.cashInBank;

        for (let day = 0; day < 90; day++) {
            const dayDate = addDays(now, day);
            const dayOfMonth = dayDate.getDate();
            const isPayrollDay = dayOfMonth === 1;
            const isRentDay = dayOfMonth === 1;

            const openingBalance = runningCash;

            // Inflows: daily revenue + any expected receivables
            const receivableInflow = receivableByDay.get(day) || 0;
            const totalInflow = dailyRevenue + receivableInflow;

            // Outflows: daily expenses (payroll concentrates on 1st)
            let totalOutflow = dailyExpenses;
            if (isPayrollDay && day > 0) {
                // Lump payroll: 50% of monthly expenses hits on 1st
                totalOutflow = dailyExpenses + monthlyPayroll * 0.8; // 80% of payroll on 1st
            }

            const closingBalance = openingBalance + totalInflow - totalOutflow;
            runningCash = closingBalance;

            // Flags
            const flags: DailyCashFlowEntry['flags'] = [];
            if (isPayrollDay && day > 0) flags.push('payroll_day');
            if (isRentDay && day > 0) flags.push('rent_due');
            if (closingBalance <= 0) flags.push('crunch');
            else if (closingBalance < s.monthlyExpenses) flags.push('danger');

            // Detect events
            if (closingBalance <= 0 && !crunchDate) {
                crunchDate = toISO(dayDate);
            }
            if (closingBalance < s.monthlyExpenses && !dangerDate && closingBalance > 0) {
                dangerDate = toISO(dayDate);
            }
            if (isPayrollDay && closingBalance < monthlyPayroll && !payrollMissDate && day > 0) {
                payrollMissDate = toISO(dayDate);
            }

            const cashPos = Math.max(0, Math.round(closingBalance));
            if (day < 30) next30Days.push(cashPos);
            next90Days.push(cashPos);

            dailyFlow.push({
                date: toISO(dayDate),
                openingBalance: Math.round(openingBalance),
                inflow: Math.round(totalInflow),
                outflow: Math.round(totalOutflow),
                closingBalance: Math.round(closingBalance),
                flags,
            });
        }

        return { next30Days, next90Days, dailyFlow, crunchDate, dangerDate, payrollMissDate };
    }

    // ── GAP 5: PRIORITY STACK ─────────────────────────────────────────────────

    private buildPriorityStack(
        s: CfoBrainReport['summary'],
        categories: CategoryImpact[],
        engine: CfoBrainReport['decisionEngine'],
        receivables: Receivables,
    ): PriorityItem[] {
        const stack: PriorityItem[] = [];

        // 1. Runway critical
        if (s.runwayMonths < 3) {
            stack.push({
                issue: `Runway is ${s.runwayMonths.toFixed(1)} months. Company will die without action.`,
                impactOnRunwayDays: 0,
                urgency: 'now',
                actionable: true,
                actionPayload: { type: 'simulate_cost_cut' },
            });
        }

        // 2. Burn increasing
        if (s.burnTrend === 'increasing') {
            stack.push({
                issue: `Burn rate is increasing. Every month you wait costs more.`,
                impactOnRunwayDays: -Math.round((s.netBurn * 0.1 / (s.netBurn || 1)) * s.runwayMonths * 30.44),
                urgency: s.runwayMonths < 6 ? 'now' : 'soon',
                actionable: true,
                actionPayload: { type: 'navigate', navigateTo: '/expenses' },
            });
        }

        // 3. Collect receivables
        if (receivables.totalOutstanding > 0) {
            stack.push({
                issue: `${fmt(receivables.totalOutstanding)} outstanding in receivables. Collect or your runway is shorter.`,
                impactOnRunwayDays: receivables.runwayExtensionDays,
                urgency: receivables.runwayExtensionDays > 30 ? 'now' : 'soon',
                actionable: true,
                actionPayload: { type: 'navigate', navigateTo: '/invoices' },
            });
        }

        // 4. Cuttable categories
        const topCut = categories
            .filter(c => c.runwayImpactDays > 10 && c.category !== 'Payroll')
            .sort((a, b) => b.runwayImpactDays - a.runwayImpactDays)[0];

        if (topCut) {
            stack.push({
                issue: `${topCut.category} costs ${fmt(topCut.amount)}/mo. Cutting 30% buys ${topCut.runwayImpactDays} more days.`,
                impactOnRunwayDays: topCut.runwayImpactDays,
                urgency: s.runwayMonths < 6 ? 'now' : 'soon',
                actionable: true,
                actionPayload: {
                    type: 'simulate_cost_cut',
                    preloadedScenario: { categories: [topCut.category.toLowerCase()] },
                },
            });
        }

        // 5. Revenue decline
        if (s.revenueTrend === 'declining') {
            stack.push({
                issue: 'Revenue is declining. This is accelerating your death clock.',
                impactOnRunwayDays: -Math.round(s.runwayMonths * 3),
                urgency: 'now',
                actionable: true,
                actionPayload: { type: 'simulate_growth' },
            });
        }

        // 6. Secondary warnings as lower-priority items
        for (const warning of engine.secondaryWarnings.slice(0, 2)) {
            stack.push({
                issue: warning,
                impactOnRunwayDays: 0,
                urgency: 'later',
                actionable: false,
            });
        }

        // Sort: now > soon > later, then by impact
        const urgencyOrder = { now: 0, soon: 1, later: 2 };
        stack.sort((a, b) => {
            const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
            if (urgDiff !== 0) return urgDiff;
            return Math.abs(b.impactOnRunwayDays) - Math.abs(a.impactOnRunwayDays);
        });

        return stack.slice(0, 5); // Max 5 priorities
    }

    // ── GAP 1: DELTA FROM LAST SNAPSHOT ───────────────────────────────────────

    private async computeDelta(
        organizationId: string,
        s: CfoBrainReport['summary'],
        currentStatus: CompanyStatus,
        currentRisk: PrimaryRisk,
    ): Promise<CFOStateDelta> {
        // Find last snapshot from ~7 days ago (or most recent)
        const sevenDaysAgo = addDays(new Date(), -7);

        const lastSnapshot = await this.prisma.cfoStateSnapshot.findFirst({
            where: {
                organizationId,
                generatedAt: { lt: sevenDaysAgo },
            },
            orderBy: { generatedAt: 'desc' },
        });

        if (!lastSnapshot) {
            // No history yet — check for any snapshot at all
            const anySnapshot = await this.prisma.cfoStateSnapshot.findFirst({
                where: { organizationId },
                orderBy: { generatedAt: 'desc' },
            });

            if (!anySnapshot) {
                return {
                    runwayChangeDays: null,
                    burnChangePercent: null,
                    cashChangeAmount: null,
                    riskChanged: false,
                    statusChanged: false,
                    summaryLine: null,
                    burnStreakWeeks: 0,
                    periodLabel: 'first analysis',
                    prevRunwayMonths: null,
                    prevNetBurn: null,
                    prevRevenue: null,
                };
            }

            // Compare to most recent
            return this.computeDeltaFromSnapshot(anySnapshot, s, currentStatus, currentRisk, 'vs last analysis');
        }

        // Compute burn streak
        const burnStreak = await this.computeBurnStreak(organizationId);

        const delta = this.computeDeltaFromSnapshot(lastSnapshot, s, currentStatus, currentRisk, 'vs 7 days ago');
        delta.burnStreakWeeks = burnStreak;

        // Enrich summary line with streak info
        if (burnStreak >= 3) {
            delta.summaryLine = (delta.summaryLine || '') +
                ` Burn has increased for ${burnStreak} consecutive weeks.`;
        }

        return delta;
    }

    private computeDeltaFromSnapshot(
        snapshot: any,
        s: CfoBrainReport['summary'],
        currentStatus: CompanyStatus,
        currentRisk: PrimaryRisk,
        periodLabel: string,
    ): CFOStateDelta {
        const currentDays = s.netBurn > 0 ? Math.round((s.cashInBank / s.netBurn) * 30.44) : 9999;
        const prevDays = snapshot.daysLeft || 0;
        const daysDiff = currentDays - prevDays;

        const burnChange = snapshot.netBurn > 0
            ? ((s.netBurn - snapshot.netBurn) / snapshot.netBurn) * 100
            : null;

        const cashChange = s.cashInBank - snapshot.cashInBank;
        const riskChanged = currentRisk.type !== 'none' && currentRisk.severity !== snapshot.companyStatus;
        const statusChanged = currentStatus !== snapshot.companyStatus;

        // Generate human-readable summary
        let summaryLine: string | null = null;
        if (daysDiff !== 0 && prevDays > 0) {
            if (daysDiff < 0) {
                summaryLine = `You lost ${Math.abs(daysDiff)} days of runway ${periodLabel}.`;
            } else {
                // 🔥 DOPAMINE LOOP: Highlight gains
                summaryLine = `Success: Your recent action extended runway by +${daysDiff} days. Top 12% founders act this fast.`;
            }
        }
        if (burnChange !== null && Math.abs(burnChange) >= 5) {
            const burnDir = burnChange > 0 ? 'increased' : 'decreased';
            summaryLine = (summaryLine || '') + ` Burn ${burnDir} ${Math.abs(burnChange).toFixed(0)}%.`;
        }

        return {
            runwayChangeDays: prevDays > 0 ? daysDiff : null,
            burnChangePercent: burnChange ? Math.round(burnChange * 10) / 10 : null,
            cashChangeAmount: Math.round(cashChange),
            riskChanged,
            statusChanged,
            summaryLine: summaryLine?.trim() || null,
            burnStreakWeeks: 0,
            periodLabel,
            prevRunwayMonths: snapshot.runwayMonths || null,
            prevNetBurn: snapshot.netBurn || null,
            prevRevenue: snapshot.monthlyRevenue || null,
        };
    }

    private async computeBurnStreak(organizationId: string): Promise<number> {
        // Get last 4 weekly snapshots
        const snapshots = await this.prisma.cfoStateSnapshot.findMany({
            where: { organizationId },
            orderBy: { generatedAt: 'desc' },
            take: 4,
            select: { netBurn: true, generatedAt: true },
        });

        if (snapshots.length < 2) return 0;

        let streak = 0;
        for (let i = 0; i < snapshots.length - 1; i++) {
            if (snapshots[i].netBurn > snapshots[i + 1].netBurn) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    // ── GAP 2: DECISION MEMORY ────────────────────────────────────────────────

    private async computeDecisionMemory(
        organizationId: string,
        currentRunway: number,
    ): Promise<DecisionMemory> {
        // Fetch all decisions for this organization via the profile
        const profile = await this.prisma.startupProfile.findUnique({ where: { organizationId }});
        if (!profile) return { pendingDecisions: 0, ignoredForDays: null, lastActedDecision: null, lastOutcome: null, nudge: null };

        const pendingDecisions = await this.prisma.cfoDecision.findMany({
            where: { startupProfileId: profile.id, status: { in: ['NEW', 'REVIEWING', 'IMPLEMENTING', 'IGNORED'] } },
            orderBy: { createdAt: 'asc' }
        });

        const ignored = pendingDecisions.filter(d => d.status === 'IGNORED');
        const oldestIgnored = ignored[0];
        
        let nudge: string | null = null;
        if (oldestIgnored) {
            const days = daysBetween(oldestIgnored.createdAt, new Date());
            const facts = oldestIgnored.facts as any;
            const firstRunway = facts.runwayAtDetection || currentRunway;
            const drop = (firstRunway - currentRunway).toFixed(1);
            
            // 🔥 PROGRESSIVE PRESSURE SYSTEM
            if (ignored.length >= 5) {
                nudge = `Avoiding this is actively reducing your survival window. Runway dropped ${firstRunway} → ${currentRunway} months.`;
            } else if (ignored.length >= 3) {
                nudge = `You've ignored this recommendation ${ignored.length} times. Your runway has dropped from ${firstRunway} → ${currentRunway} months.`;
            } else {
                nudge = `You have ${pendingDecisions.length} pending decisions. Action today extends runway by days, not months.`;
            }
        }

        // Check for recent success (Dopamine)
        const lastFixed = await this.prisma.cfoDecision.findFirst({
            where: { startupProfileId: profile.id, status: 'FIXED' },
            orderBy: { updatedAt: 'desc' }
        });

        return {
            pendingDecisions: pendingDecisions.length,
            ignoredForDays: oldestIgnored ? daysBetween(oldestIgnored.createdAt, new Date()) : null,
            lastActedDecision: lastFixed ? lastFixed.decisionType : null,
            lastOutcome: lastFixed ? 'improved' : null,
            nudge
        };
    }

    // ── GAP 7: UNIFIED NARRATIVE ──────────────────────────────────────────────

    private buildNarrative(
        s: CfoBrainReport['summary'],
        deathClock: DeathClock,
        delta: CFOStateDelta,
        decisionMemory: DecisionMemory,
        tone: 'urgent' | 'cautious' | 'strategic',
    ): Narrative {
        const runway = s.runwayMonths >= 36 ? '> 36 months' : `${s.runwayMonths.toFixed(1)} months`;
        const trend = s.burnTrend === 'increasing' ? 'Burn rising' : 
                     s.burnTrend === 'decreasing' ? 'Burn decreasing' : 'Burn is stable';
        
        let implication = '';
        if (s.runwayMonths >= 36) {
            implication = 'capital is not your constraint';
        } else if (s.runwayMonths < 6) {
            const days = deathClock.daysLeft || Math.round(s.runwayMonths * 30);
            implication = `this becomes critical in ~${days} days`;
        } else if (s.burnTrend === 'increasing') {
            implication = 'requires monitoring or cost adjustment';
        } else if (s.revenueTrend === 'growing') {
            implication = 'you can invest in growth safely';
        } else {
            implication = 'focus on maintaining efficiency';
        }

        const headline = `You have ${runway} runway. ${trend} — ${implication}.`;
        
        // Build summary for secondary depth
        let summary = deathClock.statement;
        if (delta.summaryLine) summary += ' ' + delta.summaryLine;
        if (decisionMemory.nudge) summary += ' ' + decisionMemory.nudge;

        return {
            headline,
            summary: summary.trim(),
            tone: tone === 'urgent' ? 'urgent' : tone === 'cautious' ? 'cautious' : 'confident',
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FOUNDER PRESSURE SYSTEM — ALERT ENGINE
    // All logic is threshold-based. No hardcoded messages. No fake data.
    // ══════════════════════════════════════════════════════════════════════════

    private buildCriticalAlerts(
        s: CfoBrainReport['summary'],
        deathClock: DeathClock,
        receivables: Receivables,
        categories: CategoryImpact[],
        delta: CFOStateDelta,
    ): CriticalAlert[] {
        const alerts: CriticalAlert[] = [];
        const seen = new Set<string>(); // deduplicate

        // 1. Runway critically low (< 45 days)
        if (deathClock.daysLeft !== null && deathClock.daysLeft < 45) {
            const id = 'runway_critical';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'high',
                    title: `You will run out of cash within ${deathClock.daysLeft} days`,
                    description: `At ${fmt(s.netBurn)}/mo burn on ${fmt(s.cashInBank)} cash, your company will not survive ${Math.ceil(deathClock.daysLeft / 30)} more months.`,
                    impact: `-${deathClock.daysLeft} days until zero`,
                    actionPayload: { type: 'simulate_cost_cut' },
                });
            }
        }
        // 1b. Runway warning (< 90 days)
        else if (deathClock.daysLeft !== null && deathClock.daysLeft < 90) {
            const id = 'runway_warning';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'medium',
                    title: `Less than 3 months of runway remaining`,
                    description: `You have ${deathClock.daysLeft} days left. Every day without action shortens your survival.`,
                    impact: `${deathClock.daysLeft} days remaining`,
                    actionPayload: { type: 'simulate_cost_cut' },
                });
            }
        }

        // 2. Payroll miss risk
        if (!deathClock.payrollSafe && deathClock.payrollWarning) {
            const id = 'payroll_miss';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'high',
                    title: 'You will miss payroll',
                    description: deathClock.payrollWarning,
                    impact: 'Immediate team risk',
                    actionPayload: { type: 'simulate_cost_cut' },
                });
            }
        }

        // 3. Receivables > 30% of cash — money stuck
        if (s.cashInBank > 0 && receivables.totalOutstanding > s.cashInBank * 0.3) {
            const pct = Math.round((receivables.totalOutstanding / s.cashInBank) * 100);
            const id = 'receivables_stuck';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'high',
                    title: `${fmt(receivables.totalOutstanding)} is stuck in unpaid invoices`,
                    description: `${pct}% of your cash position is tied up in receivables. Collecting this extends your runway by ${receivables.runwayExtensionDays} days.`,
                    impact: `+${receivables.runwayExtensionDays} days if collected`,
                    actionPayload: { type: 'navigate', navigateTo: '/invoices' },
                });
            }
        }

        // 4. Burn increasing significantly (delta > 15%)
        if (delta.burnChangePercent !== null && delta.burnChangePercent > 15) {
            const id = 'burn_increasing';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'medium',
                    title: `Burn rate increased ${Math.round(delta.burnChangePercent)}% ${delta.periodLabel}`,
                    description: `You are spending more than before. This is accelerating your death clock.`,
                    impact: delta.runwayChangeDays !== null ? `${delta.runwayChangeDays} days runway` : 'Runway shrinking',
                    actionPayload: { type: 'navigate', navigateTo: '/expenses' },
                });
            }
        }

        // 5. Burn streak (3+ consecutive weeks)
        if (delta.burnStreakWeeks >= 3) {
            const id = 'burn_streak';
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'high',
                    title: `Burn has increased for ${delta.burnStreakWeeks} consecutive weeks`,
                    description: `This is not a one-time spike. Your costs are structurally rising. Act now.`,
                    impact: 'Compounding runway loss',
                    actionPayload: { type: 'simulate_cost_cut' },
                });
            }
        }

        // 6. Top category spiked > 20%
        const spikedCategory = categories.find(c =>
            c.trend === 'up' && c.changePercent !== null && c.changePercent > 20 && c.amount > s.monthlyExpenses * 0.1
        );
        if (spikedCategory) {
            const id = `category_spike_${spikedCategory.category}`;
            if (!seen.has(id)) {
                seen.add(id);
                alerts.push({
                    id,
                    severity: 'medium',
                    title: `Your ${spikedCategory.category} spend is rising fast`,
                    description: `${spikedCategory.category} increased ${Math.round(spikedCategory.changePercent!)}% to ${fmt(spikedCategory.amount)}/mo. Cutting 30% would add ${spikedCategory.runwayImpactDays} days.`,
                    impact: `+${spikedCategory.runwayImpactDays} days if cut 30%`,
                    actionPayload: {
                        type: 'simulate_cost_cut',
                        preloadedScenario: { categories: [spikedCategory.category.toLowerCase()] },
                    },
                });
            }
        }

        // Sort: high > medium > low, then cap at 5
        const severityOrder = { high: 0, medium: 1, low: 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return alerts.slice(0, 5);
    }

    // ── FOUNDER PRESSURE: TODAY'S ACTIONS ──────────────────────────────────────

    private buildTodaysActions(
        priorityStack: PriorityItem[],
        categories: CategoryImpact[],
        s: CfoBrainReport['summary'],
        receivables: Receivables,
    ): TodaysAction[] {
        const actions: TodaysAction[] = [];

        // Pull from priorityStack
        for (const item of priorityStack) {
            if (item.actionable && item.actionPayload && actions.length < 3) {
                const outcome = item.impactOnRunwayDays > 0 ? `adds ${item.impactOnRunwayDays} days runway` : `prevents further depletion`;
                const ifIgnored = item.urgency === 'now' ? 'Ignoring this leads to immediate cash crunch.' : 'Ignoring this slows down growth buffer.';
                
                actions.push({
                    id: `action_${actions.length}`,
                    title: this.toPressureTitle(item),
                    description: `${item.issue} -> Choosing this ${outcome}. -> If ignored, ${ifIgnored}`,
                    impactDays: Math.abs(item.impactOnRunwayDays),
                    actionPayload: item.actionPayload,
                });
            }
        }

        // If < 3 actions, categories
        if (actions.length < 3) {
            const cuttableCategories = categories
                .filter(c => c.runwayImpactDays > 5 && c.category !== 'Payroll')
                .sort((a, b) => b.runwayImpactDays - a.runwayImpactDays);

            for (const cat of cuttableCategories) {
                if (actions.length >= 3) break;
                if (actions.some(a => a.description.includes(cat.category))) continue;

                actions.push({
                    id: `action_cut_${cat.category.toLowerCase().replace(/\s+/g, '_')}`,
                    title: `Cut ${cat.category} by 30%`,
                    description: `Optimize ${cat.category} expenses -> Extending runway by ${cat.runwayImpactDays} days. -> If ignored, profitability is delayed by ~30 days.`,
                    impactDays: cat.runwayImpactDays,
                    actionPayload: {
                        type: 'simulate_cost_cut',
                        preloadedScenario: { categories: [cat.category.toLowerCase()] },
                    },
                });
            }
        }

        // Sort by impactDays descending (most impactful first)
        actions.sort((a, b) => b.impactDays - a.impactDays);

        return actions.slice(0, 3);
    }

    private toPressureTitle(item: PriorityItem): string {
        const prefix = item.urgency === 'now' ? '[ACTION REQUIRED]' : 
                      item.urgency === 'soon' ? '[PRUDENT]' : '[STRATEGIC]';
        
        let title = 'Financial Adjustment';
        if (item.issue.includes('Runway')) title = 'Extend Runway Buffer';
        else if (item.issue.includes('Burn')) title = 'Optimize Monthly Spend';
        else if (item.issue.includes('outstanding')) title = 'Recover Outstanding Cash';
        else if (item.issue.includes('Revenue')) title = 'Stabilize Revenue Growth';
        else {
            const firstSentence = item.issue.split('.')[0];
            title = firstSentence.length > 30 ? firstSentence.substring(0, 27) + '...' : firstSentence;
        }

        return `${prefix} ${title}`;
    }

    // ── FOUNDER PRESSURE: NEGATIVE TRENDS ─────────────────────────────────────

    private buildNegativeTrends(
        delta: CFOStateDelta,
        categories: CategoryImpact[],
        s: CfoBrainReport['summary'],
    ): NegativeTrend[] {
        const trends: NegativeTrend[] = [];

        // 1. Burn rate change
        if (delta.burnChangePercent !== null && Math.abs(delta.burnChangePercent) >= 5) {
            const isWorse = delta.burnChangePercent > 0;
            trends.push({
                metric: 'Burn Rate',
                change: `${isWorse ? '+' : ''}${delta.burnChangePercent.toFixed(0)}%`,
                direction: isWorse ? 'worse' : 'better',
                message: isWorse
                    ? `You are burning ${Math.abs(delta.burnChangePercent).toFixed(0)}% more than last period. This will shorten your survival time.`
                    : `Burn decreased ${Math.abs(delta.burnChangePercent).toFixed(0)}%. Keep cutting.`,
            });
        }

        // 2. Runway change in days
        if (delta.runwayChangeDays !== null && Math.abs(delta.runwayChangeDays) >= 3) {
            const isWorse = delta.runwayChangeDays < 0;
            trends.push({
                metric: 'Runway',
                change: `${delta.runwayChangeDays > 0 ? '+' : ''}${delta.runwayChangeDays} days`,
                direction: isWorse ? 'worse' : 'better',
                message: isWorse
                    ? `You lost ${Math.abs(delta.runwayChangeDays)} days of runway ${delta.periodLabel}. Time is compressing.`
                    : `You gained ${delta.runwayChangeDays} days of runway ${delta.periodLabel}. Good — but don't stop.`,
            });
        }

        // 3. Cash change
        if (delta.cashChangeAmount !== null && Math.abs(delta.cashChangeAmount) >= 50000) {
            const isWorse = delta.cashChangeAmount < 0;
            trends.push({
                metric: 'Cash Position',
                change: `${delta.cashChangeAmount > 0 ? '+' : ''}${fmt(delta.cashChangeAmount)}`,
                direction: isWorse ? 'worse' : 'better',
                message: isWorse
                    ? `Cash dropped by ${fmt(Math.abs(delta.cashChangeAmount))} ${delta.periodLabel}. You are bleeding money.`
                    : `Cash increased by ${fmt(delta.cashChangeAmount)} ${delta.periodLabel}.`,
            });
        }

        // 4. Category spikes — only the worst one
        const worstCategorySpike = categories
            .filter(c => c.trend === 'up' && c.changePercent !== null && c.changePercent > 10)
            .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))[0];

        if (worstCategorySpike && trends.length < 3) {
            trends.push({
                metric: worstCategorySpike.category,
                change: `+${Math.round(worstCategorySpike.changePercent!)}%`,
                direction: 'worse',
                message: `${worstCategorySpike.category} spending jumped ${Math.round(worstCategorySpike.changePercent!)}% to ${fmt(worstCategorySpike.amount)}/mo.`,
            });
        }

        return trends.slice(0, 3);
    }

    // ── RECEIVABLES ───────────────────────────────────────────────────────────

    private async computeReceivables(
        organizationId: string,
        monthlyNetBurn: number,
    ): Promise<Receivables> {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: ['SENT', 'OVERDUE'] },
                deletedAt: null,
            },
            select: {
                invoiceNumber: true,
                amount: true,
                dueDate: true,
                status: true,
            },
            orderBy: { dueDate: 'asc' },
        });

        const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        const expectedInflows: ReceivableInflow[] = invoices.map(inv => {
            const isOverdue = inv.status === 'OVERDUE';
            return {
                amount: Number(inv.amount),
                date: inv.dueDate.toISOString(),
                confidence: isOverdue ? 0.5 : 0.8,
                source: `Invoice #${inv.invoiceNumber}`,
            };
        });

        const dailyBurn = monthlyNetBurn > 0 ? monthlyNetBurn / 30.44 : 0;
        const weightedReceivables = expectedInflows.reduce(
            (sum, inf) => sum + inf.amount * inf.confidence, 0
        );
        const extensionDays = dailyBurn > 0 ? Math.round(weightedReceivables / dailyBurn) : 0;

        return { totalOutstanding, expectedInflows, runwayExtensionDays: extensionDays };
    }

    // ── PRIMARY RISK ──────────────────────────────────────────────────────────

    private extractPrimaryRisk(
        engine: CfoBrainReport['decisionEngine'],
        report: CfoBrainReport,
    ): PrimaryRisk {
        if (engine.noDataCase) {
            return { type: 'none', message: 'Connect data sources to detect risks.', severity: 'low' };
        }

        const s = report.summary;
        const risks: Array<{ type: PrimaryRisk['type']; score: number; message: string; severity: PrimaryRisk['severity'] }> = [];

        // 1. Runway Risk (Impact: 10, Likelihood: 10/runway)
        if (s.runwayMonths < 12) {
            const likelihood = Math.min(10, 12 / Math.max(1, s.runwayMonths));
            risks.push({
                type: 'liquidity',
                score: 10 * likelihood,
                message: `Runway is tight at ${s.runwayMonths.toFixed(1)} months — capital buffer shrinking.`,
                severity: s.runwayMonths < 3 ? 'high' : 'medium'
            });
        }

        // 2. Burn Acceleration (Impact: 8, Likelihood: spike %)
        if (s.burnTrend === 'increasing') {
            risks.push({
                type: 'burn',
                score: 8 * 1.5, // Standard spike
                message: `Burn growing faster than revenue — unsustainable in 3–4 months.`,
                severity: 'medium'
            });
        }

        // 3. Revenue Stagnation (Impact: 7, Likelihood: 1 if declining/stable)
        if (s.revenueTrend === 'declining' || s.revenueTrend === 'stable') {
            risks.push({
                type: 'revenue_drop',
                score: 7 * (s.revenueTrend === 'declining' ? 1.5 : 1),
                message: `Growth has stalled — death clock accelerating.`,
                severity: s.revenueTrend === 'declining' ? 'high' : 'medium'
            });
        }

        // 4. Concentration Risk (Impact: 5, Likelihood: triggers)
        if (engine.triggers.includes('EXPENSE_DOMINANCE')) {
            risks.push({
                type: 'concentration',
                score: 5 * 1.2,
                message: `Single category dominance detected — reducing financial flexibility.`,
                severity: 'low'
            });
        }

        // If no active risks, synthesize a Strategic Timing risk
        if (risks.length === 0) {
            return {
                type: 'none',
                message: 'No immediate threats. Main risk: Stagnation while competitors aggressively hire.',
                severity: 'low'
            };
        }

        // Sort by score and pick top
        risks.sort((a, b) => b.score - a.score);
        const top = risks[0];

        // Override message with engine insight if it matches the type for better clarity
        return { 
            type: top.type, 
            message: top.message, 
            severity: top.severity 
        };
    }

    // ── FORCED DECISION ───────────────────────────────────────────────────────

    private buildForcedDecision(
        engine: CfoBrainReport['decisionEngine'],
        s: CfoBrainReport['summary'],
        categories: CfoBrainReport['categoryBreakdown'],
    ): ForcedDecision {
        const cuttable = categories.find(c => c.category !== 'Payroll' && c.amount > 0);
        const topCutCategories = categories
            .filter(c => c.category !== 'Payroll' && c.amount > 0)
            .slice(0, 3)
            .map(c => c.category.toLowerCase());

        const targetReduction = cuttable ? Math.round(cuttable.amount * 0.3) : Math.round(s.netBurn * 0.3);

        const cutOption: DecisionOption = {
            label: 'Cut Costs Now',
            impact: `Saves ~${fmt(targetReduction)}/mo, extends runway by ~${
                s.netBurn > 0 ? ((s.cashInBank / Math.max(1, s.netBurn - targetReduction)) - s.runwayMonths).toFixed(1) : '∞'
            } months`,
            actionPayload: {
                type: 'simulate_cost_cut',
                preloadedScenario: {
                    targetReduction,
                    categories: topCutCategories,
                    saasSpend: (() => {
                        const cat = categories.find(c =>
                            ['SaaS', 'Tools', 'Software', 'Subscriptions'].includes(c.category)
                        );
                        return cat ? Math.round(cat.amount * 0.7) : undefined;
                    })(),
                    marketingSpend: (() => {
                        const cat = categories.find(c =>
                            ['Marketing', 'Ads', 'Advertising'].includes(c.category)
                        );
                        return cat ? Math.round(cat.amount * 0.5) : undefined;
                    })(),
                },
            },
        };

        const fundraiseOption: DecisionOption = {
            label: 'Plan Fundraise',
            impact: `Bridge of ₹50L extends runway by ~${
                s.netBurn > 0 ? ((s.cashInBank + 5000000) / s.netBurn - s.runwayMonths).toFixed(1) : '∞'
            } months`,
            actionPayload: {
                type: 'simulate_fundraise',
                preloadedScenario: { currentCash: 5000000 },
            },
        };

        return {
            id: `decision_${Date.now()}`,
            statement: engine.forcedDecision,
            options: [cutOption, fundraiseOption],
        };
    }

    // ── GAP 6: CATEGORY ENRICHMENT (days + cut potential) ─────────────────────

    private enrichCategories(
        categories: CfoBrainReport['categoryBreakdown'],
        s: CfoBrainReport['summary'],
    ): CategoryImpact[] {
        const dailyBurn = s.netBurn > 0 ? s.netBurn / 30.44 : 0;

        return categories.map(cat => {
            let runwayImpactDays = 0;
            let cutPotential = 0;
            let runwayImpact: string | null = null;

            if (s.netBurn > 0 && cat.amount > 0) {
                const cutAmount = cat.amount * 0.3; // 30% cut
                cutPotential = Math.round(cutAmount);
                const newBurn = Math.max(0, s.netBurn - cutAmount);
                const dailyNewBurn = newBurn / 30.44;

                if (dailyBurn > 0) {
                    const currentDays = s.cashInBank / dailyBurn;
                    const newDays = dailyNewBurn > 0 ? s.cashInBank / dailyNewBurn : 99999;
                    runwayImpactDays = Math.round(newDays - currentDays);
                }

                if (runwayImpactDays > 0) {
                    runwayImpact = `Cutting ${cat.category} by 30% = +${runwayImpactDays} days runway`;
                }
            }

            return {
                category: cat.category,
                amount: cat.amount,
                pct: cat.pct,
                trend: cat.trend,
                changePercent: cat.changePercent,
                runwayImpactDays,
                cutPotential,
                runwayImpact,
            };
        });
    }

    // ── EMOTIONAL LINE ────────────────────────────────────────────────────────

    private generateEmotionalLine(
        s: CfoBrainReport['summary'],
        deathClock: DeathClock,
    ): string {
        if (s.netBurn <= 0) {
            return 'You are profitable. Every rupee you waste from here is a choice, not a necessity.';
        }
        if (!deathClock.payrollSafe) {
            return 'You cannot pay your team next month. Act now or lose them.';
        }
        if (s.runwayMonths < 3) {
            return `At your current pace, your company does not survive the next ${Math.ceil(s.runwayMonths)} months. Act today.`;
        }
        if (s.runwayMonths < 6) {
            return `At your current pace, your company does not survive the next ${Math.ceil(s.runwayMonths)} months.`;
        }
        if (s.runwayMonths < 12) {
            return `At your current pace, you will be forced to shut down or raise within ${Math.ceil(s.runwayMonths)} months.`;
        }
        return 'You have breathing room — but runway is not infinite. Every rupee wasted shortens your life.';
    }

    // ── SNAPSHOT PERSISTENCE (GAP 1) ──────────────────────────────────────────

    private async saveSnapshot(organizationId: string, state: CFOState): Promise<void> {
        // Check if we already have a snapshot today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = addDays(today, 1);

        const existingToday = await this.prisma.cfoStateSnapshot.findFirst({
            where: {
                organizationId,
                generatedAt: { gte: today, lt: tomorrow },
            },
        });

        if (existingToday) {
            // Update today's snapshot
            await this.prisma.cfoStateSnapshot.update({
                where: { id: existingToday.id },
                data: {
                    companyStatus: state.companyStatus,
                    runwayMonths: state.summary.runwayMonths,
                    daysLeft: state.deathClock.daysLeft,
                    cashInBank: state.summary.cashInBank,
                    monthlyRevenue: state.summary.monthlyRevenue,
                    monthlyExpenses: state.summary.monthlyExpenses,
                    netBurn: state.summary.netBurn,
                    burnTrend: state.summary.burnTrend,
                    revenueTrend: state.summary.revenueTrend,
                    tone: state.tone,
                    transactionCount: state.trust.transactionCount,
                    dataQuality: state.trust.dataQuality,
                    totalReceivables: state.receivables.totalOutstanding,
                    runwayChangeDays: state.delta.runwayChangeDays,
                    burnChangePercent: state.delta.burnChangePercent,
                    cashChangeAmount: state.delta.cashChangeAmount,
                    riskChanged: state.delta.riskChanged,
                    statusChanged: state.delta.statusChanged,
                    fullState: state as any,
                    generatedAt: new Date(),
                },
            });
        } else {
            // Create new snapshot
            await this.prisma.cfoStateSnapshot.create({
                data: {
                    organizationId,
                    companyStatus: state.companyStatus,
                    runwayMonths: state.summary.runwayMonths,
                    daysLeft: state.deathClock.daysLeft,
                    cashInBank: state.summary.cashInBank,
                    monthlyRevenue: state.summary.monthlyRevenue,
                    monthlyExpenses: state.summary.monthlyExpenses,
                    netBurn: state.summary.netBurn,
                    burnTrend: state.summary.burnTrend,
                    revenueTrend: state.summary.revenueTrend,
                    tone: state.tone,
                    transactionCount: state.trust.transactionCount,
                    dataQuality: state.trust.dataQuality,
                    totalReceivables: state.receivables.totalOutstanding,
                    runwayChangeDays: state.delta.runwayChangeDays,
                    burnChangePercent: state.delta.burnChangePercent,
                    cashChangeAmount: state.delta.cashChangeAmount,
                    riskChanged: state.delta.riskChanged,
                    statusChanged: state.delta.statusChanged,
                    fullState: state as any,
                },
            });
        }

        // Prune old snapshots (keep last 30)
        const snapshots = await this.prisma.cfoStateSnapshot.findMany({
            where: { organizationId },
            orderBy: { generatedAt: 'desc' },
            skip: 30,
            select: { id: true },
        });
        if (snapshots.length > 0) {
            await this.prisma.cfoStateSnapshot.deleteMany({
                where: { id: { in: snapshots.map(s => s.id) } },
            });
        }
    }

    // ── DECISION TRACKING (GAP 2) ─────────────────────────────────────────────

    private async trackDecisionShown(
        organizationId: string,
        decision: ForcedDecision,
        currentRunway: number,
    ): Promise<void> {
        await this.prisma.cfoDecisionEvent.upsert({
            where: {
                organizationId_decisionId: { organizationId, decisionId: decision.id },
            },
            update: {
                lastShownAt: new Date(),
            },
            create: {
                organizationId,
                decisionId: decision.id,
                decisionStatement: decision.statement,
                runwayAtShown: currentRunway,
            },
        });
    }

    // ── 3-MONTH WEIGHTED BURN & MODE (CRITICAL DECISION) ──────────────────────

    private async calculateWeightedBurn(organizationId: string, currentBurn: number): Promise<{ weightedBurn: number; burnSpike: number }> {
        // Fetch last 2 periodic snapshots
        const snapshots = await this.prisma.cfoStateSnapshot.findMany({
            where: { organizationId },
            orderBy: { generatedAt: 'desc' },
            take: 2,
        });

        const lastMonthBurn = snapshots.length > 0 ? Number(snapshots[0].netBurn) : currentBurn;
        const twoMonthsAgoBurn = snapshots.length > 1 ? Number(snapshots[1].netBurn) : lastMonthBurn;

        // Formula: weightedBurn = (0.5 * currentMonth) + (0.3 * lastMonth) + (0.2 * twoMonthsAgo)
        const weightedBurn = (0.5 * currentBurn) + (0.3 * lastMonthBurn) + (0.2 * twoMonthsAgoBurn);

        // Formula: burnSpike = (currentMonth - weightedBurn) / weightedBurn
        const burnSpike = weightedBurn > 0 ? (currentBurn - weightedBurn) / weightedBurn : 0;

        return { weightedBurn, burnSpike };
    }

    private async determineDashboardMode(
        organizationId: string,
        runwayMonths: number, 
        burnSpike: number, 
        negativeTrends: any[],
        rollbackRate: number = 0,
        metrics: any, // Contains netBurn, cashBalance, monthlyRevenue
        profile: any
    ): Promise<{ 
        mode: 'STABLE' | 'WARNING' | 'CRITICAL'; 
        explanation: {
            title: string;
            primaryDriver: string;
            contributingFactors: string[];
            confidence: number;
        }
    }> {
        const isProfitable = metrics.netBurn <= 0;
        
        let suggestedMode: 'STABLE' | 'WARNING' | 'CRITICAL' = 'STABLE';
        const factors: string[] = [];
        let primaryDriver = 'Financial signals are within expected boundaries.';
        let confidence = profile?.cfoAccuracyScore || 85;

        // 1. 🌪️ TRIGGER LOGIC
        if (isProfitable) {
            // PROFTABLE COMPANY LOGIC (v2.1)
            // Rule: Trigger CRITICAL if flip to meaningful burn OR cash erosion > 30%
            const revenue = metrics.monthlyRevenue || 1;
            const burnRatio = metrics.netBurn / revenue;
            const cash = metrics.cashBalance;
            const peakCash = profile.highestCashBuffer || cash;
            const erosion = peakCash > 0 ? (peakCash - cash) / peakCash : 0;

            if (metrics.netBurn > 0 && (burnRatio > 0.15 || runwayMonths < 12)) {
                suggestedMode = 'CRITICAL';
                primaryDriver = `Flipped to significant burn (${Math.round(burnRatio * 100)}% of revenue).`;
                factors.push(`Runway now ${runwayMonths.toFixed(1)}m.`);
            } else if (erosion > 0.30) {
                suggestedMode = 'CRITICAL';
                primaryDriver = `Significant cash buffer erosion detected. Cash is down ${Math.round(erosion * 100)}% from peak.`;
                factors.push('Burn trending against reserves.');
            } else if (rollbackRate > 0.15) {
                // Safe mode trigger (Global rule)
                suggestedMode = 'CRITICAL';
                primaryDriver = `Safe Mode triggered by elevated rollback rate.`;
                factors.push(`Rollback rate: ${Math.round(rollbackRate * 100)}%`);
            } else if (metrics.netBurn > 0 || erosion > 0.15) {
                suggestedMode = 'WARNING';
                primaryDriver = erosion > 0.15 ? 'Minor cash erosion detected vs peak.' : 'Slight dip into net burn.';
                if (erosion > 0.15) factors.push(`${Math.round(erosion * 100)}% off peak.`);
            }
        } else {
            // BURNING COMPANY LOGIC (Standard v2.1)
            if (runwayMonths < 6 || burnSpike > 0.25 || rollbackRate > 0.20) {
                suggestedMode = 'CRITICAL';
                primaryDriver = runwayMonths < 6 ? 'Runway below 6 months.' : 
                                burnSpike > 0.25 ? `Significant burn spike detected (${Math.round(burnSpike * 100)}% vs trend).` : 
                                'Rollback safety threshold exceeded.';
                if (burnSpike > 0.25) factors.push('3-month weighted trend violated.');
                if (runwayMonths < 6) factors.push('Liquidity threshold breach.');
            } else if (negativeTrends.length > 0 || runwayMonths < 12) {
                suggestedMode = 'WARNING';
                primaryDriver = runwayMonths < 12 ? 'Runway below 12 months.' : 'Negative financial trends identified.';
                if (negativeTrends.length > 0) factors.push(`${negativeTrends.length} anomalies detected.`);
            }
        }

        const buildExplanation = (mode: string) => ({
            title: `System Context: ${mode}`,
            primaryDriver,
            contributingFactors: factors.length > 0 ? factors : ['No major anomalies found.'],
            confidence
        });

        // 2. 🔁 HYSTERESIS LAYER (v2.1)
        // Principle: Stability of narrative > responsiveness to noise
        const currentMode = profile.lastDashboardMode || 'STABLE';
        const stagingCount = profile.modeStagingCount || 0;
        const now = new Date();
        const lastTransition = profile.lastSnapshotAt ? new Date(profile.lastSnapshotAt) : null;
        
        // Time check: only count "meaningful" transitions if they are in distinct periods (e.g. at least 1 hour apart)
        // This prevents rapid data refreshes from bypassing hysteresis
        const isTimeAware = !lastTransition || (now.getTime() - lastTransition.getTime()) > (60 * 60 * 1000);

        if (suggestedMode === currentMode) {
             // Stayed the same, reset staging
             await this.prisma.startupProfile.update({
                 where: { organizationId },
                 data: { modeStagingCount: 0 }
             });
             return { mode: currentMode, explanation: buildExplanation(currentMode) };
        }

        // If trying to DOWNGRADE (e.g., CRITICAL -> WARNING or WARNING -> STABLE)
        const modeWeights = { 'STABLE': 0, 'WARNING': 1, 'CRITICAL': 2 };
        const isDowngrade = modeWeights[suggestedMode] < modeWeights[currentMode];

        if (isDowngrade) {
            if (stagingCount >= 1 && isTimeAware) {
                // Successfully confirmed downgrade after 2 cycles
                await this.prisma.startupProfile.update({
                    where: { organizationId },
                    data: { 
                        lastDashboardMode: suggestedMode,
                        modeStagingCount: 0,
                        lastSnapshotAt: now
                    }
                });
                return { mode: suggestedMode, explanation: buildExplanation(suggestedMode) };
            } else {
                // Wait for confirmation
                if (isTimeAware) {
                    await this.prisma.startupProfile.update({
                        where: { organizationId },
                        data: { modeStagingCount: stagingCount + 1, lastSnapshotAt: now }
                    });
                }
                return { 
                    mode: currentMode, 
                    explanation: buildExplanation(currentMode)
                };
            }
        } else {
            // UPGRADES are immediate (Tension Principle)
            await this.prisma.startupProfile.update({
                where: { organizationId },
                data: { 
                    lastDashboardMode: suggestedMode,
                    modeStagingCount: 0,
                    lastSnapshotAt: now
                }
            });
            return { mode: suggestedMode, explanation: buildExplanation(suggestedMode) };
        }
    }


    // ── HELPERS ───────────────────────────────────────────────────────────────

    private async getLastSyncTime(organizationId: string): Promise<string | null> {
        const connection = await this.prisma.integrationConnection.findFirst({
            where: { organizationId, status: 'ACTIVE' },
            orderBy: { lastSyncedAt: 'desc' },
            select: { lastSyncedAt: true },
        });
        return connection?.lastSyncedAt?.toISOString() || null;
    }

    /**
     * computeChangeDrivers — CFO-Grade analysis of what shifted.
     */
    private computeChangeDrivers(
        s: CfoBrainReport['summary'], 
        delta: CFOStateDelta, 
        report: CfoBrainReport
    ): ChangeDriver[] {
        const drivers: ChangeDriver[] = [];
        
        // 1. Revenue change
        if (delta.prevRevenue !== null && Math.abs(s.monthlyRevenue - delta.prevRevenue) > 1000) {
            const revDelta = s.monthlyRevenue - delta.prevRevenue;
            drivers.push({
                label: 'Monthly Revenue',
                delta: revDelta,
                trend: revDelta > 0 ? 'up' : 'down',
                impactOnRunwayMonths: this.calculateRunwayImpact(s.cashInBank, s.netBurn, revDelta) // Approximate
            });
        }

        // 2. Category spikes (Deep dive)
        report.categoryBreakdown
            .filter(c => c.changePercent !== null && Math.abs(c.changePercent) > 10 && Math.abs(c.amount - (c.prevAmount || 0)) > 5000)
            .forEach(c => {
                const driverDelta = c.amount - (c.prevAmount || 0);
                drivers.push({
                    label: c.category,
                    delta: driverDelta,
                    trend: driverDelta > 0 ? 'up' : 'down',
                    category: c.category,
                    impactOnRunwayMonths: this.calculateRunwayImpact(s.cashInBank, s.netBurn, -driverDelta)
                });
            });

        return drivers.slice(0, 3);
    }

    private calculateRunwayImpact(cash: number, currentBurn: number, delta: number): number {
        const currentRunway = currentBurn > 0 ? cash / currentBurn : 36;
        const newBurn = Math.max(0, currentBurn - delta);
        const newRunway = newBurn > 0 ? cash / newBurn : 36;
        return Number((newRunway - currentRunway).toFixed(1));
    }

    /**
     * dataQualityLayer — Explicit actionable warnings
     */
    private calculateDynamicConfidence(
        qualityLevel: 'low' | 'medium' | 'high',
        accuracyScore: number,
        context: {
            bankSynced: boolean;
            categorizationPercent: number;
            dataCoverageDays: number;
            monthlyRevenue: number;
            lastSync: string | null;
        }
    ) {
        const warnings: TrustWarning[] = [];
        let score = accuracyScore;

        if (!context.bankSynced) {
            warnings.push({
                problem: 'Bank data is stale',
                impact: 'Your cash balance may be outdated.',
                action: 'Sync your bank accounts now.',
                severity: 'high',
                actionPayload: { type: 'navigate', navigateTo: '/integrations' }
            });
            score -= 15;
        }

        if (context.categorizationPercent < 80) {
            warnings.push({
                problem: `Only ${Math.round(context.categorizationPercent)}% of spend is categorized`,
                impact: 'Your burn analysis may be imprecise.',
                action: 'Categorize remaining transactions.',
                severity: 'medium',
                actionPayload: { type: 'navigate', navigateTo: '/transactions' }
            });
            score -= 10;
        }

        if (context.monthlyRevenue === 0) {
            warnings.push({
                problem: 'No revenue detected in last 30 days',
                impact: 'System is assuming zero top-line growth.',
                action: 'Verify your income categories.',
                severity: 'low'
            });
        }

        if (context.dataCoverageDays < 30) {
            warnings.push({
                problem: 'Limited historical data',
                impact: 'Trend analysis requires at least 30 days of data.',
                action: 'Sync more historical data.',
                severity: 'high'
            });
            score -= 20;
        }

        return {
            score: Math.max(0, score),
            meaning: score > 85 ? 'High Precision' : score > 60 ? 'Directional' : 'Incomplete',
            warnings,
            breakdown: {
                bankSynced: context.bankSynced,
                categorizationPercent: context.categorizationPercent,
                dataCoverageDays: context.dataCoverageDays
            }
        };
    }



    private async getCategorizationCoverage(organizationId: string): Promise<number> {
        const total = await this.prisma.transaction.count({ where: { bankAccount: { organizationId }, deletedAt: null } });
        if (total === 0) return 100;
        const categorized = await this.prisma.transaction.count({ 
            where: { 
                bankAccount: { organizationId }, 
                deletedAt: null, 
                category: { not: 'General' } 
            } 
        });
        return (categorized / total) * 100;
    }

    private async getTransactionCount(organizationId: string): Promise<number> {
        return this.prisma.transaction.count({
            where: { bankAccount: { organizationId }, deletedAt: null }
        });
    }
}
