'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FileUpload } from '@/components/dashboard/file-upload';
import { DefaultMonthlyComparison } from '@/components/dashboard/monthly-comparison';
import { DefaultCashFlowForecast } from '@/components/dashboard/cash-flow-forecast';
import { ExpenseBreakdown } from '@/components/dashboard/expense-breakdown';
import { useCFOState, formatCurrency, getTimeSince } from '@/store/cfo-state-store';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    Loader2,
    FileSpreadsheet,
    Brain,
    Sparkles,
    Wallet,
    Flame,
    Clock,
    AlertTriangle,
    Database,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
    const { data: cfoState, isLoading, isError } = useCFOState();

    // Derive metrics from CFOState — no hardcoded data
    const metrics = cfoState ? [
        {
            label: 'Cash in Bank',
            value: formatCurrency(cfoState.summary.cashInBank),
            trend: cfoState.delta.cashChangeAmount !== null ? (cfoState.delta.cashChangeAmount >= 0 ? 'up' : 'down') : 'stable',
            change: cfoState.delta.cashChangeAmount !== null
                ? `${cfoState.delta.cashChangeAmount >= 0 ? '+' : ''}${formatCurrency(cfoState.delta.cashChangeAmount)} vs last period`
                : 'No historical data',
            icon: Wallet,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            label: 'Monthly Burn',
            value: formatCurrency(cfoState.summary.netBurn),
            trend: cfoState.summary.burnTrend === 'increasing' ? 'up' : cfoState.summary.burnTrend === 'decreasing' ? 'good' : 'stable',
            change: cfoState.delta.burnChangePercent !== null
                ? `${cfoState.delta.burnChangePercent >= 0 ? '+' : ''}${cfoState.delta.burnChangePercent.toFixed(1)}% vs last period`
                : cfoState.summary.burnTrend,
            icon: Flame,
            color: cfoState.summary.burnTrend === 'increasing' ? 'text-rose-500' : 'text-amber-500',
            bgColor: cfoState.summary.burnTrend === 'increasing' ? 'bg-rose-500/10' : 'bg-amber-500/10',
        },
        {
            label: 'Runway',
            value: cfoState.deathClock.daysLeft !== null ? `${Math.round(cfoState.deathClock.daysLeft / 30)} mo` : 'N/A',
            trend: cfoState.delta.runwayChangeDays !== null ? (cfoState.delta.runwayChangeDays >= 0 ? 'up' : 'down') : 'stable',
            change: cfoState.delta.runwayChangeDays !== null
                ? `${cfoState.delta.runwayChangeDays >= 0 ? '+' : ''}${cfoState.delta.runwayChangeDays} days vs last period`
                : 'No historical data',
            icon: Clock,
            color: (cfoState.deathClock.daysLeft !== null && cfoState.deathClock.daysLeft < 180) ? 'text-rose-500' : 'text-emerald-500',
            bgColor: (cfoState.deathClock.daysLeft !== null && cfoState.deathClock.daysLeft < 180) ? 'bg-rose-500/10' : 'bg-emerald-500/10',
        },
        {
            label: 'Receivables',
            value: formatCurrency(cfoState.receivables.totalOutstanding),
            trend: cfoState.receivables.totalOutstanding > 0 ? 'pending' : 'clear',
            change: cfoState.receivables.expectedInflows.length > 0
                ? `${cfoState.receivables.expectedInflows.length} expected inflows`
                : 'No pending inflows',
            icon: TrendingUp,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
    ] : [];

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            Financial Analytics
                        </h1>
                        <p className="text-slate-400 mt-2">Insights powered by your real financial data.</p>
                    </div>
                    {cfoState && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                            <RefreshCw className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] text-slate-500 font-bold">
                                Data: {getTimeSince(cfoState.trust.lastSyncedAt)}
                            </span>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                cfoState.trust.dataQuality === 'high' ? 'bg-emerald-500' :
                                    cfoState.trust.dataQuality === 'medium' ? 'bg-amber-500' : 'bg-rose-500'
                            )} />
                        </div>
                    )}
                </header>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <div className="glass-card rounded-3xl p-12 text-center border-rose-500/20">
                        <AlertTriangle className="w-12 h-12 text-rose-500/50 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Unable to load analytics</h2>
                        <p className="text-slate-400">Ensure your backend is running and financial data is connected.</p>
                    </div>
                )}

                {/* No Data State */}
                {cfoState?.noData && (
                    <div className="glass-card rounded-3xl p-12 text-center border-dashed border-white/10">
                        <Database className="w-16 h-16 text-slate-500/30 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-3">No Financial Data Yet</h2>
                        <p className="text-slate-400 max-w-md mx-auto mb-8">
                            Connect your bank account or upload a CSV to see real analytics powered by your actual financial data.
                        </p>
                        <a href="/integrations" className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all inline-flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Connect Data Source
                        </a>
                    </div>
                )}

                {/* Main Content — only shown when we have real data */}
                {cfoState && !cfoState.noData && (
                    <>
                        {/* Quick Metrics — derived from CFOState */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {metrics.map((metric, i) => (
                                <div key={i} className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={cn("p-2 rounded-xl", metric.bgColor)}>
                                            <metric.icon className={cn("w-4 h-4", metric.color)} />
                                        </div>
                                        {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                        {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{metric.label}</p>
                                    <p className="text-xl font-black text-white">{metric.value}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{metric.change}</p>
                                </div>
                            ))}
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column - Forecasts & Charts */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Cash Flow Forecast */}
                                <DefaultCashFlowForecast />

                                {/* Category Breakdown from CFOState */}
                                {cfoState.categoryBreakdown.length > 0 && (
                                    <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Expense by Category</h3>
                                        <div className="space-y-3">
                                            {cfoState.categoryBreakdown.slice(0, 6).map((cat, i) => (
                                                <div key={cat.category} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className="w-2 h-2 rounded-full bg-primary" style={{ opacity: 1 - (i * 0.12) }} />
                                                        <span className="text-sm text-white font-medium flex-1">{cat.category}</span>
                                                        <span className="text-xs text-slate-500">{cat.pct.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-32 ml-4">
                                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${cat.pct}%` }}
                                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                                                className="h-full bg-primary rounded-full"
                                                                style={{ opacity: 1 - (i * 0.12) }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-white font-bold ml-4 w-20 text-right">
                                                        {formatCurrency(cat.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Insights from CFOState */}
                                {cfoState.insights.length > 0 && (
                                    <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-primary/20 rounded-xl">
                                                <Brain className="w-5 h-5 text-primary" />
                                            </div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">AI-Generated Insights</h4>
                                        </div>
                                        <div className="space-y-3">
                                            {cfoState.insights.slice(0, 4).map((insight, i) => (
                                                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex items-start gap-2">
                                                        <span className={cn(
                                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase mt-0.5 shrink-0",
                                                            insight.severity === 'critical' ? "bg-rose-500/20 text-rose-400" :
                                                                insight.severity === 'high' ? "bg-amber-500/20 text-amber-400" :
                                                                    "bg-primary/20 text-primary"
                                                        )}>
                                                            {insight.type}
                                                        </span>
                                                        <div>
                                                            <p className="text-xs text-white font-bold">{insight.title}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{insight.body}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Monthly Comparison */}
                                <DefaultMonthlyComparison />

                                {/* Expense Breakdown */}
                                <ExpenseBreakdown />

                                {/* Import Data */}
                                <div className="glass-card rounded-3xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                                            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Import Data</h3>
                                            <p className="text-[10px] text-slate-500">Tally, Excel, CSV</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-4">
                                        Upload financial documents for instant AI-powered analysis.
                                    </p>
                                    <FileUpload />
                                </div>

                                {/* CFOState Summary */}
                                <div className="glass-card rounded-3xl p-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Financial Summary</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Monthly Revenue</span>
                                            <span className="text-sm font-bold text-white">
                                                {formatCurrency(cfoState.summary.monthlyRevenue)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Monthly Expenses</span>
                                            <span className="text-sm font-bold text-rose-500">
                                                {formatCurrency(cfoState.summary.monthlyExpenses)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Net Burn</span>
                                            <span className={cn("text-sm font-bold", cfoState.summary.netBurn > 0 ? 'text-rose-500' : 'text-emerald-500')}>
                                                {formatCurrency(cfoState.summary.netBurn)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">Runway</span>
                                            <span className="text-sm font-bold text-emerald-500">
                                                {cfoState.summary.runwayMonths.toFixed(1)} months
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
