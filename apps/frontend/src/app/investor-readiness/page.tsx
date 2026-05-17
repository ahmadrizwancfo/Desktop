'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Target,
    Download,
    FileText,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Flame,
    PiggyBank,
    BarChart3,
    Clock,
    ChevronRight,
    Sparkles,
    RefreshCw,
    Users,
    Building2,
    Loader2,
    ExternalLink,
    Cloud,
    XCircle,
    Link2,
    Lock,
    Shield,
    TrendingDown,
    Calendar,
    AlertCircle,
    Settings,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { useCompanyProfileStore, getGoalLabel, getBlockerLabel, PrimaryGoal, BusinessModel } from '@/store/company-profile-store';
import { InvestorReportModal } from '@/components/dashboard/investor-report-modal';
import { useCFOState, formatCurrency } from '@/store/cfo-state-store';

// DYNAMIC BLOCKERS derived from CFOState — no hardcoded financial data
function getBlockersFromCFOState(cfoState: any, goal: PrimaryGoal): {id: string; label: string; status: 'critical' | 'warning' | 'medium'; detail: string; fixable: boolean}[] {
    if (!cfoState) return [];
    const blockers: {id: string; label: string; status: 'critical' | 'warning' | 'medium'; detail: string; fixable: boolean}[] = [];
    const { summary, deathClock, receivables, primaryRisk } = cfoState;

    // Runway check
    if (deathClock.daysLeft !== null && deathClock.daysLeft < 180) {
        blockers.push({ id: 'runway', label: `Runway < 6 months`, status: 'critical', detail: `${deathClock.daysLeft} days left`, fixable: true });
    }
    // Burn trend
    if (summary.burnTrend === 'increasing') {
        blockers.push({ id: 'burn', label: 'Burn rate increasing', status: 'warning', detail: `Monthly burn: ${formatCurrency(summary.netBurn)}`, fixable: true });
    }
    // Revenue vs expenses
    if (summary.netBurn > 0 && goal === 'profitability') {
        blockers.push({ id: 'profitability', label: 'Not yet profitable', status: 'critical', detail: `Net burn: ${formatCurrency(summary.netBurn)}/mo`, fixable: true });
    }
    // Receivables risk
    if (receivables.totalOutstanding > summary.monthlyRevenue * 2) {
        blockers.push({ id: 'receivables', label: 'High outstanding receivables', status: 'warning', detail: `${formatCurrency(receivables.totalOutstanding)} outstanding`, fixable: true });
    }
    // Primary risk from CFOState
    if (primaryRisk.type !== 'none' && primaryRisk.severity === 'high') {
        blockers.push({ id: primaryRisk.type, label: primaryRisk.message, status: 'critical', detail: `Severity: ${primaryRisk.severity}`, fixable: false });
    }
    return blockers;
}

// Compute readiness score from CFOState
function computeReadiness(cfoState: any) {
    if (!cfoState) return null;
    const { summary, deathClock, receivables } = cfoState;
    let score = 0;
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Runway score (max 30)
    if (deathClock.daysLeft !== null) {
        const runwayMonths = deathClock.daysLeft / 30;
        if (runwayMonths >= 18) { score += 30; strengths.push(`Strong runway at ${runwayMonths.toFixed(1)} months`); }
        else if (runwayMonths >= 12) { score += 20; strengths.push(`Decent runway at ${runwayMonths.toFixed(1)} months`); }
        else if (runwayMonths >= 6) { score += 10; recommendations.push('Extend runway to 12+ months before fundraising'); }
        else { recommendations.push('Critical: Runway too short for fundraising'); }
    }

    // Burn efficiency (max 25)
    if (summary.monthlyRevenue > 0 && summary.netBurn > 0) {
        const burnMultiple = summary.netBurn / summary.monthlyRevenue;
        if (burnMultiple < 2) { score += 25; strengths.push(`Efficient burn multiple at ${burnMultiple.toFixed(1)}x`); }
        else if (burnMultiple < 3) { score += 15; }
        else { score += 5; recommendations.push('Reduce burn multiple below 2x'); }
    } else if (summary.netBurn <= 0) {
        score += 25; strengths.push('Cash flow positive');
    }

    // Revenue trend (max 25)
    if (summary.revenueTrend === 'growing') { score += 25; strengths.push('Revenue is growing'); }
    else if (summary.revenueTrend === 'stable') { score += 15; }
    else if (summary.revenueTrend === 'declining') { score += 5; recommendations.push('Address declining revenue before raising'); }

    // Burn stability (max 20)
    if (summary.burnTrend === 'decreasing') { score += 20; strengths.push('Burn rate is decreasing'); }
    else if (summary.burnTrend === 'stable') { score += 15; }
    else if (summary.burnTrend === 'increasing') { score += 5; recommendations.push('Stabilize burn rate'); }
    else { score += 10; }

    return {
        score: Math.min(score, 100),
        isReady: score >= 70,
        strengths,
        recommendations,
        stage: 'seed', // Default stage
        timeToReadiness: { expected: 4.2, bestCase: 2.8, worstCase: 7.5 }, // Dummy values
        gaps: [], // Initial empty gaps
    };
}

const documentTemplates = [
    { type: 'pl_statement', title: 'Profit & Loss Statement', description: 'Monthly P&L for the last 12 months' },
    { type: 'cash_flow', title: 'Cash Flow Statement', description: 'Monthly cash flow analysis' },
    { type: 'balance_sheet', title: 'Balance Sheet', description: 'Current financial position' },
    { type: 'monthly_summary', title: 'Monthly Financial Summary', description: 'Key metrics and highlights' },
    { type: 'runway_forecast', title: 'Runway Forecast', description: '12-month cash runway projection' },
];

const mockMetrics = {
    netBurnRate: 0,
    monthlyRecurringRevenue: 0,
    currentCash: 0,
    runway: 0,
    burnMultiple: 0,
    revenueGrowthRate: 0,
    runwayQualityScore: 0,
    grossMargin: 0,
};

const mockReadiness = {
    score: 0,
    isReady: false,
    strengths: [],
    recommendations: [],
    stage: 'seed',
    timeToReadiness: { expected: 0, bestCase: 0, worstCase: 0 },
    gaps: [],
};

const narrativeTones = [
    { id: 'founder', label: 'Founder View', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { id: 'investor', label: 'Investor View', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { id: 'board', label: 'Board View', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
];

// Context-aware benchmarks
const getBenchmarks = (goal: PrimaryGoal) => {
    switch (goal) {
        case 'raise_capital':
            return {
                'Burn Multiple': 'VC Target: < 2x',
                'Growth Rate': 'VC Target: > 15% MoM',
                'Gross Margin': 'SaaS Target: > 70%',
                'Runway': 'Raise at 12+ months',
            };
        case 'profitability':
            return {
                'Burn Multiple': 'Target: 0x (Breakeven)',
                'Growth Rate': 'Sustainable: > 5% MoM',
                'Gross Margin': 'Target: > 75%',
                'Runway': 'Target: Infinite',
            };
        case 'extend_runway':
            return {
                'Burn Multiple': 'Target: < 1x',
                'Growth Rate': 'Maintain',
                'Gross Margin': 'Maximize Cash',
                'Runway': 'Target: 24+ months',
            };
        default:
            return {};
    }
};

export default function InvestorReadinessPage() {
    const [selectedTone, setSelectedTone] = useState<'founder' | 'investor' | 'board'>('investor');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [investorModeEnabled, setInvestorModeEnabled] = useState(false);
    const [dataRoomLink, setDataRoomLink] = useState<string | null>(null);
    const [showGoalMenu, setShowGoalMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Goal-Based Context Store
    const { primaryGoal, businessModel, setProfile } = useCompanyProfileStore();

    // CFOState — single source of truth
    const { data: cfoState, isLoading: cfoLoading } = useCFOState();

    // Derive everything from CFOState
    const activeBlockers = getBlockersFromCFOState(cfoState, primaryGoal);
    const benchmarks = getBenchmarks(primaryGoal);
    const goalLabel = getGoalLabel(primaryGoal);
    const blockerLabel = getBlockerLabel(primaryGoal);
    const readiness = cfoState ? computeReadiness(cfoState) : null;

    // Derive metrics from CFOState
    const metrics = cfoState ? {
        netBurnRate: cfoState.summary.netBurn,
        monthlyRecurringRevenue: cfoState.summary.monthlyRevenue,
        currentCash: cfoState.summary.cashInBank,
        runway: cfoState.summary.runwayMonths,
        burnMultiple: cfoState.summary.monthlyRevenue > 0 ? cfoState.summary.netBurn / cfoState.summary.monthlyRevenue : 0,
        revenueGrowthRate: cfoState.summary.revenueTrend === 'growing' ? 15 : cfoState.summary.revenueTrend === 'stable' ? 0 : -5,
        runwayQualityScore: readiness?.score || 0,
        grossMargin: 65, // Default average SaaS margin
    } : null;
    const metricsLoading = cfoLoading;
    const readinessLoading = cfoLoading;

    // Derive narrative from CFOState
    const narrativeData = cfoState ? (() => {
        const s = cfoState.summary;
        const d = cfoState.deathClock;
        const runwayStr = d.daysLeft !== null ? `${(d.daysLeft / 30).toFixed(1)} months` : 'N/A';
        const narratives: Record<string, any> = {
            founder: {
                narrative: `Current MRR is ${formatCurrency(s.monthlyRevenue)} with ${runwayStr} of runway. Monthly burn is ${formatCurrency(s.netBurn)}. ${cfoState.narrative.summary}`,
                highlights: [
                    { label: 'Runway', value: runwayStr },
                    { label: 'Monthly Burn', value: formatCurrency(s.netBurn) },
                    { label: 'Cash', value: formatCurrency(s.cashInBank) },
                ],
                confidence: cfoState.trust.dataQuality,
                dataSource: cfoState.trust.summary,
            },
            investor: {
                narrative: `We are generating ${formatCurrency(s.monthlyRevenue)} in monthly revenue. With ${runwayStr} runway and ${formatCurrency(s.cashInBank)} cash in bank, the company is ${cfoState.companyStatus === 'stable' ? 'positioned for growth discussions' : 'focused on stabilization'}.`,
                highlights: [
                    { label: 'Revenue', value: formatCurrency(s.monthlyRevenue) },
                    { label: 'Cash Position', value: formatCurrency(s.cashInBank) },
                    { label: 'Runway', value: runwayStr },
                    { label: 'Burn', value: formatCurrency(s.netBurn) },
                ],
                confidence: cfoState.trust.dataQuality,
                dataSource: cfoState.trust.summary,
            },
            board: {
                narrative: `Cash: ${formatCurrency(s.cashInBank)} | Runway: ${runwayStr} | Revenue: ${formatCurrency(s.monthlyRevenue)} | Burn: ${formatCurrency(s.netBurn)}/mo | Status: ${cfoState.companyStatus.toUpperCase()}`,
                highlights: [
                    { label: 'Cash Position', value: formatCurrency(s.cashInBank) },
                    { label: 'Runway', value: runwayStr },
                    { label: 'Status', value: cfoState.companyStatus.toUpperCase() },
                ],
                confidence: cfoState.trust.dataQuality,
                dataSource: cfoState.trust.summary,
            },
        };
        return narratives[selectedTone];
    })() : null;
    const narrativeLoading = cfoLoading;
    const refetchNarrative = () => {};

    const toggleDoc = (docType: string) => {
        if (investorModeEnabled) return; // Prevent changes in investor mode
        setSelectedDocs(prev =>
            prev.includes(docType)
                ? prev.filter(d => d !== docType)
                : [...prev, docType]
        );
    };

    const handleDownloadDataRoom = () => {
        alert(`Downloading ${selectedDocs.length || 'all'} documents...`);
    };

    const handleEnableInvestorMode = () => {
        setInvestorModeEnabled(true);
        // Generate a mock shareable link
        setDataRoomLink(`https://foundercfo.app/dataroom/${Date.now().toString(36)}`);
        setSelectedDocs(documentTemplates.map(d => d.type)); // Select all docs
    };

    const handleDisableInvestorMode = () => {
        setInvestorModeEnabled(false);
        setDataRoomLink(null);
    };

    const isLoading = metricsLoading || readinessLoading;

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const m = metrics || mockMetrics;
    const r = readiness || mockReadiness;

    const goalOptions: { id: PrimaryGoal; label: string; icon: any }[] = [
        { id: 'raise_capital', label: 'Raise Capital', icon: TrendingUp },
        { id: 'profitability', label: 'Reach Profitability', icon: PiggyBank },
        { id: 'extend_runway', label: 'Extend Runway', icon: Clock },
        { id: 'optimize_taxes', label: 'Optimize Taxes', icon: Shield },
    ];

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        {/* Dynamic Title based on Goal */}
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-white">{goalLabel}</h1>
                            <div className="relative">
                                <button
                                    onClick={() => setShowGoalMenu(!showGoalMenu)}
                                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <ChevronDown className="w-5 h-5 text-slate-500" />
                                </button>
                                <AnimatePresence>
                                    {showGoalMenu && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowGoalMenu(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 mt-2 w-56 glass-card rounded-xl border border-white/10 overflow-hidden z-50"
                                            >
                                                <div className="p-2">
                                                    <p className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Primary Goal</p>
                                                    {goalOptions.map((goal) => (
                                                        <button
                                                            key={goal.id}
                                                            onClick={() => {
                                                                setProfile({ primaryGoal: goal.id });
                                                                setShowGoalMenu(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-sm font-medium",
                                                                primaryGoal === goal.id ? "bg-primary/20 text-primary" : "text-slate-300 hover:bg-white/5"
                                                            )}
                                                        >
                                                            <goal.icon className="w-4 h-4" />
                                                            {goal.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        <p className="text-slate-400 mt-1">
                            {primaryGoal === 'raise_capital' ? 'Know exactly where you stand for your next raise.' :
                                primaryGoal === 'profitability' ? 'Track your path to breakeven and sustainability.' :
                                    'Optimize cash flow and extend your runway.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate Investor Update
                        </button>
                        <span className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider",
                            r.stage === 'pre-seed' && "bg-slate-500/20 text-slate-400",
                            r.stage === 'seed' && "bg-amber-500/20 text-amber-400",
                            r.stage === 'series-a' && "bg-blue-500/20 text-blue-400",
                            r.stage === 'series-b' && "bg-purple-500/20 text-purple-400",
                        )}>
                            {r.stage.replace('-', ' ')} Stage
                        </span>
                    </div>
                </header>

                {/* DYNAMIC BLOCKERS CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "glass-card rounded-3xl p-6 border-2",
                        primaryGoal === 'profitability' ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent" :
                            "border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent"
                    )}
                >
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-3 rounded-2xl",
                                primaryGoal === 'profitability' ? "bg-emerald-500/20" : "bg-rose-500/20"
                            )}>
                                {primaryGoal === 'profitability' ? (
                                    <Target className="w-6 h-6 text-emerald-400" />
                                ) : (
                                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{blockerLabel}</h3>
                                <p className="text-xs text-slate-500">
                                    {primaryGoal === 'profitability' ? 'Hurdles to sustainability' : 'Critical issues to address'}
                                </p>
                            </div>
                        </div>
                        {/* Time to Goal Forecast - DYNAMIC LABEL */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                                    {primaryGoal === 'raise_capital' ? 'Time to Readiness' :
                                        primaryGoal === 'profitability' ? 'Time to Breakeven' :
                                            'Projected Runway'}
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">{r.timeToReadiness?.expected || 4.2}</span>
                                    <span className="text-sm text-slate-400">months (expected)</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px]">
                                    <span className="text-emerald-400">Best: {r.timeToReadiness?.bestCase || 2.8}mo</span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-amber-400">Worst: {r.timeToReadiness?.worstCase || 7.5}mo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {activeBlockers.map((blocker: any) => (
                            <div
                                key={blocker.id}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border",
                                    blocker.status === 'critical' && "bg-rose-500/10 border-rose-500/30",
                                    blocker.status === 'warning' && "bg-amber-500/10 border-amber-500/30",
                                    blocker.status === 'medium' && "bg-white/5 border-white/10",
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {blocker.status === 'critical' ? (
                                        <XCircle className="w-5 h-5 text-rose-400" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                    )}
                                    <div>
                                        <p className={cn(
                                            "font-bold text-sm",
                                            blocker.status === 'critical' ? "text-rose-400" : "text-amber-400"
                                        )}>{blocker.label}</p>
                                        <p className="text-xs text-slate-500">{blocker.detail}</p>
                                    </div>
                                </div>
                                {blocker.fixable && (
                                    <Link
                                        href="/simulator"
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                            blocker.status === 'critical'
                                                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                        )}
                                    >
                                        <Zap className="w-3 h-3" />
                                        Simulate Fix
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Focus on solving these to achieve {primaryGoal.replace('_', ' ')}
                        </p>
                        <Link
                            href="/simulator"
                            className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-all flex items-center gap-2"
                        >
                            Create Action Plan
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </motion.div>

                {/* Readiness Score */}
                {primaryGoal === 'raise_capital' && (
                    <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-primary"
                            style={{
                                clipPath: `polygon(0 0, ${r.score}% 0, ${r.score}% 100%, 0 100%)`
                            }}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Score Circle */}
                            <div className="flex flex-col items-center justify-center">
                                <div className="relative w-40 h-40">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="none"
                                            className="text-white/10"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="url(#gradient)"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * r.score) / 100}
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#f59e0b" />
                                                <stop offset="50%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-white">{r.score}%</span>
                                        <span className="text-xs text-slate-500 uppercase tracking-widest">Readiness</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 mt-4 text-center">
                                    {r.isReady
                                        ? `You're ready for ${r.stage === 'series-b' ? 'Series B+' : r.stage === 'series-a' ? 'Series B' : r.stage === 'seed' ? 'Series A' : 'Seed'} discussions!`
                                        : `Working towards ${r.stage === 'series-b' ? 'continued growth' : r.stage === 'series-a' ? 'Series B' : r.stage === 'seed' ? 'Series A' : 'Seed'} readiness`
                                    }
                                </p>
                            </div>

                            {/* Strengths */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Strengths
                                </h3>
                                <div className="space-y-2">
                                    {r.strengths?.map((strength: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span className="text-sm text-emerald-400">{strength}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Gaps */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Target className="w-4 h-4 text-amber-500" />
                                    Areas to Improve
                                </h3>
                                <div className="space-y-2">
                                    {r.gaps?.map((gap: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-amber-400">{gap.metric}</span>
                                                <span className="text-xs text-slate-500">
                                                    {typeof gap.current === 'number' && gap.current > 1000
                                                        ? `₹${(gap.current / 100000).toFixed(1)}L`
                                                        : gap.current} → {typeof gap.required === 'number' && gap.required > 1000
                                                            ? `₹${(gap.required / 100000).toFixed(1)}L`
                                                            : gap.required}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">{gap.gap}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Key Metrics Grid - WITH CONTEXTUAL BENCHMARKS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        {
                            label: 'Burn Multiple',
                            value: `${m.burnMultiple}x`,
                            icon: Flame,
                            color: m.burnMultiple <= 2 ? 'emerald' : m.burnMultiple <= 3 ? 'amber' : 'rose',
                            desc: m.burnMultiple <= 2 ? 'Efficient' : m.burnMultiple <= 3 ? 'Acceptable' : 'High',
                            benchmark: benchmarks['Burn Multiple'],
                        },
                        {
                            label: 'Growth Rate',
                            value: `${m.revenueGrowthRate}%`,
                            icon: TrendingUp,
                            color: m.revenueGrowthRate >= 15 ? 'emerald' : m.revenueGrowthRate >= 10 ? 'amber' : 'rose',
                            desc: 'Month-over-Month',
                            benchmark: benchmarks['Growth Rate'],
                        },
                        {
                            label: 'Gross Margin',
                            value: `${m.grossMargin}%`,
                            icon: PiggyBank,
                            color: m.grossMargin >= 60 ? 'emerald' : m.grossMargin >= 40 ? 'amber' : 'rose',
                            desc: m.grossMargin >= 60 ? 'Healthy' : 'Needs Work',
                            benchmark: benchmarks['Gross Margin'],
                        },
                        {
                            label: 'Runway',
                            value: `${m.runway} mo`,
                            icon: Clock,
                            color: m.runway >= 12 ? 'emerald' : m.runway >= 6 ? 'amber' : 'rose',
                            desc: m.runway >= 12 ? 'Comfortable' : 'Watch Closely',
                            benchmark: benchmarks['Runway'],
                        },
                    ].map((metric, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card rounded-2xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    metric.color === 'emerald' && "bg-emerald-500/20",
                                    metric.color === 'amber' && "bg-amber-500/20",
                                    metric.color === 'rose' && "bg-rose-500/20",
                                )}>
                                    <metric.icon className={cn(
                                        "w-5 h-5",
                                        metric.color === 'emerald' && "text-emerald-400",
                                        metric.color === 'amber' && "text-amber-400",
                                        metric.color === 'rose' && "text-rose-400",
                                    )} />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{metric.label}</p>
                            <p className="text-2xl font-black text-white mt-1">{metric.value}</p>
                            <p className={cn(
                                "text-xs mt-1",
                                metric.color === 'emerald' && "text-emerald-400",
                                metric.color === 'amber' && "text-amber-400",
                                metric.color === 'rose' && "text-rose-400",
                            )}>{metric.desc}</p>
                            {/* DYNAMIC Benchmark subtext */}
                            {metric.benchmark && (
                                <p className="text-[9px] text-slate-500 mt-2 italic">{metric.benchmark}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Multi-Tone Narrative - WITH CONFIDENCE INDICATOR */}
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    AI Narrative
                                </h3>
                                <button
                                    onClick={() => refetchNarrative()}
                                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Tone Selector */}
                        <div className="p-4 border-b border-white/5 flex gap-2">
                            {narrativeTones.map((tone) => (
                                <button
                                    key={tone.id}
                                    onClick={() => setSelectedTone(tone.id as any)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                        selectedTone === tone.id
                                            ? `${tone.bg} ${tone.color}`
                                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                                    )}
                                >
                                    <tone.icon className="w-4 h-4" />
                                    {tone.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {narrativeLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                                        {narrativeData?.narrative}
                                    </p>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        {narrativeData?.highlights?.map((h: any, i: number) => (
                                            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{h.label}</p>
                                                <p className="text-sm font-bold text-white mt-1">{h.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* NEW: Confidence Indicator */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <Shield className={cn(
                                            "w-4 h-4",
                                            narrativeData?.confidence === 'high' && "text-emerald-400",
                                            narrativeData?.confidence === 'medium' && "text-amber-400",
                                            narrativeData?.confidence === 'low' && "text-rose-400",
                                        )} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence:</span>
                                                <span className={cn(
                                                    "text-xs font-bold uppercase",
                                                    narrativeData?.confidence === 'high' && "text-emerald-400",
                                                    narrativeData?.confidence === 'medium' && "text-amber-400",
                                                    narrativeData?.confidence === 'low' && "text-rose-400",
                                                )}>
                                                    {narrativeData?.confidence || 'High'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-600 mt-0.5">
                                                Based on: {narrativeData?.dataSource || 'Last 3 months data'}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Data Room Generator - WITH INVESTOR MODE */}
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Data Room Generator
                                </h3>
                                <div className="flex items-center gap-2">
                                    {investorModeEnabled && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            Investor Mode
                                        </span>
                                    )}
                                    <button
                                        onClick={handleDownloadDataRoom}
                                        disabled={selectedDocs.length === 0}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all",
                                            selectedDocs.length > 0
                                                ? "bg-primary text-white hover:bg-indigo-600"
                                                : "bg-white/10 text-slate-500 cursor-not-allowed"
                                        )}
                                    >
                                        <Download className="w-3 h-3" />
                                        Download ({selectedDocs.length})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* NEW: Investor Mode Toggle */}
                        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Lock className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Prepare Investor Data Room</p>
                                        <p className="text-[10px] text-slate-500">Freeze numbers, add audit trail, generate shareable link</p>
                                    </div>
                                </div>
                                <button
                                    onClick={investorModeEnabled ? handleDisableInvestorMode : handleEnableInvestorMode}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        investorModeEnabled
                                            ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                            : "bg-primary text-white hover:bg-indigo-600"
                                    )}
                                >
                                    {investorModeEnabled ? 'Disable Investor Mode' : 'Enable Investor Mode'}
                                </button>
                            </div>

                            {/* Shareable Link */}
                            <AnimatePresence>
                                {investorModeEnabled && dataRoomLink && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 p-3 rounded-xl bg-white/5 border border-primary/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Link2 className="w-4 h-4 text-primary" />
                                                <span className="text-xs text-slate-400">Shareable Link (Read-Only):</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(dataRoomLink);
                                                    alert('Link copied!');
                                                }}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                        <p className="text-sm text-white font-mono mt-1 truncate">{dataRoomLink}</p>
                                        <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            Numbers frozen at {isMounted ? new Date().toLocaleDateString() : '...'} • Audit trail enabled
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className={cn(
                            "p-4 max-h-[300px] overflow-y-auto",
                            investorModeEnabled && "opacity-60 pointer-events-none"
                        )}>
                            <div className="grid grid-cols-2 gap-3">
                                {documentTemplates.map((doc) => (
                                    <button
                                        key={doc.type}
                                        onClick={() => toggleDoc(doc.type)}
                                        suppressHydrationWarning
                                        className={cn(
                                            "p-4 rounded-xl border text-left transition-all",
                                            selectedDocs.includes(doc.type)
                                                ? "bg-primary/20 border-primary/50"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <FileText className={cn(
                                                "w-5 h-5",
                                                selectedDocs.includes(doc.type) ? "text-primary" : "text-slate-500"
                                            )} />
                                            {selectedDocs.includes(doc.type) && (
                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-white">{doc.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">{doc.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5 space-y-3">
                            <button
                                onClick={() => setSelectedDocs(
                                    selectedDocs.length === documentTemplates.length
                                        ? []
                                        : documentTemplates.map(d => d.type)
                                )}
                                disabled={investorModeEnabled}
                                className={cn(
                                    "w-full py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white font-bold text-sm transition-all",
                                    investorModeEnabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                                )}
                            >
                                {selectedDocs.length === documentTemplates.length ? 'Deselect All' : 'Generate Full Data Room'}
                            </button>

                            {/* Integration Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        alert('Opening Google Drive authorization...');
                                    }}
                                    className="py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <Cloud className="w-4 h-4 text-blue-400" />
                                    Export to Google Drive
                                </button>
                                <button
                                    onClick={() => {
                                        alert('Opening Notion authorization...');
                                    }}
                                    className="py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4 text-slate-400" />
                                    Export to Notion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {r.recommendations && r.recommendations.length > 0 && (
                    <div className="glass-card rounded-3xl p-6">
                        <h3 className="font-bold text-white text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Recommended Actions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {r.recommendations.map((rec: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-lg bg-amber-500/20">
                                        <ChevronRight className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <p className="text-sm text-slate-300">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Investor Report Modal */}
            <InvestorReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
        </DashboardLayout>
    );
}
