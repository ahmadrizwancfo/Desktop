'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion } from 'framer-motion';
import {
    Clock, TrendingUp, TrendingDown, Wallet, Activity,
    CheckCircle2, XCircle, ArrowRight, RefreshCw, Shield
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
}

function timeAgo(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface HistoryData {
    snapshots: any[];
    decisions: any[];
    financials: any[];
    profile: {
        dataInputMethod: string;
        lastFinancialUpdate: string;
    };
}

export default function HistoryPage() {
    const router = useRouter();
    const [data, setData] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/cfo-engine/history')
            .then(res => setData(res.data))
            .catch(err => console.error('Failed to load history:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <p className="text-slate-500">Failed to load history.</p>
                </div>
            </DashboardLayout>
        );
    }

    const latestSnapshot = data.snapshots[0];
    const prevSnapshot = data.snapshots[1];
    const recentDecisions = data.decisions.slice(0, 5);

    // Build runway trend from snapshots
    const runwayTrend = data.snapshots
        .slice(0, 5)
        .reverse()
        .map(s => `${s.runwayMonths.toFixed(1)}`)
        .join(' → ');

    // Data freshness
    const lastUpdate = new Date(data.profile.lastFinancialUpdate);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceUpdate > 14;
    const isVeryStale = daysSinceUpdate > 30;

    const confidenceMap: Record<string, string> = {
        INTEGRATION: 'HIGH',
        MANUAL: 'MEDIUM',
        SLIDER: 'LOW',
        DEMO: 'LOW',
    };
    const confidence = confidenceMap[data.profile.dataInputMethod] || 'LOW';

    return (
        <DashboardLayout>
            <div className="max-w-[1000px] mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-primary" />
                            <h1 className="text-2xl font-black text-white tracking-tight">Financial History</h1>
                        </div>
                        <button
                            onClick={() => router.push('/manual-input')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-colors"
                        >
                            Update Financials
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>Data source: <strong className="text-slate-400">{data.profile.dataInputMethod}</strong></span>
                        <span>·</span>
                        <span>Confidence: <strong className={cn(
                            confidence === 'HIGH' ? 'text-emerald-400' :
                            confidence === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
                        )}>{confidence}</strong></span>
                        <span>·</span>
                        <span>Last updated: <strong className={cn(isVeryStale ? 'text-rose-400' : isStale ? 'text-amber-400' : 'text-slate-400')}>{timeAgo(data.profile.lastFinancialUpdate)}</strong></span>
                    </div>
                </motion.div>

                {/* Stale Data Warning */}
                {isStale && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border",
                            isVeryStale
                                ? "bg-rose-500/5 border-rose-500/20"
                                : "bg-amber-500/5 border-amber-500/20"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Clock className={cn("w-4 h-4", isVeryStale ? "text-rose-400" : "text-amber-400")} />
                            <span className={cn("text-sm font-bold", isVeryStale ? "text-rose-400" : "text-amber-400")}>
                                {isVeryStale
                                    ? `Your data is ${daysSinceUpdate} days old. Insights may be inaccurate.`
                                    : `Your data is ${daysSinceUpdate} days old. Consider updating.`}
                            </span>
                        </div>
                        <button
                            onClick={() => router.push('/manual-input')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                isVeryStale
                                    ? "bg-rose-500 text-white"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            )}
                        >
                            Update Now
                        </button>
                    </motion.div>
                )}

                {/* Latest Snapshot */}
                {latestSnapshot && (
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-slate-500" />
                            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Latest Snapshot</h2>
                            <span className="text-[10px] text-slate-600 ml-auto">{timeAgo(latestSnapshot.generatedAt)}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Revenue', value: fmt(latestSnapshot.monthlyRevenue), icon: TrendingUp, trend: latestSnapshot.revenueTrend },
                                { label: 'Net Burn', value: fmt(latestSnapshot.netBurn), icon: TrendingDown, trend: latestSnapshot.burnTrend },
                                { label: 'Cash', value: fmt(latestSnapshot.cashInBank), icon: Wallet },
                                { label: 'Runway', value: `${latestSnapshot.runwayMonths.toFixed(1)} mo`, icon: Clock, isRunway: true },
                            ].map((m, i) => (
                                <div key={m.label} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <m.icon className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
                                    </div>
                                    <p className={cn(
                                        "text-xl font-black tabular-nums",
                                        m.isRunway && latestSnapshot.runwayMonths < 3 ? 'text-rose-400' :
                                        m.isRunway && latestSnapshot.runwayMonths < 6 ? 'text-amber-400' : 'text-white'
                                    )}>{m.value}</p>
                                    {m.trend && (
                                        <p className={cn(
                                            "text-[10px] font-bold mt-1",
                                            m.trend === 'growing' || m.trend === 'decreasing' ? 'text-emerald-400' :
                                            m.trend === 'declining' || m.trend === 'increasing' ? 'text-rose-400' : 'text-slate-500'
                                        )}>
                                            {m.trend === 'growing' ? '↑ Growing' :
                                             m.trend === 'declining' ? '↓ Declining' :
                                             m.trend === 'increasing' ? '↑ Increasing' :
                                             m.trend === 'decreasing' ? '↓ Decreasing' : 'Stable'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Runway change after last decision */}
                        {prevSnapshot && latestSnapshot.runwayChangeDays !== null && (
                            <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                                <Activity className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-400">
                                    Runway change since last snapshot:{' '}
                                    <strong className={cn(
                                        latestSnapshot.runwayChangeDays > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    )}>
                                        {latestSnapshot.runwayChangeDays > 0 ? '+' : ''}{Math.round(latestSnapshot.runwayChangeDays / 30 * 10) / 10} months
                                    </strong>
                                </span>
                            </div>
                        )}
                    </motion.section>
                )}

                {/* Runway Trend */}
                {data.snapshots.length > 1 && (
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-slate-500" />
                            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Runway Trend</h2>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <p className="text-lg font-black text-white tracking-tight tabular-nums">
                                {runwayTrend} <span className="text-sm text-slate-500 font-medium ml-1">months</span>
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1">
                                Showing last {data.snapshots.length} snapshots (newest on right)
                            </p>
                        </div>
                    </motion.section>
                )}

                {/* Previous Decisions */}
                {recentDecisions.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-4 h-4 text-slate-500" />
                            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Decision History</h2>
                        </div>
                        <div className="space-y-2">
                            {recentDecisions.map((d: any) => (
                                <div key={d.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                        d.acted ? "bg-emerald-500/10" : "bg-slate-500/10"
                                    )}>
                                        {d.acted ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{d.decisionStatement}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                d.acted ? "text-emerald-400" : "text-slate-500"
                                            )}>
                                                {d.acted ? 'Executed' : d.optionChosen === 'DISMISSED' ? 'Dismissed' : 'Pending'}
                                            </span>
                                            <span className="text-[10px] text-slate-600">{timeAgo(d.createdAt)}</span>
                                        </div>
                                    </div>
                                    {d.runwayDelta !== null && d.runwayDelta !== undefined && (
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black",
                                            d.runwayDelta > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                        )}>
                                            {d.runwayDelta > 0 ? '+' : ''}{d.runwayDelta.toFixed(1)} mo runway
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}

                {/* Empty State */}
                {data.snapshots.length === 0 && recentDecisions.length === 0 && (
                    <div className="text-center py-20">
                        <Activity className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                        <h2 className="text-lg font-black text-slate-400 mb-2">No history yet</h2>
                        <p className="text-sm text-slate-600 mb-6">Your financial history will start building after your first CFO analysis.</p>
                        <button
                            onClick={() => router.push('/manual-input')}
                            className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
                        >
                            Enter Financials
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
