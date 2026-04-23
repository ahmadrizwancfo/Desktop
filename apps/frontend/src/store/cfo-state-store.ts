import { create } from 'zustand';
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
    };
    currentRunway: number;
    decisionMemory?: any;
    ownershipNote?: string;
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
    behavioralAudit?: any;
    inertiaMetrics?: any;
    
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
            recoveryProgress: number;
        };
        categoryPerformances: Record<string, {
            score: number;
            isSuppressed: boolean;
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
    };
    insights: CfoBrainInsight[];
    tone: 'urgent' | 'cautious' | 'strategic';
    generatedAt: string;
    noData: boolean;
    isDemo: boolean;
    isInfiniteRunway: boolean;
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

interface CfoStateStore {
    state: CFOState | null;
    setStateData: (data: CFOState) => void;
    clear: () => void;
}

export const useCfoStateStore = create<CfoStateStore>((set) => ({
    state: null,
    setStateData: (data) => set({ state: data }),
    clear: () => set({ state: null }),
}));

// ── React Query Hook ──────────────────────────────────────────────────────────

export function useCFOState() {
    const user = useAuthStore((s) => s.user);
    const setStateData = useCfoStateStore((s) => s.setStateData);

    return useQuery<CFOState>({
        queryKey: ['cfo-state', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/cfo-engine/state');
            const data = res.data as CFOState;
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

export function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return 'never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
}
