'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Zap,
    Clock,
    DollarSign,
    TrendingUp,
    Loader2,
    Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

interface UsageSummary {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    avgLatencyMs: number;
    cacheHitRate: number;
    topEndpoints: { endpoint: string; count: number }[];
    usageByDay: { date: string; calls: number; tokens: number; cost: number }[];
}

interface AiAnalytics {
    usage: UsageSummary;
    realtime: {
        callsLastHour: number;
        tokensLastHour: number;
        costLastHour: number;
        currentRpm: number;
    };
    costEstimates: {
        dailyAverage: number;
        monthlyProjected: number;
        budgetRecommendation: string;
    };
}

export function AiAnalyticsWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['ai-analytics'],
        queryFn: async () => {
            const res = await apiClient.get('/ai/analytics');
            return res.data as AiAnalytics;
        },
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const analytics = data;
    if (!analytics) return null;

    const stats = [
        {
            label: 'API Calls',
            value: analytics.usage.totalCalls.toLocaleString(),
            subValue: `${analytics.usage.successfulCalls} successful`,
            icon: Zap,
            color: 'text-primary',
            bg: 'bg-primary/10',
        },
        {
            label: 'Tokens Used',
            value: analytics.usage.totalTokens >= 1000
                ? `${(analytics.usage.totalTokens / 1000).toFixed(1)}K`
                : analytics.usage.totalTokens.toString(),
            subValue: `${(analytics.usage.cacheHitRate).toFixed(0)}% cached`,
            icon: Activity,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Avg Latency',
            value: `${analytics.usage.avgLatencyMs}ms`,
            subValue: `${analytics.realtime.currentRpm} req/min`,
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
        },
        {
            label: 'Total Cost',
            value: `₹${analytics.usage.totalCost.toFixed(2)}`,
            subValue: `~₹${analytics.costEstimates.monthlyProjected.toFixed(0)}/mo projected`,
            icon: DollarSign,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
        },
    ];

    return (
        <div className="glass-card rounded-3xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">AI Usage Analytics</h3>
                        <p className="text-xs text-slate-500">Last 30 days</p>
                    </div>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Live</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                                    <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                                </div>
                                <span className="text-xs text-slate-500">{stat.label}</span>
                            </div>
                            <div className={cn("text-xl font-bold", stat.color)}>
                                {stat.value}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">
                                {stat.subValue}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Usage Chart */}
            {analytics.usage.usageByDay.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-4">Daily Usage</h4>
                    <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.usage.usageByDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric' })}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#f8fafc' }}
                                    formatter={(value, name) => [
                                        String(name) === 'cost' ? `₹${Number(value || 0).toFixed(3)}` : value,
                                        String(name).charAt(0).toUpperCase() + String(name).slice(1)
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="calls"
                                    stroke="#6366F1"
                                    fill="url(#colorCalls)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Top Endpoints */}
            {analytics.usage.topEndpoints.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Top Endpoints</h4>
                    <div className="space-y-2">
                        {analytics.usage.topEndpoints.slice(0, 5).map((endpoint, i) => {
                            const maxCount = analytics.usage.topEndpoints[0]?.count || 1;
                            const percentage = (endpoint.count / maxCount) * 100;

                            return (
                                <div key={endpoint.endpoint} className="relative">
                                    <div
                                        className="absolute inset-0 rounded-lg bg-primary/10"
                                        style={{ width: `${percentage}%` }}
                                    />
                                    <div className="relative flex items-center justify-between p-2 rounded-lg">
                                        <span className="text-xs text-slate-300 font-mono">
                                            /ai/{endpoint.endpoint}
                                        </span>
                                        <span className="text-xs font-bold text-primary">
                                            {endpoint.count}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Budget Recommendation */}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5" />
                    <p className="text-xs text-amber-200">
                        {analytics.costEstimates.budgetRecommendation}
                    </p>
                </div>
            </div>
        </div>
    );
}
