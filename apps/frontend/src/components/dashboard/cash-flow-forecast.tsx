'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, Zap } from 'lucide-react';

interface ForecastMonth {
    month: string;
    projectedCash: number;
    revenue: number;
    expenses: number;
    netFlow: number;
    events?: { type: 'income' | 'expense'; label: string; amount: number }[];
}

interface CashFlowForecastProps {
    forecasts: ForecastMonth[];
    currentCash: number;
}

export function CashFlowForecast({ forecasts, currentCash }: CashFlowForecastProps) {
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

    const formatCurrency = (amount: number) => {
        const abs = Math.abs(amount);
        if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (abs >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
        return `₹${amount}`;
    };

    // Ensure we have valid data
    const allCashValues = [currentCash, ...forecasts.map(f => f.projectedCash)];
    const maxCash = Math.max(...allCashValues);
    const minCash = Math.min(...allCashValues, 0);
    const range = maxCash - minCash || 1; // Prevent division by zero

    const getBarHeight = (value: number) => {
        // Calculate percentage height with a minimum of 5% for visibility
        const height = ((value - minCash) / range) * 100;
        return Math.max(height, 5);
    };

    const getCashZoneAtMonth = (monthIndex: number) => {
        const cash = monthIndex === -1 ? currentCash : forecasts[monthIndex].projectedCash;
        if (cash <= 0) return 'critical';
        if (cash < currentCash * 0.25) return 'danger';
        if (cash < currentCash * 0.5) return 'warning';
        return 'healthy';
    };

    const zoneColors = {
        healthy: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-rose-500',
        critical: 'bg-rose-600',
    };

    const zoneBgColors = {
        healthy: 'bg-emerald-500/10',
        warning: 'bg-amber-500/10',
        danger: 'bg-rose-500/10',
        critical: 'bg-rose-500/20',
    };

    // Find month where cash goes critical
    const criticalMonth = forecasts.findIndex(f => f.projectedCash <= 0);

    return (
        <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cash Forecast</h3>
                    <p className="text-xs text-slate-500 mt-1">Next 6 months projection</p>
                </div>
                {criticalMonth !== -1 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        Cash depletes in {criticalMonth + 1} months
                    </div>
                )}
            </div>

            {/* Forecast Chart */}
            <div className="relative mb-4" style={{ height: '192px' }}>
                {/* Zero line if applicable */}
                {minCash < 0 && (
                    <div
                        className="absolute left-0 right-0 border-t border-dashed border-rose-500/50"
                        style={{ bottom: `${getBarHeight(0)}%` }}
                    >
                        <span className="absolute -left-1 -top-2.5 text-[10px] text-rose-400">₹0</span>
                    </div>
                )}

                <div className="flex items-end justify-between gap-2 px-4" style={{ height: '160px' }}>
                    {/* Current month indicator */}
                    <div
                        className="flex flex-col items-center flex-1"
                        onMouseEnter={() => setHoveredMonth(-1)}
                        onMouseLeave={() => setHoveredMonth(null)}
                    >
                        <motion.div
                            className={`w-full max-w-[40px] rounded-t-lg ${zoneColors[getCashZoneAtMonth(-1)]} cursor-pointer hover:opacity-80 transition-opacity`}
                            initial={{ height: 0 }}
                            animate={{ height: Math.round(getBarHeight(currentCash) * 1.4) }}
                            transition={{ duration: 0.5 }}
                        />
                        <span className="text-[10px] text-slate-500 mt-2">Now</span>
                    </div>

                    {forecasts.map((forecast, i) => {
                        const zone = getCashZoneAtMonth(i);
                        const barHeight = Math.round(getBarHeight(forecast.projectedCash) * 1.4);
                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center flex-1"
                                onMouseEnter={() => setHoveredMonth(i)}
                                onMouseLeave={() => setHoveredMonth(null)}
                            >
                                <motion.div
                                    className={`w-full max-w-[40px] rounded-t-lg ${zoneColors[zone]} cursor-pointer hover:opacity-80 transition-opacity relative`}
                                    initial={{ height: 0 }}
                                    animate={{ height: Math.max(barHeight, 8) }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                >
                                    {/* Event indicators */}
                                    {forecast.events && forecast.events.length > 0 && (
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                            <Zap className="w-3 h-3 text-amber-400" />
                                        </div>
                                    )}
                                </motion.div>
                                <span className="text-[10px] text-slate-500 mt-2">{forecast.month}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hover Detail */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredMonth !== null ? 1 : 0 }}
                className={`p-4 rounded-xl ${hoveredMonth !== null ? zoneBgColors[getCashZoneAtMonth(hoveredMonth)] : ''} transition-colors`}
            >
                {hoveredMonth !== null && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                                {hoveredMonth === -1 ? 'Current' : forecasts[hoveredMonth].month}
                            </span>
                            <span className="text-lg font-black text-white">
                                {formatCurrency(hoveredMonth === -1 ? currentCash : forecasts[hoveredMonth].projectedCash)}
                            </span>
                        </div>

                        {hoveredMonth !== -1 && (
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase">Revenue</p>
                                    <p className="text-sm font-bold text-emerald-400">+{formatCurrency(forecasts[hoveredMonth].revenue)}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase">Expenses</p>
                                    <p className="text-sm font-bold text-rose-400">-{formatCurrency(forecasts[hoveredMonth].expenses)}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase">Net</p>
                                    <p className={`text-sm font-bold ${forecasts[hoveredMonth].netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {forecasts[hoveredMonth].netFlow >= 0 ? '+' : ''}{formatCurrency(forecasts[hoveredMonth].netFlow)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {hoveredMonth !== -1 && forecasts[hoveredMonth].events && (
                            <div className="space-y-1">
                                {forecasts[hoveredMonth].events!.map((event, j) => (
                                    <div key={j} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400">{event.label}</span>
                                        <span className={event.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                                            {event.type === 'income' ? '+' : '-'}{formatCurrency(event.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {hoveredMonth === null && (
                    <p className="text-xs text-slate-500 text-center">Hover over bars for details</p>
                )}
            </motion.div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[10px] text-slate-500">Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-[10px] text-slate-500">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-[10px] text-slate-500">Danger</span>
                </div>
            </div>
        </div>
    );
}

// Default forecast with mock data
export function DefaultCashFlowForecast() {
    const forecasts: ForecastMonth[] = [
        { month: 'Feb', projectedCash: 1720000, revenue: 320000, expenses: 400000, netFlow: -80000 },
        { month: 'Mar', projectedCash: 1440000, revenue: 340000, expenses: 420000, netFlow: -80000, events: [{ type: 'expense', label: 'GST Payment', amount: 100000 }] },
        { month: 'Apr', projectedCash: 1160000, revenue: 360000, expenses: 440000, netFlow: -80000 },
        { month: 'May', projectedCash: 880000, revenue: 380000, expenses: 460000, netFlow: -80000, events: [{ type: 'expense', label: 'Annual AWS', amount: 150000 }] },
        { month: 'Jun', projectedCash: 600000, revenue: 400000, expenses: 480000, netFlow: -80000 },
        { month: 'Jul', projectedCash: 320000, revenue: 420000, expenses: 500000, netFlow: -80000 },
    ];

    return <CashFlowForecast forecasts={forecasts} currentCash={2000000} />;
}
