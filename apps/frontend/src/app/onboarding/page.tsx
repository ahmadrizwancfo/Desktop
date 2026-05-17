'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
    ArrowRight,
    Loader2,
    Clock,
    AlertTriangle,
    Zap,
    Shield,
    Users,
    Flame,
    Scissors,
    Target,
    ChevronRight,
    Banknote,
    TrendingUp,
    UserPlus,
    Link as LinkIcon,
    Upload,
    Skull,
    Brain,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANT CFO EXPERIENCE
//
// Value first. Data later.
// The user sees a meaningful financial output in under 30 seconds.
// No empty states. No "connect your bank" as the primary UI.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${Math.round(n)}`;
}

function fmtDays(d: number): string {
    if (d >= 365) return `${(d / 30.44).toFixed(0)} months`;
    return `${d} days`;
}

// ─── Synthetic CFO Engine (100% client-side, zero latency) ──────────────────

interface SyntheticInput {
    teamSize: number;
    monthlySpend: number;
    hasRevenue: boolean;
}

interface SyntheticRisk {
    id: string;
    message: string;
    severity: 'critical' | 'high' | 'medium';
}

interface SyntheticAction {
    id: string;
    title: string;
    description: string;
    impactDays: number;
}

interface SyntheticOutput {
    runwayLow: number;    // months
    runwayHigh: number;   // months
    estimatedBurn: number;
    assumedCash: number;
    biggestRisk: SyntheticRisk;
    allRisks: SyntheticRisk[];
    actions: SyntheticAction[];
    tone: 'urgent' | 'cautious' | 'strategic';
    headline: string;
    deathDateLow: string;
    deathDateHigh: string;
}

function generateSyntheticState(input: SyntheticInput): SyntheticOutput {
    const { teamSize, monthlySpend, hasRevenue } = input;

    // ── Assumptions ──────────────────────────────────────────────────────────
    // Typical early-stage cash: 6-12x monthly burn
    // Revenue companies: assume revenue = 30-50% of spend
    const cashMultiplierLow = hasRevenue ? 8 : 6;
    const cashMultiplierHigh = hasRevenue ? 14 : 12;
    const assumedCashLow = monthlySpend * cashMultiplierLow;
    const assumedCashHigh = monthlySpend * cashMultiplierHigh;
    const assumedCash = (assumedCashLow + assumedCashHigh) / 2;

    const estimatedRevenue = hasRevenue ? monthlySpend * 0.4 : 0;
    const netBurn = Math.max(0, monthlySpend - estimatedRevenue);

    // Runway calculation (range)
    const runwayLow = netBurn > 0 ? Math.round((assumedCashLow / netBurn) * 10) / 10 : 99;
    const runwayHigh = netBurn > 0 ? Math.round((assumedCashHigh / netBurn) * 10) / 10 : 99;

    // Cost per team member
    const costPerHead = monthlySpend / Math.max(1, teamSize);
    const isHighCostPerHead = costPerHead > 200000; // >₹2L/head is high
    const isLowCostPerHead = costPerHead < 50000;   // <₹50K/head could mean under-investing

    // Spend-to-team ratio analysis
    const typicalSpendPerHead = 100000; // ₹1L/head/month = ~normal
    const headcountBurnRatio = monthlySpend / (teamSize * typicalSpendPerHead);

    // ── Risk Generation ──────────────────────────────────────────────────────
    const risks: SyntheticRisk[] = [];

    // Runway risk
    if (runwayLow < 3) {
        risks.push({
            id: 'runway_critical',
            message: `At ${fmt(monthlySpend)}/mo spend, you'll likely run out of cash in ${runwayLow.toFixed(0)}–${runwayHigh.toFixed(0)} months.`,
            severity: 'critical',
        });
    } else if (runwayLow < 6) {
        risks.push({
            id: 'runway_short',
            message: `Your estimated runway is ${runwayLow.toFixed(0)}–${runwayHigh.toFixed(0)} months. Below the 6-month safe zone.`,
            severity: 'high',
        });
    }

    // Team vs burn risk
    if (teamSize > 5 && headcountBurnRatio > 1.5) {
        risks.push({
            id: 'overhiring',
            message: `You're spending ${fmt(costPerHead)}/person/month — that's high for a ${teamSize}-person team. You may be hiring faster than your burn supports.`,
            severity: 'high',
        });
    } else if (teamSize > 10 && !hasRevenue) {
        risks.push({
            id: 'team_no_revenue',
            message: `${teamSize} people with no revenue is a ticking clock. Every month without revenue costs ${fmt(monthlySpend)}.`,
            severity: 'critical',
        });
    }

    // No revenue risk
    if (!hasRevenue) {
        risks.push({
            id: 'no_revenue',
            message: 'You have no revenue buffer. Every rupee that leaves your bank is permanent until you start earning.',
            severity: runwayLow < 6 ? 'critical' : 'high',
        });
    }

    // High burn risk
    if (monthlySpend > 2000000) {
        risks.push({
            id: 'high_burn',
            message: `${fmt(monthlySpend)}/mo is a high burn rate. At this level, even small delays in revenue or fundraising become existential.`,
            severity: 'high',
        });
    }

    // If profitable range
    if (hasRevenue && runwayLow > 18) {
        risks.push({
            id: 'complacency',
            message: 'Your runway looks comfortable, but complacency kills more startups than cash crunch. Stay sharp.',
            severity: 'medium',
        });
    }

    // Ensure we always have at least one risk
    if (risks.length === 0) {
        risks.push({
            id: 'burn_monitoring',
            message: `Your burn is ${fmt(monthlySpend)}/mo — manageable, but monitor monthly. Most startups die from slow leaks, not explosions.`,
            severity: 'medium',
        });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // ── Action Generation ────────────────────────────────────────────────────
    const actions: SyntheticAction[] = [];

    // Action 1: Cut burn
    const cutPercent = runwayLow < 6 ? 30 : 15;
    const cutSavings = monthlySpend * (cutPercent / 100);
    const newBurnAfterCut = Math.max(0, netBurn - cutSavings);
    const newRunwayAfterCut = newBurnAfterCut > 0 ? assumedCash / newBurnAfterCut : 999;
    const runwayGainDays = Math.round((newRunwayAfterCut - ((runwayLow + runwayHigh) / 2)) * 30.44);

    if (netBurn > 0 && runwayGainDays > 5) {
        actions.push({
            id: 'cut_burn',
            title: `Reduce spend by ${cutPercent}%`,
            description: `Cutting ${fmt(cutSavings)}/mo from non-essential expenses`,
            impactDays: Math.min(runwayGainDays, 180),
        });
    }

    // Action 2: Delay hiring
    if (teamSize > 3) {
        const hireCost = costPerHead > 100000 ? costPerHead : 100000;
        const hireSavings = hireCost;
        const hireRunwayGain = netBurn > 0 ? Math.round((hireSavings / netBurn) * ((runwayLow + runwayHigh) / 2) * 30.44) : 30;
        actions.push({
            id: 'delay_hire',
            title: 'Delay next hire by 2 months',
            description: `Each hire costs ~${fmt(hireCost)}/mo in total loaded cost`,
            impactDays: Math.min(Math.max(hireRunwayGain, 15), 90),
        });
    }

    // Action 3: Revenue push (if no revenue)
    if (!hasRevenue && teamSize > 2) {
        const potentialRevenue = monthlySpend * 0.15;
        const revenueImpactDays = netBurn > 0 ? Math.round((potentialRevenue / netBurn) * ((runwayLow + runwayHigh) / 2) * 30.44) : 45;
        actions.push({
            id: 'get_revenue',
            title: 'Close first paying customer',
            description: `Even ${fmt(potentialRevenue)}/mo of revenue changes the math entirely`,
            impactDays: Math.min(Math.max(revenueImpactDays, 20), 120),
        });
    }

    // Action 4: Negotiate costs
    if (monthlySpend > 500000) {
        const negotiateSavings = monthlySpend * 0.08;
        const negotiateGain = netBurn > 0 ? Math.round((negotiateSavings / netBurn) * ((runwayLow + runwayHigh) / 2) * 30.44) : 20;
        actions.push({
            id: 'renegotiate',
            title: 'Renegotiate vendor contracts',
            description: `Typical 8% savings = ${fmt(negotiateSavings)}/mo freed up`,
            impactDays: Math.min(Math.max(negotiateGain, 10), 60),
        });
    }

    // Sort by impact, take top 3
    actions.sort((a, b) => b.impactDays - a.impactDays);
    const topActions = actions.slice(0, 3);

    // ── Tone ─────────────────────────────────────────────────────────────────
    let tone: SyntheticOutput['tone'] = 'strategic';
    if (runwayLow < 4) tone = 'urgent';
    else if (runwayLow < 9) tone = 'cautious';

    // ── Headline ─────────────────────────────────────────────────────────────
    let headline: string;
    if (tone === 'urgent') {
        headline = `You'll likely run out of cash in ${runwayLow.toFixed(0)}–${Math.min(runwayHigh, runwayLow + 3).toFixed(0)} months if nothing changes.`;
    } else if (tone === 'cautious') {
        headline = `You have roughly ${runwayLow.toFixed(0)}–${runwayHigh.toFixed(0)} months of runway. Time to be strategic.`;
    } else {
        if (runwayLow > 18) {
            headline = 'Your runway looks healthy. Use it to grow, not coast.';
        } else {
            headline = `Estimated ${runwayLow.toFixed(0)}–${runwayHigh.toFixed(0)} months of runway. You're in a good position.`;
        }
    }

    // ── Death dates ──────────────────────────────────────────────────────────
    const now = new Date();
    const deathLow = new Date(now.getTime() + runwayLow * 30.44 * 24 * 60 * 60 * 1000);
    const deathHigh = new Date(now.getTime() + runwayHigh * 30.44 * 24 * 60 * 60 * 1000);
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };

    return {
        runwayLow: Math.min(runwayLow, 99),
        runwayHigh: Math.min(runwayHigh, 99),
        estimatedBurn: netBurn,
        assumedCash,
        biggestRisk: risks[0],
        allRisks: risks,
        actions: topActions,
        tone,
        headline,
        deathDateLow: deathLow.toLocaleDateString('en-IN', dateOpts),
        deathDateHigh: deathHigh.toLocaleDateString('en-IN', dateOpts),
    };
}

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, format = 'raw' }: { value: number; format?: 'inr' | 'months' | 'raw' }) {
    const motionVal = useMotionValue(0);
    const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
    const [display, setDisplay] = useState('');

    useEffect(() => {
        motionVal.set(value);
    }, [value, motionVal]);

    useEffect(() => {
        const unsubscribe = spring.on('change', (v) => {
            if (format === 'inr') setDisplay(fmt(v));
            else if (format === 'months') setDisplay(`${Math.max(0, v).toFixed(1)}`);
            else setDisplay(Math.round(v).toString());
        });
        return unsubscribe;
    }, [spring, format]);

    return <span className="tabular-nums">{display}</span>;
}

// ─── Spend Slider (Custom) ───────────────────────────────────────────────────

const SPEND_STOPS = [
    50000, 75000, 100000, 150000, 200000, 300000, 400000, 500000,
    750000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000,
];

function SpendSlider({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    // Map value to closest stop index
    const idx = SPEND_STOPS.reduce((best, stop, i) =>
        Math.abs(stop - value) < Math.abs(SPEND_STOPS[best] - value) ? i : best, 0);
    const pct = (idx / (SPEND_STOPS.length - 1)) * 100;

    return (
        <div className="relative h-12 flex items-center">
            {/* Track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 via-amber-500/50 to-rose-500/50"
                    style={{ width: `${pct}%` }}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            </div>
            {/* Native range */}
            <input
                type="range"
                min={0}
                max={SPEND_STOPS.length - 1}
                step={1}
                value={idx}
                onChange={(e) => onChange(SPEND_STOPS[Number(e.target.value)])}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            {/* Thumb */}
            <motion.div
                className="absolute w-6 h-6 rounded-full bg-white border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)] pointer-events-none z-20"
                style={{ left: `calc(${pct}% - 12px)` }}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnboardingPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const setProfile = useStartupProfileStore((s) => s.setProfile);

    // ── Input state ──────────────────────────────────────────────────────────
    const [teamSize, setTeamSize] = useState(5);
    const [monthlySpend, setMonthlySpend] = useState(500000); // ₹5L default
    const [hasRevenue, setHasRevenue] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showOutput, setShowOutput] = useState(true); // Always show output

    // ── Computed CFO output (real-time, zero latency) ────────────────────────
    const output = useMemo(() => {
        return generateSyntheticState({ teamSize, monthlySpend, hasRevenue });
    }, [teamSize, monthlySpend, hasRevenue]);

    const isUrgent = output.tone === 'urgent';
    const isCautious = output.tone === 'cautious';

    // ── Profile save + navigate ──────────────────────────────────────────────
    const handleConnect = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const orgId = (user as any)?.organizationId;
            let resolvedOrgId = orgId;

            if (!resolvedOrgId) {
                try {
                    const orgRes = await apiClient.post('/organizations', {
                        name: `${user?.firstName || 'My'}'s Company`,
                        industry: 'Technology / SaaS',
                        country: 'IN',
                    });
                    resolvedOrgId = orgRes.data.id;
                    if (user?.id) {
                        await apiClient.post(`/organizations/${resolvedOrgId}/users/${user.id}`);
                    }
                } catch {
                    // Org might already exist, continue
                }
            }

            await apiClient.post('/startup-profile', {
                companyName: `${user?.firstName || 'My'}'s Company`,
                stage: teamSize <= 3 ? 'IDEA' : teamSize <= 10 ? 'SEED' : 'GROWTH',
                monthlyRevenue: hasRevenue ? Math.round(monthlySpend * 0.4) : 0,
                monthlyExpenses: monthlySpend,
                cashInBank: Math.round(output.assumedCash),
                teamSize,
                country: 'IN',
                industry: 'Technology / SaaS',
                primaryGoal: output.tone === 'urgent' ? 'SURVIVE' : hasRevenue ? 'SCALE' : 'RAISE',
                organizationId: resolvedOrgId,
            });

            // Trigger CFO engine in background
            apiClient.post('/cfo-engine/run').catch(() => {});
            router.push('/get-started');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
            setIsSubmitting(false);
        }
    };

    // ── Tone-based colors ────────────────────────────────────────────────────
    const toneColor = isUrgent ? 'rose' : isCautious ? 'amber' : 'emerald';
    const toneTextClass = `text-${toneColor}-400`;
    const toneBgClass = `bg-${toneColor}-500`;

    return (
        <div className="min-h-screen bg-[#020617] relative overflow-hidden">
            {/* Ambient background */}
            <div className={cn(
                "absolute top-[-15%] right-[-10%] w-[700px] h-[700px] blur-[180px] rounded-full opacity-20 pointer-events-none transition-all duration-1000",
                isUrgent ? "bg-rose-600" : isCautious ? "bg-amber-600" : "bg-emerald-600"
            )} />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* ═══ HEADER ═══ */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 sm:mb-10"
                >
                    <div className="inline-flex mb-6">
                        <Logo size="xl" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-3">
                        Let&apos;s estimate your <span className="text-gradient">survival time</span>
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">
                        This takes 10 seconds. No data connection needed.
                    </p>
                </motion.header>

                {/* ═══ INPUT SECTION ═══ */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-premium p-6 sm:p-8 rounded-[2rem] border border-white/5 mb-6 space-y-7"
                >
                    {/* Input 1: Team Size */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-sm font-bold text-slate-300">How many people are on your team?</span>
                            </div>
                            <span className="text-2xl font-black text-white tabular-nums">{teamSize}</span>
                        </div>
                        <div className="relative h-12 flex items-center">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-primary/40"
                                    style={{ width: `${((teamSize - 1) / 49) * 100}%` }}
                                    layout
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={50}
                                step={1}
                                value={teamSize}
                                onChange={(e) => setTeamSize(Number(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                            />
                            <motion.div
                                className="absolute w-6 h-6 rounded-full bg-primary border-2 border-primary/80 shadow-[0_0_20px_rgba(99,102,241,0.3)] pointer-events-none z-20"
                                style={{ left: `calc(${((teamSize - 1) / 49) * 100}% - 12px)` }}
                                layout
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-700 mt-1 px-0.5 tabular-nums">
                            <span>1</span>
                            <span>10</span>
                            <span>25</span>
                            <span>50</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5" />

                    {/* Input 2: Monthly Spend */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Flame className="w-4 h-4 text-amber-400" />
                                </div>
                                <span className="text-sm font-bold text-slate-300">Rough monthly spend?</span>
                            </div>
                            <span className="text-2xl font-black text-amber-400 tabular-nums">{fmt(monthlySpend)}</span>
                        </div>
                        <SpendSlider value={monthlySpend} onChange={setMonthlySpend} />
                        <div className="flex justify-between text-[10px] text-slate-700 mt-1 px-0.5 tabular-nums">
                            <span>₹50K</span>
                            <span>₹5L</span>
                            <span>₹25L</span>
                            <span>₹50L</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5" />

                    {/* Input 3: Revenue Toggle */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Banknote className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-300">Revenue status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setHasRevenue(false)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all duration-200 text-center",
                                    !hasRevenue
                                        ? "border-amber-500/40 bg-amber-500/[0.06]"
                                        : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                                )}
                            >
                                <p className={cn("text-sm font-black", !hasRevenue ? "text-amber-400" : "text-slate-400")}>
                                    No revenue yet
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Pre-revenue stage</p>
                            </button>
                            <button
                                onClick={() => setHasRevenue(true)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all duration-200 text-center",
                                    hasRevenue
                                        ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                                        : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                                )}
                            >
                                <p className={cn("text-sm font-black", hasRevenue ? "text-emerald-400" : "text-slate-400")}>
                                    We have revenue
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Generating income</p>
                            </button>
                        </div>
                    </div>
                </motion.section>

                {/* ═══ INSTANT CFO OUTPUT ═══ */}
                <AnimatePresence mode="wait">
                    <motion.section
                        key={`${teamSize}-${monthlySpend}-${hasRevenue}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        {/* ── A. Runway Estimate ────────────────────────────────── */}
                        <div className={cn(
                            "p-6 sm:p-8 rounded-[2rem] border-2 relative overflow-hidden",
                            isUrgent ? "border-rose-500/30 bg-rose-500/[0.04]" :
                            isCautious ? "border-amber-500/25 bg-amber-500/[0.03]" :
                            "border-emerald-500/20 bg-emerald-500/[0.03]"
                        )}>
                            {/* Pulse indicator for urgent */}
                            {isUrgent && (
                                <motion.div
                                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent"
                                />
                            )}

                            <div className="flex items-start gap-4 mb-5">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                                    isUrgent ? "bg-rose-500/15" : isCautious ? "bg-amber-500/15" : "bg-emerald-500/15"
                                )}>
                                    {isUrgent ? <Skull className="w-6 h-6 text-rose-400" /> :
                                     isCautious ? <Clock className="w-6 h-6 text-amber-400" /> :
                                     <Shield className="w-6 h-6 text-emerald-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Estimated Runway</span>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                            isUrgent ? "bg-rose-500/15 text-rose-400" :
                                            isCautious ? "bg-amber-500/15 text-amber-400" :
                                            "bg-emerald-500/15 text-emerald-400"
                                        )}>
                                            {isUrgent ? 'CRITICAL' : isCautious ? 'WATCH' : 'HEALTHY'}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xl sm:text-2xl font-black leading-snug tracking-tight",
                                        isUrgent ? "text-rose-400" : isCautious ? "text-amber-400" : "text-emerald-400"
                                    )}>
                                        {output.headline}
                                    </p>
                                </div>
                            </div>

                            {/* Runway range visual */}
                            <div className={cn(
                                "grid grid-cols-2 gap-4 p-4 rounded-xl border",
                                isUrgent ? "bg-rose-500/[0.03] border-rose-500/10" :
                                isCautious ? "bg-amber-500/[0.03] border-amber-500/10" :
                                "bg-emerald-500/[0.03] border-emerald-500/10"
                            )}>
                                <div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Low estimate</p>
                                    <p className={cn("text-2xl font-black tabular-nums", isUrgent ? "text-rose-400" : isCautious ? "text-amber-400" : "text-emerald-400")}>
                                        <AnimatedNumber value={output.runwayLow} format="months" />
                                        <span className="text-sm font-medium text-slate-600 ml-1">months</span>
                                    </p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">{output.deathDateLow}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">High estimate</p>
                                    <p className={cn("text-2xl font-black tabular-nums", isUrgent ? "text-rose-400" : isCautious ? "text-amber-400" : "text-emerald-400")}>
                                        <AnimatedNumber value={Math.min(output.runwayHigh, 36)} format="months" />
                                        <span className="text-sm font-medium text-slate-600 ml-1">months</span>
                                    </p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">{output.deathDateHigh}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── B. Biggest Risk ──────────────────────────────────── */}
                        <div className={cn(
                            "p-5 sm:p-6 rounded-2xl border flex items-start gap-4",
                            output.biggestRisk.severity === 'critical' ? "bg-rose-500/[0.04] border-rose-500/20" :
                            output.biggestRisk.severity === 'high' ? "bg-amber-500/[0.04] border-amber-500/15" :
                            "bg-white/[0.02] border-white/10"
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                output.biggestRisk.severity === 'critical' ? "bg-rose-500/15" :
                                output.biggestRisk.severity === 'high' ? "bg-amber-500/15" :
                                "bg-white/5"
                            )}>
                                <AlertTriangle className={cn("w-5 h-5",
                                    output.biggestRisk.severity === 'critical' ? "text-rose-400" :
                                    output.biggestRisk.severity === 'high' ? "text-amber-400" :
                                    "text-slate-400"
                                )} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-1.5">Biggest Risk</p>
                                <p className={cn("text-sm font-bold leading-relaxed",
                                    output.biggestRisk.severity === 'critical' ? "text-rose-300" :
                                    output.biggestRisk.severity === 'high' ? "text-amber-300" :
                                    "text-slate-300"
                                )}>
                                    {output.biggestRisk.message}
                                </p>
                            </div>
                        </div>

                        {/* ── C. Top Actions ───────────────────────────────────── */}
                        {output.actions.length > 0 && (
                            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-4 h-4 text-primary" />
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">What you can do right now</p>
                                </div>
                                <div className="space-y-3">
                                    {output.actions.map((action, i) => (
                                        <motion.div
                                            key={action.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * i }}
                                            className="flex items-center gap-4 p-3.5 rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors group"
                                        >
                                            {/* Number */}
                                            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] font-black text-primary">{i + 1}</span>
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white">{action.title}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{action.description}</p>
                                            </div>
                                            {/* Impact badge */}
                                            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                                                <span className="text-[10px] font-black text-emerald-400">
                                                    +{action.impactDays}d
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── D. Trust Layer ───────────────────────────────────── */}
                        <div className="flex items-center justify-center gap-3 py-2 text-[10px] text-slate-600">
                            <Shield className="w-3 h-3 text-slate-700" />
                            <span>Estimated based on typical startup patterns</span>
                            <span className="text-slate-700">·</span>
                            <span className="text-slate-500 font-bold">Confidence: Low</span>
                        </div>

                        {/* ── E. Primary CTA ───────────────────────────────────── */}
                        <div className="pt-2 space-y-3">
                            <button
                                onClick={handleConnect}
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl",
                                    isUrgent
                                        ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                                        : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                                )}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" />
                                        Connect your bank to see real numbers
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/8 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Upload bank statements instead
                            </button>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-bold text-center"
                            >
                                {error}
                            </motion.div>
                        )}
                    </motion.section>
                </AnimatePresence>
            </div>
        </div>
    );
}
