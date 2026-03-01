'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    Loader2,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    Legend
} from 'recharts';

interface ScenarioData {
    month: string;
    balance: number;
    revenue: number;
    expenses: number;
    runway: number;
}

interface Prediction {
    scenarios: { name: string; data: ScenarioData[] }[];
    riskFactors: string[];
    recommendations: string[];
}

const scenarioColors = {
    optimistic: { stroke: '#10B981', fill: '#10B98120' },
    realistic: { stroke: '#6366F1', fill: '#6366F120' },
    pessimistic: { stroke: '#EF4444', fill: '#EF444420' },
};

export function PredictionsWidget() {
    const [activeScenario, setActiveScenario] = React.useState<string>('all');

    const { data, isLoading } = useQuery({
        queryKey: ['predictions'],
        queryFn: async () => {
            const res = await apiClient.get('/ai/predictions?months=6');
            return res.data as Prediction;
        },
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-slate-400">AI is analyzing your financials...</p>
                </div>
            </div>
        );
    }

    const predictions = data;
    if (!predictions) return null;

    // Format currency for tooltip
    const formatCurrency = (value: number) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        return `₹${(value / 1000).toFixed(0)}K`;
    };

    // Prepare chart data
    const chartData = predictions.scenarios[0]?.data.map((_, index) => {
        const point: any = { month: predictions.scenarios[0].data[index].month };
        predictions.scenarios.forEach((scenario) => {
            point[scenario.name] = scenario.data[index]?.balance || 0;
        });
        return point;
    }) || [];

    return (
        <div className="glass-card rounded-3xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Cash Flow Predictions</h3>
                        <p className="text-xs text-slate-500">6-month AI forecast</p>
                    </div>
                </div>

                {/* Scenario Toggle */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    {['all', 'optimistic', 'realistic', 'pessimistic'].map((scenario) => (
                        <button
                            key={scenario}
                            onClick={() => setActiveScenario(scenario)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                                activeScenario === scenario
                                    ? "bg-primary text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            {scenario === 'all' ? 'All' : scenario.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[250px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            {Object.entries(scenarioColors).map(([name, colors]) => (
                                <linearGradient key={name} id={`gradient-${name}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis
                            dataKey="month"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            }}
                            labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                            formatter={(value, name) => [formatCurrency(Number(value) || 0), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                        />
                        {Object.entries(scenarioColors).map(([name, colors]) => (
                            (activeScenario === 'all' || activeScenario === name) && (
                                <Area
                                    key={name}
                                    type="monotone"
                                    dataKey={name}
                                    stroke={colors.stroke}
                                    fill={`url(#gradient-${name})`}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2 }}
                                />
                            )
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Scenario Legend */}
            <div className="flex justify-center gap-6 mb-6">
                {predictions.scenarios.map((scenario) => {
                    const colors = scenarioColors[scenario.name as keyof typeof scenarioColors];
                    const lastData = scenario.data[scenario.data.length - 1];
                    const Icon = scenario.name === 'optimistic' ? TrendingUp :
                        scenario.name === 'pessimistic' ? TrendingDown : Target;

                    return (
                        <div
                            key={scenario.name}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer",
                                activeScenario === scenario.name || activeScenario === 'all'
                                    ? "bg-white/5"
                                    : "opacity-40"
                            )}
                            onClick={() => setActiveScenario(scenario.name)}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors.stroke }}
                            />
                            <span className="text-xs font-medium text-white capitalize">
                                {scenario.name}
                            </span>
                            <span className="text-xs text-slate-500">
                                {formatCurrency(lastData?.balance || 0)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Risk Factors & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk Factors */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-bold text-rose-400">Risk Factors</span>
                    </div>
                    <ul className="space-y-2">
                        {predictions.riskFactors.slice(0, 3).map((risk, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-rose-400 mt-0.5">•</span>
                                {risk}
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* Recommendations */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-400">Recommendations</span>
                    </div>
                    <ul className="space-y-2">
                        {predictions.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
