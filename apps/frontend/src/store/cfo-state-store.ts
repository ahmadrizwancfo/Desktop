import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from './auth-store';

// ═══════════════════════════════════════════════════════════════════════════════
// CFO STATE STORE v2 — THE LIVING INTELLIGENCE ENGINE (FRONTEND)
//
// Every page reads from this. No page invents data. One truth.
// v2 adds: timeline (deltas), decision memory, priority stack,
//          daily cash flow, narrative voice.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanyStatus = 'stable' | 'at_risk' | 'critical';

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
    bestCase: DeathClockScenario;
    worstCase: DeathClockScenario;
    payrollSafe: boolean;
    payrollWarning: string | null;
}

export interface PrimaryRisk {
    type: 'burn' | 'revenue_drop' | 'liquidity' | 'concentration' | 'none';
    message: string;
    severity: 'high' | 'medium' | 'low';
}


export interface DecisionOption {
    label: string;
    impact: string;
    actionPayload: ActionPayload;
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
    gain: string;
    loss: string;
}

export interface ExecutionTask {
    task: string;
    completed: boolean;
    impact: string;
}

export interface Decision {
    id: string;
    decisionKey: string;
    type: 'mandate' | 'recommendation' | 'insight';
    priority: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    recommendationStrength: 'strong' | 'suggested' | 'optional';
    title: string;
    message: string;
    impact?: string;
    deadline?: string;
    tradeOffs: TradeOff;
    alternative: AlternativeAnalysis;
    rationale: string;
    startupStage: StartupStage;
    reversibility: 'high' | 'medium' | 'low';
    impactLine?: string;
    impactRunwayDays?: number;
    impactBurnMonthly?: number;
    executionPlan: ExecutionTask[];
    confidence: {
        score: number;
        label: 'Low' | 'Moderate' | 'High';
    };
    shownAt?: string;
    lastActionAt?: string;
    inactionFeeAccrued?: number;

    // v4.0 Execution Engine
    impactExplanation?: string; // "If done: Runway +0.4m"
    consequenceExplanation?: string; // "If ignored: Runway -0.8m in 10 days"
    statusV4?: 'pending' | 'in_progress' | 'done' | 'ignored';

    // v5.0 Strategic Layer
    consequenceBasis?: string;
    secondOrderEffects?: string[];
    oneThingReasoning?: string;
    investorNarrative?: string;
}

export interface DecisionAlert {
    id: string;
    title: string;
    message: string;
    type: 'data_quality' | 'system' | 'risk';
    severity: 'low' | 'medium' | 'high';
}

export interface DecisionOpportunity {
    id: string;
    title: string;
    message: string;
    impact: string;
    actionPayload?: ActionPayload;
    // v6.0 Investor Layer
    investorNarrative?: string; // "Optimization of burn to extend runway"
}

export interface DecisionOutput {
    summary: string;
    primaryDecisionId: string | null;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    decisions: Decision[];
    alerts: DecisionAlert[];
    opportunities: DecisionOpportunity[];
    confidenceAdjusted: boolean;
    dailyFocus: {
        fix: Decision | null;
        support: Decision | null;
        watch: any;
        oneThing: Decision | null; // v4.0
    };
    currentRunway: number;
    decisionMemory?: any;
    ownershipNote?: string;
    completionRate?: number; // v4.0 (0-100)

    // v5.0 Relief Layer
    stabilizationMessage?: string;

    // v6.0 Investor Layer
    investorTrustScore?: number;
    weeklyInvestorUpdate?: string;
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

export interface DailyCashFlowEntry {
    date: string;
    openingBalance: number;
    inflow: number;
    outflow: number;
    closingBalance: number;
    flags: ('payroll_day' | 'rent_due' | 'crunch' | 'danger')[];
}

export interface CashForecast {
    next30Days: number[];
    next90Days: number[];
    dailyFlow: DailyCashFlowEntry[];
    crunchDate: string | null;
    dangerDate: string | null;
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
    dataSource: string;
    summary: string;
    confidenceExplanation?: string;
    confidenceLevel?: 'low' | 'medium' | 'high';
    confidenceMetadata?: {
        runway?: 'low' | 'medium' | 'high';
        burn?: 'low' | 'medium' | 'high';
        revenue?: 'low' | 'medium' | 'high';
    };
}

export interface CategoryImpact {
    category: string;
    amount: number;
    pct: number;
    trend: 'up' | 'down' | 'stable' | 'new';
    changePercent: number | null;
    runwayImpactDays: number;
    cutPotential: number;
    runwayImpact: string | null;
}

// ── GAP 1: Delta ──────────────────────────────────────────────────────────────

export interface CFOStateDelta {
    runwayChangeDays: number | null;
    burnChangePercent: number | null;
    cashChangeAmount: number | null;
    riskChanged: boolean;
    statusChanged: boolean;
    summaryLine: string | null;
    burnStreakWeeks: number;
    periodLabel: string;
    prevRunwayMonths: number | null;
    prevNetBurn: number | null;
    prevRevenue: number | null;
}

// ── GAP 2: Decision Memory ────────────────────────────────────────────────────

export interface DecisionMemory {
    pendingDecisions: number;
    ignoredForDays: number | null;
    lastActedDecision: string | null;
    lastOutcome: string | null;
    nudge: string | null;
}

// ── GAP 5: Priority Stack ─────────────────────────────────────────────────────

export interface PriorityItem {
    issue: string;
    impactOnRunwayDays: number;
    urgency: 'now' | 'soon' | 'later';
    actionable: boolean;
    actionPayload?: ActionPayload;
}

// ── GAP 7: Narrative ──────────────────────────────────────────────────────────

export interface Narrative {
    headline: string;
    summary: string;
    tone: 'urgent' | 'cautious' | 'confident';
}

// ── Brain Insights ────────────────────────────────────────────────────────────

export interface CfoBrainInsight {
    type: 'DIAGNOSTIC' | 'RISK' | 'ACTION';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    body: string;
    metric?: string;
    category?: string;
    confidence: number;
    source: string;
}

export interface CriticalAlert {
    id: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    isBlocking?: boolean;
    actionPayload?: ActionPayload;
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

export type BehavioralRiskProfile = 'PROACTIVE' | 'REACTIONARY' | 'CHAOTIC' | 'NEW_USER';

export interface BehavioralMetrics {
    behaviorScore: number;
    insightAccuracy: number;
    activePenalty: number;
    inactionPenaltiesTotal: number;
    riskProfile: BehavioralRiskProfile;
    patterns: any[];
    probationDaysLeft?: number;
    isProbationary?: boolean;
    complianceScore?: number;
    escalationLevel?: number;
    teamStability?: {
        headcount: number;
        turnoverRate: number;
        velocityScore: number;
    };
    featureVelocity?: number;
    velocityPeriod?: number;
    runwayDelta?: number;
    isWartime?: boolean;
}

export interface UncategorizedOutflow {
    id: string;
    amount: number;
    description: string;
    date: string;
    suggestedCategory?: string;
    confidence?: string;
    reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE CFO STATE v2
// ═══════════════════════════════════════════════════════════════════════════════
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

export interface CFOState {
    companyStatus: CompanyStatus;
    dashboardMode: 'STABLE' | 'WARNING' | 'CRITICAL';
    isFirstTimeUser?: boolean;
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
        timestamp: string;
        explanation: {
            primaryDriver: string;
            contributingFactors: string[];
            impact?: { runwayBefore: number, runwayAfter: number };
        };
    }>;
    deathClock: DeathClock;
    decisionEngine: DecisionOutput;
    activeStrategy: {
        type: 'cost_cut' | 'fundraise' | 'growth_push';
        startedAt: string;
        expectedOutcome: string;
    } | null;
    cashForecast: CashForecast;
    receivables: Receivables;
    trust: TrustLayer;
    primaryRisk: PrimaryRisk;

    // v2 additions
    delta: CFOStateDelta;
    decisionMemory: DecisionMemory;
    priorityStack: PriorityItem[];
    narrative: Narrative;

    // Founder Pressure System
    criticalAlerts: CriticalAlert[];
    todaysActions: TodaysAction[];
    negativeTrends: NegativeTrend[];

    // Autonomous CFO
    autonomousRecommendations?: any;
    activeMandates?: any[];
    behavioralAudit?: BehavioralMetrics;
    inertiaMetrics?: any;
    suspenseAlert?: {
        amount: number;
        count: number;
        isCritical: boolean;
        message: string;
    };
    
    trustIntelligence?: {
        cfoAccuracyScore: number;
        accuracyBreakdown: {
            bankMatched: number;
            userVerified: number;
            estimated: number;
        };
        confidenceLevel: 'high' | 'medium' | 'low';
        confidenceMetadata: Record<string, 'high' | 'medium' | 'low'>;
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
            recoveryProgress: number;
        };
        categoryPerformances: Record<string, {
            score: number;
            isSuppressed: boolean;
        }>;
    };

    dynamicConfidence: {
        score: number;
        label: string;
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

    // Supplementary
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
        ghostLiabilities: number;
        isSustainable: boolean;
        burnTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
        revenueTrend: 'growing' | 'declining' | 'stable' | 'unknown';
        prevMonthlyRevenue: number;
        prevNetBurn: number;
        avgBurn30d?: number;
    };
    insights: CfoBrainInsight[];
    tone: 'urgent' | 'cautious' | 'strategic';
    generatedAt: string;
    noData: boolean;
    isDemo: boolean;
    isInfiniteRunway: boolean;
    uncategorizedOutflows: UncategorizedOutflow[];

    // v3.0 Retention Engine
    predictiveSignals?: {
        runwayBreachDate?: string;
        runwayBreachDays?: number;
        alertMessage: string;
        confidence: 'high' | 'medium' | 'low';
    };
    dailyBrief?: {
        headline: string;
        narrative: string;
        signal: string;
        attention: string;
        action: string;
        momentum: string;
    };
    weeklyBrief?: {
        weekStart: string;
        metricsJson: {
            improved: string;
            worsened: string;
            risk: string;
            priority: string;
            cashChange: number;
        };
    };

    // v4.0 Execution Engine
    founderPersona?: 'disciplined' | 'reactive' | 'chaotic' | 'scaling';
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

export interface CfoStateStore {
    state: CFOState | null;
    resolutionPath: 'mna' | 'service' | 'shutdown' | 'bridge' | null;
    isTaxBufferUnlocked: boolean;
    isInvestorMode: boolean;
    isSimpleMode: boolean;
    victoryEvent: { amount: number; points: number; title: string; type: 'MILESTONE' | 'MICRO' } | null;
    setStateData: (data: CFOState) => void;
    setResolutionPath: (path: 'mna' | 'service' | 'shutdown' | 'bridge' | null) => void;
    toggleTaxBuffer: () => void;
    setInvestorMode: (val: boolean) => void;
    setSimpleMode: (val: boolean) => void;
    triggerVictory: (amount: number, points: number, title: string, type?: 'MILESTONE' | 'MICRO') => void;
    clearVictory: () => void;
    clear: () => void;
}

export const useCfoStateStore = create<CfoStateStore>((set) => ({
    state: null,
    resolutionPath: null,
    isTaxBufferUnlocked: false,
    isInvestorMode: false,
    isSimpleMode: false,
    victoryEvent: null,
    setStateData: (data) => set({ state: data }),
    setInvestorMode: (val) => set({ isInvestorMode: val }),
    setSimpleMode: (val) => set({ isSimpleMode: val }),
    setResolutionPath: (path) => set({ resolutionPath: path }),
    toggleTaxBuffer: () => set((s) => ({ isTaxBufferUnlocked: !s.isTaxBufferUnlocked })),
    triggerVictory: (amount, points, title, type = 'MICRO') => {
        set({ victoryEvent: { amount, points, title, type } });
        setTimeout(() => set({ victoryEvent: null }), type === 'MILESTONE' ? 8000 : 4000);
    },
    clearVictory: () => set({ victoryEvent: null }),
    clear: () => set({ state: null, resolutionPath: null, isTaxBufferUnlocked: false, isSimpleMode: false, victoryEvent: null }),
}));

// ── React Query Hook ──────────────────────────────────────────────────────────

export function useCFOState() {
    const user = useAuthStore((s) => s.user);
    const setStateData = useCfoStateStore(s => s.setStateData);
    const triggerVictory = useCfoStateStore(s => s.triggerVictory);

    return useQuery<CFOState>({
        queryKey: ['cfo-state', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/cfo-engine/state');
            const data = res.data as CFOState;
            
            // Sync with zustand store
            setStateData(data);
            
            return data;
        },
        enabled: !!user?.organizationId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

// ── Decision Tracking API ─────────────────────────────────────────────────────

export async function trackDecisionClick(decisionId: string, optionChosen: string): Promise<void> {
    await apiClient.post('/cfo-engine/state/decision-click', { decisionId, optionChosen });
}

export async function trackDecisionActed(decisionId: string, currentRunway: number): Promise<void> {
    await apiClient.post('/cfo-engine/state/decision-acted', { decisionId, currentRunway });
}

export async function updateDecisionStatus(decisionId: string, status: 'pending' | 'in_progress' | 'done' | 'ignored'): Promise<void> {
    await apiClient.post(`/cfo-engine/state/decision-update-status/${decisionId}`, { status });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function encodeActionPayload(payload: ActionPayload): string {
    return encodeURIComponent(btoa(JSON.stringify(payload)));
}

export function decodeActionPayload(encoded: string): ActionPayload | null {
    try {
        return JSON.parse(atob(decodeURIComponent(encoded)));
    } catch {
        return null;
    }
}

export function formatCurrency(val: number): string {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.round(val)}`;
}

export function formatRunway(months: number): string {
    if (months > 36 || months <= 0) return 'Sustainable';
    if (months < 3) return `${Math.round(months * 30.4)} DAYS`;
    return `${months.toFixed(1)} months`;
}

export function isCrisisMode(state: CFOState): boolean {
    return state.summary.runwayMonths < 3 && state.summary.runwayMonths > 0;
}

export function isTerminalState(state: CFOState): boolean {
    const isBurning = state.summary.netBurn > 0;
    const runwayDays = state.summary.runwayMonths * 30.4;
    return isBurning && runwayDays < 45;
}

export function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return 'never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC SELECTORS — Subscribe to individual slices to prevent re-render hell
// ═══════════════════════════════════════════════════════════════════════════════

/** Cash in bank (number) */
export const useCashInBank = () => useCfoStateStore(s => s.state?.summary?.cashInBank ?? 0);

/** Runway in months (number) */
export const useRunway = () => useCfoStateStore(s => s.state?.summary?.runwayMonths ?? 0);

/** Is runway infinite (boolean) */
export const useIsInfiniteRunway = () => useCfoStateStore(s => s.state?.isInfiniteRunway ?? false);

/** Net burn rate (number) */
export const useBurnRate = () => useCfoStateStore(s => s.state?.summary?.netBurn ?? 0);

/** Monthly expenses (number) */
export const useMonthlyExpenses = () => useCfoStateStore(s => s.state?.summary?.monthlyExpenses ?? 0);

/** Monthly revenue (number) */
export const useMonthlyRevenue = () => useCfoStateStore(s => s.state?.summary?.monthlyRevenue ?? 0);

/** Company status: stable | at_risk | critical */
export const useCompanyStatus = () => useCfoStateStore(s => s.state?.companyStatus ?? 'stable');

/** Dashboard mode: STABLE | WARNING | CRITICAL */
export const useDashboardMode = () => useCfoStateStore(s => s.state?.dashboardMode ?? 'STABLE');

/** Dynamic confidence score (0-100) */
export const useConfidenceScore = () => useCfoStateStore(s => s.state?.dynamicConfidence?.score ?? 0);

/** Data quality indicator */
export const useDataQuality = () => useCfoStateStore(useShallow(s => ({
    quality: s.state?.trust?.dataQuality ?? 'low',
    indicator: s.state?.trust?.dataQualityIndicator ?? 'red',
    lastSynced: s.state?.trust?.lastSyncedAt ?? null,
    transactionCount: s.state?.trust?.transactionCount ?? 0,
    dataSource: s.state?.trust?.dataSource ?? 'none',
    confidenceScore: s.state?.dynamicConfidence?.score ?? 0,
})));

/** Primary decision (oneThing) */
export const usePrimaryDecision = () => useCfoStateStore(s => s.state?.decisionEngine?.dailyFocus?.oneThing ?? null);

/** Category breakdown */
export const useCategoryBreakdown = () => useCfoStateStore(s => s.state?.categoryBreakdown ?? []);

/** Death clock */
export const useDeathClock = () => useCfoStateStore(s => s.state?.deathClock ?? null);

/** Behavioral audit */
export const useBehavioralAudit = () => useCfoStateStore(s => s.state?.behavioralAudit ?? null);

/** Critical alerts */
export const useCriticalAlerts = () => useCfoStateStore(s => s.state?.criticalAlerts ?? []);

/** Is demo mode */
export const useIsDemo = () => useCfoStateStore(s => s.state?.isDemo ?? false);
