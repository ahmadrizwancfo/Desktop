'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { CashFlowWidget } from '@/components/dashboard/cash-flow-widget';
import { FileUpload } from '@/components/dashboard/file-upload';
import { CFOSummaryCard } from '@/components/dashboard/cfo-summary-card';
import { WhyDrillDown } from '@/components/dashboard/why-drill-down';
import { ActionTracker } from '@/components/dashboard/action-tracker';
import { DecisionCards } from '@/components/dashboard/decision-cards';
import { RiskRadar } from '@/components/dashboard/risk-radar';
import { FounderNarrative } from '@/components/dashboard/founder-narrative';
import { AICFOPrompts } from '@/components/dashboard/ai-cfo-prompts';
import { QuickInvoice } from '@/components/dashboard/quick-invoice';
import { AddTransactionForm } from '@/components/dashboard/add-transaction-form';
import {
    BrainCircuit,
    Sliders,
    Upload,
    Link2,
    FlaskConical,
    Loader2,
    ArrowRight,
    Sparkles,
    Users,
    TrendingUp,
    Wallet,
    Target,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financialService } from '@/services/financial-service';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { apiClient } from '@/lib/api-client';
import { seedDemoData } from '@/lib/demo-data';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn, isStale } from '@/lib/utils';

// ── Strategic Questions (driven by profile) ────────────────────────────────────

interface StrategicQuestion {
    question: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    condition: (goal: string, runway: number) => boolean;
}

const STRATEGIC_QUESTIONS: StrategicQuestion[] = [
    {
        question: 'Should I hire now?',
        icon: <Users className="w-4 h-4" />,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10 border-sky-500/20',
        condition: (_, runway) => runway > 6,
    },
    {
        question: 'Should I raise funding?',
        icon: <Wallet className="w-4 h-4" />,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 border-violet-500/20',
        condition: (goal) => goal === 'RAISE',
    },
    {
        question: 'Can I survive 12 months?',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/20',
        condition: () => true,
    },
    {
        question: 'Should I cut costs?',
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/20',
        condition: (_, runway) => runway < 12,
    },
    {
        question: 'Am I profitable in 6 months?',
        icon: <Target className="w-4 h-4" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20',
        condition: () => true,
    },
];

// ── Main Dashboard Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { setProfile, clearProfile, showInvestorMetrics } = useStartupProfileStore();
    const profile = useStartupProfileStore((s) => s.profile);
    const [profileChecked, setProfileChecked] = React.useState(false);

    // Demo data loading state
    const [isDemoLoading, setIsDemoLoading] = React.useState(false);
    const [showUploadPanel, setShowUploadPanel] = React.useState(false);

    // ── Onboarding Gate ──────────────────────────────────────────────────────
    useEffect(() => {
        apiClient.get('/startup-profile/me')
            .then((res) => {
                setProfile(res.data);
                setProfileChecked(true);
            })
            .catch(() => {
                clearProfile();
                router.push('/onboarding');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showInvestor = showInvestorMetrics();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['financial-stats', user?.organizationId],
        queryFn: () => financialService.getStats(user?.organizationId || ''),
        enabled: !!user?.organizationId && profileChecked,
    });

    // Loading spinner
    if (!profileChecked || isLoading) {
        return (
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    // ── Handle Demo Data Seed ─────────────────────────────────────────────────
    const handleDemoSeed = async () => {
        setIsDemoLoading(true);
        const result = await seedDemoData(apiClient);
        if (result.success) {
            // Refresh everything seamlessly
            queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
            
            // Redirect to the CFO decision feed natively without a hard page reload
            setTimeout(() => {
                setIsDemoLoading(false);
                router.push('/ai-cfo');
            }, 1000); // Small psychological delay to show success
        } else {
            setIsDemoLoading(false);
            alert(`Demo setup failed: ${result.error}`);
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // EMPTY STATE: 3-Option Launcher
    // ════════════════════════════════════════════════════════════════════════════

    if (!stats || stats.hasData === false) {
        return (
            <DashboardLayout>
                <div className="flex flex-col gap-8 max-w-4xl mx-auto mt-8 px-4">
                    {/* Header — Founder Pain */}
                    <div className="text-center">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-3 mb-6"
                        >
                            <div className="w-14 h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                                <BrainCircuit className="w-8 h-8 text-white" />
                            </div>
                        </motion.div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            See Your Runway in 30 Seconds
                        </h2>
                        <p className="text-slate-400 mt-3 max-w-lg mx-auto text-lg">
                            Upload your data. Your AI CFO will analyze your business instantly.
                        </p>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* HERO: Try Demo — Zero Friction Entry */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        onClick={!isDemoLoading ? handleDemoSeed : undefined}
                        className={cn(
                            "rounded-3xl p-8 border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden",
                            isDemoLoading
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-transparent hover:border-emerald-400/50 hover:shadow-[0_0_60px_-12px_rgba(16,185,129,0.25)]"
                        )}
                    >
                        {/* Glow Effects */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/15 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                            {/* Left: CTA Content */}
                            <div className="flex-1">
                                {/* Recommended badge */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recommended</span>
                                </div>

                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FlaskConical className="w-7 h-7 text-emerald-400" />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Try Demo Data</h3>
                                <p className="text-slate-400 leading-relaxed mb-5 max-w-md">
                                    See how FounderCFO works instantly with realistic sample startup data. Zero setup needed.
                                </p>

                                {isDemoLoading ? (
                                    <div className="flex items-center gap-3 text-emerald-400 font-bold">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Setting up your demo startup...</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/20">
                                        <span>👉 See it in action (30 seconds)</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                )}
                            </div>

                            {/* Right: Outcome Preview */}
                            <div className="md:w-64 shrink-0">
                                <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-5 space-y-3.5">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">What you&apos;ll get</p>
                                    {[
                                        { label: 'Runway: 5.2 months', color: 'text-emerald-400' },
                                        { label: 'Burn analysis', color: 'text-sky-400' },
                                        { label: 'Hiring risk assessment', color: 'text-amber-400' },
                                        { label: 'Weekly CFO report', color: 'text-violet-400' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center gap-2.5">
                                            <CheckCircle2 className={`w-4 h-4 ${item.color} shrink-0`} />
                                            <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ══════════════════════════════════════════════════════════════ */}
                    {/* SECONDARY: Upload + Connect */}
                    {/* ══════════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Upload Financial Files */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className={cn(
                                "glass-card rounded-3xl p-6 border cursor-pointer transition-all duration-300 group relative overflow-hidden",
                                showUploadPanel
                                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                    : "border-white/10 hover:border-primary/30 hover:bg-white/[0.03]"
                            )}
                            onClick={() => setShowUploadPanel(!showUploadPanel)}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Upload Financial Files</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                P&L statements, bank statements, CSV, or Excel files
                            </p>
                            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                                <span>{showUploadPanel ? 'Close' : 'Upload'}</span>
                                <ArrowRight className="w-3 h-3" />
                            </div>
                        </motion.div>

                        {/* Connect Accounting Software */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden opacity-80"
                        >
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Coming Soon</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                                <Link2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Connect Software</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                Zoho Books · Tally · QuickBooks
                            </p>
                            <div className="flex gap-3 mt-2">
                                {['Zoho', 'Tally', 'QB'].map((name) => (
                                    <div key={name} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Upload Panel (slides open) */}
                    <AnimatePresence>
                        {showUploadPanel && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="glass-card rounded-3xl p-8 border border-primary/20">
                                    <FileUpload onSuccess={() => queryClient.invalidateQueries({ queryKey: ['financial-stats'] })} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Trust signals */}
                    <div className="flex items-center justify-center gap-8 text-slate-500 text-xs">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Bank-grade encryption</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>No data sharing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Delete anytime</span>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // POPULATED DASHBOARD: Full CFO View
    // ════════════════════════════════════════════════════════════════════════════

    const runwayMonths = stats.cashRunway ? parseFloat(stats.cashRunway.replace(/[^0-9.]/g, '')) : 7.2;
    const primaryGoal = profile?.primaryGoal || 'SCALE';
    const relevantQuestions = STRATEGIC_QUESTIONS.filter(q => q.condition(primaryGoal, runwayMonths)).slice(0, 3);

    return (
        <DashboardLayout>
            <div className="relative flex flex-col gap-10 max-w-7xl mx-auto pb-20">
                {/* Cinematic Background Elements */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none z-0">
                    <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full opacity-50" />
                    <div className="absolute top-[20%] right-1/4 w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full opacity-30" />
                </div>

                {/* Stale Data Warning */}
                {isStale(stats.lastUpdatedAt) && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="relative z-10 bg-rose-500/5 border border-rose-500/10 rounded-[1.5rem] p-5 flex items-center gap-5 glass-premium group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-inner">
                            <AlertTriangle className="w-6 h-6 text-rose-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-rose-400 uppercase tracking-[0.2em]">Synchronization Required</h4>
                            <p className="text-xs text-rose-300/60 mt-1 font-medium italic">"Decisions are only as good as the data they're built on." Your data is stale.</p>
                        </div>
                        <Link 
                            href="/integrations" 
                            className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-rose-500/20"
                        >
                            Sync Engine
                        </Link>
                    </motion.div>
                )}

                {/* Welcome Section */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
                >
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-white tracking-tight text-editorial">
                            Financial <span className="text-gradient">Intelligence</span>
                        </h2>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.1em]">
                            Command Center • {user?.name || 'Founder'} • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {showInvestor && (
                            <Link href="/investor-readiness" className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 group/btn">
                                <FileText className="w-4 h-4 text-violet-400 group-hover/btn:scale-110 transition-transform" />
                                Investor Report
                            </Link>
                        )}
                        <Link href="/simulator" className="px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 group/btn">
                            <Sliders className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                            Simulation Mode
                        </Link>
                        <Link href="/ai-cfo" className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 group/btn">
                            <BrainCircuit className="w-4 h-4 text-primary group-hover/btn:scale-110 transition-transform" />
                            Ask AI CFO
                        </Link>
                    </div>
                </motion.div>

                {/* 1. The Decision Assistant (North Star) */}
                <div className="relative z-10">
                    <CFOSummaryCard
                        status="WATCH"
                        runwayMonths={runwayMonths}
                        monthlyBurn={stats.monthlyBurn || 240000}
                        safeToHire={false}
                        message="Burn rate increased by 18% this month, reducing runway by 0.5 months."
                    />
                </div>

                {/* 2. Why Drill-Down Metrics */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <WhyDrillDown
                        metric="burn"
                        label="Monthly Burn"
                        value={`₹${((Number(stats.monthlyBurn) || 0) / 100000).toFixed(1)}L`}
                        change={0}
                        changePercent={0}
                        isPositive={false}
                    />
                    <WhyDrillDown
                        metric="revenue"
                        label="Monthly Revenue"
                        value={`₹${((Number(stats.totalRevenue) || 0) / 100000).toFixed(1)}L`}
                        change={0}
                        changePercent={0}
                        isPositive={true}
                    />
                    <WhyDrillDown
                        metric="expenses"
                        label="Operations"
                        value={`₹${((Number(stats.monthlyBurn) || 0) / 100000).toFixed(1)}L`}
                        change={0}
                        changePercent={0}
                        isPositive={false}
                    />
                </motion.div>

                {/* 3. Decision Intelligence Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Decision Cards + Strategic Questions + Cash Flow */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* CFO Recommendations */}
                        <DecisionCards />

                        {/* Strategic Questions — Ask AI CFO */}
                        <div className="glass-card rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    Strategic Decisions
                                </h3>
                                <Link href="/ai-cfo" className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">
                                    Ask anything →
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {relevantQuestions.map((q, i) => (
                                    <Link
                                        key={i}
                                        href={`/ai-cfo?q=${encodeURIComponent(q.question)}`}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all hover:scale-[1.02] group",
                                            q.bgColor
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", q.bgColor)}>
                                            {q.icon}
                                        </div>
                                        <p className="text-sm font-bold text-white">{q.question}</p>
                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1", q.color)}>
                                            Ask AI CFO <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Cash Flow Chart */}
                        <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Cash Flow Dynamics</h3>
                            </div>
                            <RevenueChart />
                        </div>

                        {/* Monthly Narrative for Investors */}
                        {showInvestor && <FounderNarrative />}
                    </div>

                    {/* Right: Risk Radar + Actions + AI */}
                    <div className="flex flex-col gap-6">
                        {/* Risk Radar */}
                        <RiskRadar />

                        {/* Action Tracker */}
                        <ActionTracker />

                        {/* AI CFO Contextual Prompts */}
                        <AICFOPrompts />

                        {/* Quick Invoice */}
                        <QuickInvoice />

                        {/* Quick Actions */}
                        <div className="glass-card rounded-3xl p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Quick Decisions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Verify Expenses', href: '/expenses' },
                                    { label: 'Approve Payroll', href: '/payroll' },
                                    { label: 'Tax Filings', href: '/compliance' },
                                    { label: 'View Invoices', href: '/invoices' },
                                ].map((action, i) => (
                                    <Link
                                        key={i}
                                        href={action.href}
                                        className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/10 hover:border-primary/20 transition-all text-center flex items-center justify-center min-h-[60px]"
                                    >
                                        <span className="text-xs font-bold text-white">{action.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Data Sources */}
                        <div className="glass-card rounded-3xl p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Data Sources</h3>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm font-bold text-emerald-400">HDFC Bank</span>
                                    </div>
                                    <span className="text-xs text-emerald-500">Connected</span>
                                </div>
                                <FileUpload
                                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['financial-stats'] })}
                                />
                                <AddTransactionForm />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
