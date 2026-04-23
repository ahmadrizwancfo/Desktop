'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Wallet, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState } from '@/store/cfo-state-store';

interface KeyMetricsProps {
    state: CFOState;
}

export function KeyMetrics({ state }: KeyMetricsProps) {
    const { summary, delta, dashboardMode } = state;

    const fmt = (n: number) => {
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${Math.round(n)}`;
    };

    const getDelta = (curr: number, prev: number | null) => {
        if (prev === null || prev === 0) return null;
        const diff = curr - prev;
        const pct = (diff / prev) * 100;
        return { diff, pct, direction: diff > 0 ? 'up' : 'down' };
    };

    const metrics = [
        {
            label: 'Real Runway',
            value: summary.isSustainable ? 'Sustainable' : (summary.runwayMonths >= 36 ? '> 36 months' : `${summary.runwayMonths.toFixed(1)} months`),
            subValue: summary.isSustainable ? 'Capital is not your constraint' : `Includes 18% buffer (-${fmt(summary.ghostLiabilities)})`,
            icon: Clock,
            trend: delta.prevRunwayMonths ? getDelta(summary.runwayMonths, delta.prevRunwayMonths) : null,
            color: summary.isSustainable || summary.runwayMonths >= 12 ? 'text-emerald-400' : summary.runwayMonths >= 6 ? 'text-amber-400' : 'text-rose-400',
        },
        {
            label: 'Monthly Net Burn',
            value: fmt(summary.netBurn),
            subValue: `30d Avg: ${fmt(summary.prevNetBurn > 0 ? summary.prevNetBurn : summary.netBurn)}`,
            icon: TrendingDown,
            trend: delta.prevNetBurn !== null ? getDelta(summary.netBurn, delta.prevNetBurn) : null,
            invertTrend: true, // Up is bad for burn
            color: 'text-white'
        },
        {
            label: 'Monthly Revenue',
            value: fmt(summary.monthlyRevenue),
            icon: TrendingUp,
            trend: delta.prevRevenue !== null ? getDelta(summary.monthlyRevenue, delta.prevRevenue) : null,
            color: 'text-white'
        },
        {
            label: 'Cash in Bank',
            value: fmt(summary.cashInBank),
            icon: Wallet,
            color: 'text-white'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8 pb-8 border-b border-white/5">
            {metrics.map((m, i) => (
                <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 relative group"
                >
                    <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors">
                            <m.icon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        {m.trend && (
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
                                (m.trend.direction === 'up' && !m.invertTrend) || (m.trend.direction === 'down' && m.invertTrend)
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                            )}>
                                {m.trend.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(m.trend.pct).toFixed(0)}%
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
                            {m.label}
                        </div>
                        <div className={cn("text-2xl font-black tracking-tighter", m.color)}>
                            {m.value}
                        </div>
                        {m.subValue && (
                            <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                {m.subValue}
                            </div>
                        )}
                        {m.trend && !(m.label.toLowerCase().includes('runway') && summary.isSustainable) && (
                            <div className="text-[10px] font-medium text-slate-500 mt-1">
                                {m.trend.direction === 'up' ? 'Increase' : 'Decrease'} from {m.label.toLowerCase().includes('runway') ? 'last month' : 'last check'}
                            </div>
                        )}
                    </div>

                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
            ))}
        </div>
    );
}
