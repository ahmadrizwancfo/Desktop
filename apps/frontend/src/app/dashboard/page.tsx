'use client';

import React from 'react';
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
    DollarSign,
    TrendingUp,
    Activity,
    Zap,
    Clock,
    ExternalLink,
    BrainCircuit,
    Sliders
} from 'lucide-react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financialService } from '@/services/financial-service';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { setProfile, clearProfile, showInvestorMetrics } = useStartupProfileStore();
    const [profileChecked, setProfileChecked] = React.useState(false);

    // ── Onboarding Gate ──────────────────────────────────────────────────────
    // Always verify with the API on mount — never trust localStorage alone.
    // Zustand persist can hold a stale profile from a previous session.
    // If the API returns 404 → no profile exists → redirect to /onboarding.
    useEffect(() => {
        apiClient.get('/startup-profile/me')
            .then((res) => {
                setProfile(res.data);
                setProfileChecked(true);
            })
            .catch(() => {
                clearProfile();           // wipe stale localStorage cache
                router.push('/onboarding');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally run once on mount only

    const showInvestor = showInvestorMetrics();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['financial-stats', user?.organizationId],
        queryFn: () => financialService.getStats(user?.organizationId || ''),
        enabled: !!user?.organizationId && profileChecked,
    });

    // Spinner while profile API check is in flight OR stats loading
    if (!profileChecked || isLoading) {
        return (
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    // Show empty state if no stats loaded or hasData is false
    if (!stats || stats.hasData === false) {
        return (
            <DashboardLayout>
                <div className="flex flex-col gap-8 max-w-7xl mx-auto">
                    <div className="glass-card rounded-3xl p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BrainCircuit className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Welcome to FounderCFO</h3>
                        <p className="text-slate-400 mt-2 max-w-md mx-auto">
                            Upload your first financial document to unlock your AI-powered CFO dashboard.
                        </p>
                        <div className="mt-8">
                            <FileUpload onSuccess={() => queryClient.invalidateQueries({ queryKey: ['financial-stats'] })} />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-7xl mx-auto">
                {/* Welcome Section */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Financial Overview</h2>
                        <p className="text-slate-400 mt-1">Good morning, {user?.name || 'Founder'}. Here is your financial health decision matrix.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/simulator" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-indigo-600 transition-all flex items-center gap-2">
                            <Sliders className="w-4 h-4" />
                            What-If Simulator
                        </Link>
                        <Link href="/ai-cfo" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-primary" />
                            Ask AI CFO
                        </Link>
                    </div>
                </div>

                {/* 1. The Decision Assistant (North Star) */}
                <CFOSummaryCard
                    status="WATCH"
                    runwayMonths={stats.cashRunway ? parseFloat(stats.cashRunway.replace(/[^0-9.]/g, '')) : 7.2}
                    monthlyBurn={stats.monthlyBurn || 240000}
                    safeToHire={false}
                    message="Burn rate increased by 18% this month, reducing runway by 0.5 months."
                />

                {/* 2. Why Drill-Down Metrics - Click to see WHY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        label="Expenses"
                        value={`₹${((Number(stats.monthlyBurn) || 0) / 100000).toFixed(1)}L`}
                        change={0}
                        changePercent={0}
                        isPositive={false}
                    />
                </div>

                {/* 3. Decision Intelligence Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Decision Cards + Cash Flow */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* CFO Recommendations */}
                        <DecisionCards />

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
