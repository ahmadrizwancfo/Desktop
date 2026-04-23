'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Clock,
    Target,
    BarChart3,
    Zap,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

// Mock data for when backend is unavailable
const mockMetrics = {
    cac: 27083,
    ltv: 121500,
    ltvCacRatio: 4.5,
    paybackPeriod: 14.8,
    grossMargin: 65,
    arpu: 2207,
    churnRate: 0.46,
    averageCustomerLifespan: 217.4,
    mrr: 320000,
    arr: 3840000,
    healthScore: 75,
    healthStatus: 'good' as const,
};

const mockDecisions = [
    { scenario: 'reduce churn', cacChange: 0, ltvChange: 37.5, paybackChange: -12.5, recommendation: 'Reducing churn is the highest-leverage activity for improving unit economics.', impact: 'positive' as const },
    { scenario: 'raise prices', cacChange: 3, ltvChange: 18, paybackChange: -12, recommendation: 'Price increase will improve unit economics if churn stays stable.', impact: 'positive' as const },
    { scenario: 'cut cogs', cacChange: 0, ltvChange: 7, paybackChange: -4, recommendation: "Reducing COGS improves gross margin and LTV. Ensure quality isn't affected.", impact: 'positive' as const },
    { scenario: 'increase marketing', cacChange: 16, ltvChange: 6, paybackChange: 12, recommendation: 'Marketing increase may hurt unit economics. Consider targeting higher-value segments.', impact: 'negative' as const },
    { scenario: 'expand sales', cacChange: 15, ltvChange: 12, paybackChange: 9, recommendation: 'Sales expansion increases CAC but can improve customer quality. Track deal sizes.', impact: 'negative' as const },
];

const mockCohorts = [
    { month: 'Sep 2025', customersAcquired: 12, retentionMonth1: 100, retentionMonth3: 92, retentionMonth6: 83, retentionMonth12: 75 },
    { month: 'Oct 2025', customersAcquired: 15, retentionMonth1: 100, retentionMonth3: 93, retentionMonth6: 87, retentionMonth12: 0 },
    { month: 'Nov 2025', customersAcquired: 10, retentionMonth1: 100, retentionMonth3: 90, retentionMonth6: 0, retentionMonth12: 0 },
    { month: 'Dec 2025', customersAcquired: 18, retentionMonth1: 100, retentionMonth3: 0, retentionMonth6: 0, retentionMonth12: 0 },
    { month: 'Jan 2026', customersAcquired: 14, retentionMonth1: 100, retentionMonth3: 0, retentionMonth6: 0, retentionMonth12: 0 },
];

export default function UnitEconomicsPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'decisions' | 'cohorts'>('overview');
    const user = useAuthStore((state) => state.user);
    const orgId = user?.organizationId || '';

    // Fetch metrics
    const { data: metrics, isLoading: metricsLoading } = useQuery({
        queryKey: ['unit-economics-metrics', orgId],
        queryFn: async () => {
            const res = await apiClient.get(`/unit-economics/${orgId}/metrics`);
            return res.data;
        },
        enabled: !!orgId,
    });

    // Fetch decision scenarios
    const { data: decisions } = useQuery({
        queryKey: ['unit-economics-decisions', orgId],
        queryFn: async () => {
            const res = await apiClient.get(`/unit-economics/${orgId}/decisions`);
            return res.data;
        },
        enabled: !!orgId,
    });

    // Fetch cohort data
    const { data: cohorts } = useQuery({
        queryKey: ['unit-economics-cohorts', orgId],
        queryFn: async () => {
            const res = await apiClient.get(`/unit-economics/${orgId}/cohorts`);
            return res.data;
        },
        enabled: !!orgId,
    });

    const m = metrics || mockMetrics;
    const d = decisions || mockDecisions;
    const c = cohorts || mockCohorts;

    if (metricsLoading) {
        return (
            <DashboardLayout>
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const healthColors = {
        excellent: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', border: 'border-emerald-500/30' },
        good: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
        needs_work: { bg: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/30' },
        critical: { bg: 'bg-rose-500/20', text: 'text-rose-500', border: 'border-rose-500/30' },
    };

    const healthStatus = m.healthStatus as keyof typeof healthColors;
    const hc = healthColors[healthStatus] || healthColors.good;

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Unit Economics</h1>
                        <p className="text-slate-400 mt-1">Understand CAC, LTV, and payback to optimize growth.</p>
                    </div>
                    <div className={cn("px-4 py-2 rounded-xl border flex items-center gap-2", hc.bg, hc.border)}>
                        <CheckCircle2 className={cn("w-4 h-4", hc.text)} />
                        <span className={cn("text-sm font-bold uppercase tracking-wider", hc.text)}>
                            {m.healthStatus.replace('_', ' ')}
                        </span>
                        <span className={cn("text-sm font-black", hc.text)}>{m.healthScore}%</span>
                    </div>
                </header>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'decisions', label: 'Decision Impact', icon: Target },
                        { id: 'cohorts', label: 'Cohort Analysis', icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                activeTab === tab.id
                                    ? "bg-primary text-white"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Primary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                {
                                    label: 'CAC',
                                    value: `₹${(m.cac / 1000).toFixed(1)}K`,
                                    subtext: 'Customer Acquisition Cost',
                                    icon: DollarSign,
                                    color: 'primary',
                                },
                                {
                                    label: 'LTV',
                                    value: `₹${(m.ltv / 1000).toFixed(1)}K`,
                                    subtext: 'Customer Lifetime Value',
                                    icon: TrendingUp,
                                    color: 'emerald',
                                },
                                {
                                    label: 'LTV:CAC',
                                    value: `${m.ltvCacRatio}x`,
                                    subtext: m.ltvCacRatio >= 3 ? 'Healthy ratio' : 'Needs improvement',
                                    icon: Target,
                                    color: m.ltvCacRatio >= 3 ? 'emerald' : 'amber',
                                },
                                {
                                    label: 'Payback',
                                    value: `${m.paybackPeriod} mo`,
                                    subtext: m.paybackPeriod <= 12 ? 'Acceptable' : 'Too long',
                                    icon: Clock,
                                    color: m.paybackPeriod <= 12 ? 'emerald' : 'amber',
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
                                            metric.color === 'primary' && "bg-primary/20",
                                            metric.color === 'emerald' && "bg-emerald-500/20",
                                            metric.color === 'amber' && "bg-amber-500/20",
                                        )}>
                                            <metric.icon className={cn(
                                                "w-5 h-5",
                                                metric.color === 'primary' && "text-primary",
                                                metric.color === 'emerald' && "text-emerald-400",
                                                metric.color === 'amber' && "text-amber-400",
                                            )} />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{metric.label}</p>
                                    <p className="text-2xl font-black text-white mt-1">{metric.value}</p>
                                    <p className={cn(
                                        "text-xs mt-1",
                                        metric.color === 'emerald' && "text-emerald-400",
                                        metric.color === 'amber' && "text-amber-400",
                                        metric.color === 'primary' && "text-slate-400",
                                    )}>{metric.subtext}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Secondary Metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue Metrics */}
                            <div className="glass-card rounded-3xl p-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                    Revenue Metrics
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div>
                                            <p className="text-xs text-slate-500">Monthly Recurring Revenue</p>
                                            <p className="text-xl font-bold text-white">₹{(m.mrr / 100000).toFixed(1)}L</p>
                                        </div>
                                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div>
                                            <p className="text-xs text-slate-500">Annual Recurring Revenue</p>
                                            <p className="text-xl font-bold text-white">₹{(m.arr / 10000000).toFixed(2)}Cr</p>
                                        </div>
                                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div>
                                            <p className="text-xs text-slate-500">ARPU</p>
                                            <p className="text-xl font-bold text-white">₹{m.arpu.toLocaleString('en-IN')}</p>
                                        </div>
                                        <Users className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Efficiency Metrics */}
                            <div className="glass-card rounded-3xl p-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    Efficiency Metrics
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-slate-500">Gross Margin</p>
                                            <p className="text-sm font-bold text-white">{m.grossMargin}%</p>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full"
                                                style={{ width: `${m.grossMargin}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div>
                                            <p className="text-xs text-slate-500">Monthly Churn Rate</p>
                                            <p className="text-xl font-bold text-white">{m.churnRate}%</p>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-1 rounded text-xs font-bold",
                                            m.churnRate <= 2 ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                                        )}>
                                            {m.churnRate <= 2 ? 'HEALTHY' : 'WATCH'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                                        <div>
                                            <p className="text-xs text-slate-500">Avg Customer Lifespan</p>
                                            <p className="text-xl font-bold text-white">{m.averageCustomerLifespan} months</p>
                                        </div>
                                        <Clock className="w-6 h-6 text-purple-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Decision Impact Tab */}
                {activeTab === 'decisions' && (
                    <div className="space-y-6">
                        <div className="glass-card rounded-3xl p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Decision Impact View
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">See how different decisions affect your unit economics.</p>

                            <div className="space-y-4">
                                {d.map((decision: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={cn(
                                            "p-5 rounded-2xl border",
                                            decision.impact === 'positive' ? "bg-emerald-500/5 border-emerald-500/20" :
                                                decision.impact === 'negative' ? "bg-rose-500/5 border-rose-500/20" :
                                                    "bg-white/5 border-white/10"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-xl",
                                                    decision.impact === 'positive' ? "bg-emerald-500/20" :
                                                        decision.impact === 'negative' ? "bg-rose-500/20" :
                                                            "bg-white/10"
                                                )}>
                                                    {decision.impact === 'positive' ? (
                                                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                                                    ) : decision.impact === 'negative' ? (
                                                        <ArrowDownRight className="w-5 h-5 text-rose-400" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white capitalize">{decision.scenario}</h4>
                                                    <p className="text-xs text-slate-500">{decision.recommendation}</p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black px-2 py-1 rounded uppercase",
                                                decision.impact === 'positive' ? "bg-emerald-500/20 text-emerald-500" :
                                                    decision.impact === 'negative' ? "bg-rose-500/20 text-rose-500" :
                                                        "bg-slate-500/20 text-slate-400"
                                            )}>
                                                {decision.impact}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-3 rounded-xl bg-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">CAC Impact</p>
                                                <p className={cn(
                                                    "text-lg font-bold",
                                                    decision.cacChange > 0 ? "text-rose-400" : decision.cacChange < 0 ? "text-emerald-400" : "text-slate-400"
                                                )}>
                                                    {decision.cacChange > 0 ? '+' : ''}{decision.cacChange}%
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">LTV Impact</p>
                                                <p className={cn(
                                                    "text-lg font-bold",
                                                    decision.ltvChange > 0 ? "text-emerald-400" : decision.ltvChange < 0 ? "text-rose-400" : "text-slate-400"
                                                )}>
                                                    {decision.ltvChange > 0 ? '+' : ''}{decision.ltvChange}%
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Payback Impact</p>
                                                <p className={cn(
                                                    "text-lg font-bold",
                                                    decision.paybackChange < 0 ? "text-emerald-400" : decision.paybackChange > 0 ? "text-rose-400" : "text-slate-400"
                                                )}>
                                                    {decision.paybackChange > 0 ? '+' : ''}{decision.paybackChange}%
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Cohort Analysis Tab */}
                {activeTab === 'cohorts' && (
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                Customer Cohort Retention
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cohort</th>
                                        <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acquired</th>
                                        <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">M1</th>
                                        <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">M3</th>
                                        <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">M6</th>
                                        <th className="text-center p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">M12</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {c.map((cohort: any, i: number) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 text-sm font-bold text-white">{cohort.month}</td>
                                            <td className="p-4 text-center text-sm text-slate-300">{cohort.customersAcquired}</td>
                                            <td className="p-4 text-center">
                                                <span className="text-sm font-bold text-emerald-400">{cohort.retentionMonth1}%</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {cohort.retentionMonth3 > 0 ? (
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        cohort.retentionMonth3 >= 90 ? "text-emerald-400" :
                                                            cohort.retentionMonth3 >= 80 ? "text-blue-400" :
                                                                "text-amber-400"
                                                    )}>{cohort.retentionMonth3}%</span>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                {cohort.retentionMonth6 > 0 ? (
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        cohort.retentionMonth6 >= 85 ? "text-emerald-400" :
                                                            cohort.retentionMonth6 >= 75 ? "text-blue-400" :
                                                                "text-amber-400"
                                                    )}>{cohort.retentionMonth6}%</span>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                {cohort.retentionMonth12 > 0 ? (
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        cohort.retentionMonth12 >= 70 ? "text-emerald-400" :
                                                            cohort.retentionMonth12 >= 60 ? "text-blue-400" :
                                                                "text-amber-400"
                                                    )}>{cohort.retentionMonth12}%</span>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
