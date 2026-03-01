'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FileUpload } from '@/components/dashboard/file-upload';
import { DefaultMonthlyComparison } from '@/components/dashboard/monthly-comparison';
import { DefaultCashFlowForecast } from '@/components/dashboard/cash-flow-forecast';
import { ExpenseBreakdown } from '@/components/dashboard/expense-breakdown';
import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial-service';
import { useAuthStore } from '@/store/auth-store';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    FileSpreadsheet,
    Brain,
    Sparkles,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
    const user = useAuthStore((state) => state.user);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['financial-stats', user?.organizationId],
        queryFn: () => financialService.getStats(user?.organizationId || ''),
        enabled: !!user?.organizationId,
    });

    const metrics = [
        {
            label: 'Revenue Growth',
            value: '+18%',
            trend: 'up',
            change: 'vs last month',
            icon: TrendingUp,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            label: 'Burn Rate',
            value: '₹2.4L/mo',
            trend: 'up',
            change: '+15% MoM',
            icon: TrendingDown,
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
        },
        {
            label: 'Cash Runway',
            value: '7.2 mo',
            trend: 'down',
            change: '-0.5 from last month',
            icon: Calendar,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
        },
        {
            label: 'Expense Ratio',
            value: '68%',
            trend: 'stable',
            change: 'Revenue vs Expenses',
            icon: PieChart,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
    ];

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
                        <p className="text-slate-400 mt-2">Deep insights powered by AI analysis of your financial data.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary font-bold">AI-Enhanced Analytics</span>
                    </div>
                </header>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metrics.map((metric, i) => (
                        <div key={i} className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                            <div className="flex justify-between items-start mb-3">
                                <div className={cn("p-2 rounded-xl", metric.bgColor)}>
                                    <metric.icon className={cn("w-4 h-4", metric.color)} />
                                </div>
                                {metric.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                                {metric.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-rose-500" />}
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

                        {/* Revenue vs Expenses Chart */}
                        <div className="glass-card rounded-3xl p-8 min-h-[300px] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Revenue vs Expenses</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Revenue
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        Expenses
                                    </div>
                                </div>
                            </div>

                            {/* Chart Bars */}
                            <div className="flex items-end justify-between gap-3 mt-6" style={{ height: '180px' }}>
                                {[
                                    { month: 'Sep', revenue: 220000, expenses: 180000 },
                                    { month: 'Oct', revenue: 250000, expenses: 195000 },
                                    { month: 'Nov', revenue: 272000, expenses: 210000 },
                                    { month: 'Dec', revenue: 290000, expenses: 220000 },
                                    { month: 'Jan', revenue: 320000, expenses: 240000 },
                                    { month: 'Feb', revenue: 345000, expenses: 250000 },
                                ].map((data, i) => {
                                    const maxVal = 400000;
                                    const revenueHeight = Math.round((data.revenue / maxVal) * 160);
                                    const expenseHeight = Math.round((data.expenses / maxVal) * 160);
                                    return (
                                        <div key={data.month} className="flex-1 flex flex-col items-center">
                                            <div className="flex gap-1 items-end" style={{ height: '160px' }}>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: revenueHeight }}
                                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                                    className="w-5 bg-emerald-500 rounded-t cursor-pointer hover:bg-emerald-400 transition-colors"
                                                    title={`Revenue: ₹${(data.revenue / 100000).toFixed(1)}L`}
                                                />
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: expenseHeight }}
                                                    transition={{ duration: 0.5, delay: i * 0.1 + 0.05 }}
                                                    className="w-5 bg-rose-500 rounded-t cursor-pointer hover:bg-rose-400 transition-colors"
                                                    title={`Expenses: ₹${(data.expenses / 100000).toFixed(1)}L`}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold mt-2">{data.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AI Insights */}
                        <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <Brain className="w-5 h-5 text-primary" />
                                </div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest">AI-Generated Insights</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        💡 <strong>SaaS Optimization:</strong> Your subscriptions increased 23% this quarter. Consider auditing for unused Figma and Notion seats.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        📊 <strong>Revenue Concentration:</strong> Top 3 clients contribute 68% of revenue. Diversification recommended to reduce risk.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        🚀 <strong>Growth Trajectory:</strong> At current growth rate (18% MoM), you'll reach profitability in ~8 months.
                                    </p>
                                </div>
                            </div>
                        </div>
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

                        {/* Quick Stats */}
                        <div className="glass-card rounded-3xl p-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Quick Stats</h4>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Total Revenue</span>
                                        <span className="text-sm font-bold text-white">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.totalRevenue || 320000)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Monthly Burn</span>
                                        <span className="text-sm font-bold text-rose-500">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.monthlyBurn || 240000)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Cash Runway</span>
                                        <span className="text-sm font-bold text-emerald-500">{stats?.cashRunway || '7.2 Months'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Gross Margin</span>
                                        <span className="text-sm font-bold text-primary">72%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
