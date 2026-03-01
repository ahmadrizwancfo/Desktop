'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle, Lightbulb, BarChart3 } from 'lucide-react';

interface DrillDownData {
    metric: string;
    value: number;
    change: number;
    changePercent: number;
    contributors: {
        category: string;
        amount: number;
        change: number;
        type: 'one-time' | 'recurring';
        icon?: string;
    }[];
    trend: { month: string; value: number }[];
    aiInsight?: string;
}

interface WhyDrillDownProps {
    metric: string;
    label: string;
    value: string;
    change: number;
    changePercent: number;
    isPositive?: boolean; // true = increase is good (revenue), false = increase is bad (burn)
}

// Mock data generator - in production this would come from API
function generateDrillDownData(metric: string): DrillDownData {
    const mockData: Record<string, DrillDownData> = {
        burn: {
            metric: 'burn',
            value: 240000,
            change: 36000,
            changePercent: 18,
            contributors: [
                { category: 'SaaS Subscriptions', amount: 45000, change: 45000, type: 'recurring', icon: '💻' },
                { category: 'AWS Infrastructure', amount: 12000, change: 12000, type: 'one-time', icon: '☁️' },
                { category: 'Office Supplies', amount: 8000, change: 8000, type: 'one-time', icon: '📦' },
                { category: 'Payroll', amount: 150000, change: 0, type: 'recurring', icon: '👥' },
                { category: 'Marketing', amount: 25000, change: -5000, type: 'recurring', icon: '📣' },
            ],
            trend: [
                { month: 'Nov', value: 190000 },
                { month: 'Dec', value: 210000 },
                { month: 'Jan', value: 240000 },
            ],
            aiInsight: 'SaaS spend increased 28% this month. Consider reviewing unused subscriptions like Figma extra seats and Notion Team plan.',
        },
        revenue: {
            metric: 'revenue',
            value: 320000,
            change: 48000,
            changePercent: 18,
            contributors: [
                { category: 'Enterprise Deals', amount: 180000, change: 30000, type: 'recurring', icon: '🏢' },
                { category: 'SMB Subscriptions', amount: 95000, change: 12000, type: 'recurring', icon: '🏬' },
                { category: 'Professional Services', amount: 45000, change: 6000, type: 'one-time', icon: '🛠️' },
            ],
            trend: [
                { month: 'Nov', value: 250000 },
                { month: 'Dec', value: 272000 },
                { month: 'Jan', value: 320000 },
            ],
            aiInsight: 'Enterprise deals driving growth. Consider upselling to existing SMB customers for additional 15% MRR boost.',
        },
        expenses: {
            metric: 'expenses',
            value: 195000,
            change: 22000,
            changePercent: 13,
            contributors: [
                { category: 'Professional Fees', amount: 45000, change: 15000, type: 'recurring', icon: '⚖️' },
                { category: 'Rent', amount: 80000, change: 0, type: 'recurring', icon: '🏠' },
                { category: 'Utilities', amount: 12000, change: 2000, type: 'recurring', icon: '💡' },
                { category: 'Travel', amount: 28000, change: 8000, type: 'one-time', icon: '✈️' },
                { category: 'Insurance', amount: 30000, change: -3000, type: 'recurring', icon: '🛡️' },
            ],
            trend: [
                { month: 'Nov', value: 165000 },
                { month: 'Dec', value: 173000 },
                { month: 'Jan', value: 195000 },
            ],
            aiInsight: 'Professional fees up due to legal review. Travel expenses were one-time for client onboarding.',
        },
    };

    return mockData[metric] || mockData.burn;
}

export function WhyDrillDown({ metric, label, value, change, changePercent, isPositive = true }: WhyDrillDownProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [data, setData] = useState<DrillDownData | null>(null);

    const handleExpand = () => {
        if (!isExpanded && !data) {
            // In production, fetch from API: apiClient.get(`/financial-metrics/breakdown/${metric}`)
            setData(generateDrillDownData(metric));
        }
        setIsExpanded(!isExpanded);
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    const isChangeGood = isPositive ? change > 0 : change < 0;
    const maxTrendValue = data ? Math.max(...data.trend.map(t => t.value)) : 0;

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Main Metric Row */}
            <div
                className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={handleExpand}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{label}</p>
                        <p className="text-2xl font-black text-white mt-1">{value}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${isChangeGood
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                            {change > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            {change > 0 ? '+' : ''}{changePercent}%
                        </div>
                        <button className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && data && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-5">
                            {/* Why Section */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Why did this {change > 0 ? 'increase' : 'decrease'}?
                                </p>

                                <div className="space-y-2">
                                    {data.contributors
                                        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                                        .slice(0, 5)
                                        .map((contributor, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{contributor.icon}</span>
                                                    <div>
                                                        <p className="text-sm text-white font-medium">{contributor.category}</p>
                                                        <p className="text-xs text-slate-500">{formatCurrency(contributor.amount)}/mo</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${contributor.change > 0
                                                            ? (isPositive ? 'text-emerald-400' : 'text-rose-400')
                                                            : contributor.change < 0
                                                                ? (isPositive ? 'text-rose-400' : 'text-emerald-400')
                                                                : 'text-slate-500'
                                                        }`}>
                                                        {contributor.change > 0 ? '+' : ''}{formatCurrency(contributor.change)}
                                                    </p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${contributor.type === 'one-time'
                                                            ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-sky-500/10 text-sky-400'
                                                        }`}>
                                                        {contributor.type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Trend Section */}
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-3 h-3" />
                                    Last 3 Months Trend
                                </p>
                                <div className="flex items-end gap-2 h-20">
                                    {data.trend.map((point, i) => {
                                        const height = (point.value / maxTrendValue) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className={`w-full rounded-lg ${i === data.trend.length - 1
                                                            ? 'bg-primary'
                                                            : 'bg-white/10'
                                                        }`}
                                                />
                                                <p className="text-[10px] text-slate-500">{point.month}</p>
                                                <p className="text-xs text-white font-bold">{formatCurrency(point.value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Insight */}
                            {data.aiInsight && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <p className="text-xs text-primary font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Lightbulb className="w-3 h-3" />
                                        AI Insight
                                    </p>
                                    <p className="text-sm text-white">{data.aiInsight}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
