'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface ComparisonMetric {
    label: string;
    currentValue: number;
    previousValue: number;
    format: 'currency' | 'percentage' | 'number';
    goodDirection: 'up' | 'down'; // Is increase good or bad?
}

interface MonthlyComparisonProps {
    currentMonth: string;
    previousMonth: string;
    metrics: ComparisonMetric[];
}

export function MonthlyComparison({ currentMonth, previousMonth, metrics }: MonthlyComparisonProps) {
    const formatValue = (value: number, format: ComparisonMetric['format']) => {
        if (format === 'currency') {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
            return `₹${value}`;
        }
        if (format === 'percentage') return `${value}%`;
        return value.toLocaleString();
    };

    const getChangePercent = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    return (
        <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Month Comparison</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 rounded bg-white/5">{previousMonth}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary">{currentMonth}</span>
                </div>
            </div>

            <div className="space-y-4">
                {metrics.map((metric, i) => {
                    const change = metric.currentValue - metric.previousValue;
                    const changePercent = getChangePercent(metric.currentValue, metric.previousValue);
                    const isPositive = change > 0;
                    const isGood = (isPositive && metric.goodDirection === 'up') || (!isPositive && metric.goodDirection === 'down');
                    const isNeutral = change === 0;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {metric.label}
                                </span>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isNeutral ? 'bg-slate-500/20 text-slate-400' :
                                        isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                    {isNeutral ? (
                                        <Minus className="w-2 h-2" />
                                    ) : isPositive ? (
                                        <TrendingUp className="w-2 h-2" />
                                    ) : (
                                        <TrendingDown className="w-2 h-2" />
                                    )}
                                    {isNeutral ? '0' : `${isPositive ? '+' : ''}${changePercent.toFixed(1)}`}%
                                </div>
                            </div>

                            <div className="flex items-end justify-between">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-slate-500 text-sm line-through">
                                        {formatValue(metric.previousValue, metric.format)}
                                    </span>
                                    <span className="text-xl font-black text-white">
                                        {formatValue(metric.currentValue, metric.format)}
                                    </span>
                                </div>

                                {/* Mini bar comparison */}
                                <div className="flex items-end gap-1 h-8">
                                    <div
                                        className="w-3 bg-slate-600 rounded-t"
                                        style={{ height: `${Math.min((metric.previousValue / Math.max(metric.currentValue, metric.previousValue)) * 100, 100)}%` }}
                                    />
                                    <div
                                        className={`w-3 rounded-t ${isGood ? 'bg-emerald-500' : isNeutral ? 'bg-slate-500' : 'bg-rose-500'}`}
                                        style={{ height: `${Math.min((metric.currentValue / Math.max(metric.currentValue, metric.previousValue)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// Default comparison with mock data
export function DefaultMonthlyComparison() {
    const metrics: ComparisonMetric[] = [
        { label: 'Revenue', currentValue: 320000, previousValue: 272000, format: 'currency', goodDirection: 'up' },
        { label: 'Burn Rate', currentValue: 240000, previousValue: 210000, format: 'currency', goodDirection: 'down' },
        { label: 'Net Burn', currentValue: -80000, previousValue: -62000, format: 'currency', goodDirection: 'down' },
        { label: 'Runway', currentValue: 7.2, previousValue: 8.1, format: 'number', goodDirection: 'up' },
    ];

    return (
        <MonthlyComparison
            currentMonth="Jan 2026"
            previousMonth="Dec 2025"
            metrics={metrics}
        />
    );
}
