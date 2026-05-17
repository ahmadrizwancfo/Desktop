'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Wallet, Clock, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCfoStateStore, CFOState, formatRunway, formatCurrency } from '@/store/cfo-state-store';
import { Shield, ShieldAlert, Info } from 'lucide-react';

interface KeyMetricsProps {
    state: CFOState;
}

export function KeyMetrics({ state }: KeyMetricsProps) {
    const { summary, delta, cashForecast } = state;
    const isTaxBufferUnlocked = useCfoStateStore(s => s.isTaxBufferUnlocked);
    const toggleTaxBuffer = useCfoStateStore(s => s.toggleTaxBuffer);

    const isCrisis = summary.runwayMonths < 3 && summary.runwayMonths > 0;
    
    // Statutory Logic (18% GST + 10% TDS)
    const gstBuffer = summary.cashInBank * 0.18;
    const tdsBuffer = summary.cashInBank * 0.10;
    const totalStatutoryBuffer = gstBuffer + tdsBuffer;
    
    const spendableCash = isTaxBufferUnlocked ? summary.cashInBank : (summary.cashInBank - totalStatutoryBuffer);
    const displayedRunwayMonths = isTaxBufferUnlocked ? (summary.runwayMonths / 0.72) : summary.runwayMonths;

    const fmt = formatCurrency;

    const metrics = [
        {
            label: 'LIQUID RUNWAY',
            value: formatRunway(displayedRunwayMonths),
            subValue: isTaxBufferUnlocked ? 'OPERATING ON TAX RESERVES' : (isCrisis ? 'CRITICAL: UNDER 90 DAYS' : `28% Tax Buffer Applied`),
            icon: Clock,
            trend: [40, 35, 45, 50, 48, 55, 60], 
            health: isTaxBufferUnlocked ? 'red' : (summary.isSustainable || summary.runwayMonths > 6 ? 'green' : summary.runwayMonths > 3 ? 'yellow' : 'red'),
            color: isTaxBufferUnlocked ? 'text-rose-500' : 'text-white'
        },
        {
            label: 'MONTHLY NET BURN',
            value: fmt(summary.netBurn),
            subValue: delta.prevNetBurn ? `${delta.prevNetBurn > summary.netBurn ? '↓' : '↑'} ${Math.abs(Math.round(((summary.netBurn - delta.prevNetBurn) / delta.prevNetBurn) * 100))}% vs last month` : undefined,
            subValueColor: delta.prevNetBurn && summary.netBurn < delta.prevNetBurn ? 'text-emerald-400' : 'text-rose-400',
            icon: TrendingDown,
            trend: [60, 55, 58, 50, 45, 42, 40], 
            health: summary.netBurn <= 0 ? 'green' : (delta.prevNetBurn && summary.netBurn < delta.prevNetBurn ? 'yellow' : 'red'),
            color: 'text-white'
        },
        {
            label: 'MONTHLY REVENUE',
            value: fmt(summary.monthlyRevenue),
            subValue: delta.prevRevenue ? `${delta.prevRevenue < summary.monthlyRevenue ? '↑' : '↓'} ${Math.abs(Math.round(((summary.monthlyRevenue - delta.prevRevenue) / delta.prevRevenue) * 100))}% vs last month` : undefined,
            subValueColor: delta.prevRevenue && summary.monthlyRevenue > delta.prevRevenue ? 'text-emerald-400' : 'text-rose-400',
            icon: TrendingUp,
            trend: [30, 35, 40, 42, 45, 48, 55], 
            health: delta.prevRevenue && summary.monthlyRevenue > delta.prevRevenue ? 'green' : 'yellow',
            color: 'text-white'
        },
        {
            label: isTaxBufferUnlocked ? 'UNLOCKED CASH' : 'SPENDABLE CASH',
            value: fmt(spendableCash),
            subValue: isTaxBufferUnlocked ? 'Statutory Protection: OFF' : `GOI Reserves: ${fmt(totalStatutoryBuffer)}`,
            subValueColor: isTaxBufferUnlocked ? 'text-rose-500 font-black' : 'text-indigo-400',
            icon: Wallet,
            trend: cashForecast?.next30Days || [70, 68, 65, 60, 58, 55, 52], 
            health: isTaxBufferUnlocked ? 'red' : (summary.runwayMonths > 3 ? 'green' : 'yellow'),
            color: isTaxBufferUnlocked ? 'text-rose-500' : 'text-white'
        }
    ];

    return (
        <div className="flex flex-col gap-4 mt-8 pb-8">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl transition-all duration-500",
                        isTaxBufferUnlocked ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-emerald-500/20 text-emerald-500"
                    )}>
                        {isTaxBufferUnlocked ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">
                            {isTaxBufferUnlocked ? "Operating on Tax Reserves" : "Statutory Protection Active"}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            {isTaxBufferUnlocked ? "High Compliance Risk: Using GST/TDS for operations" : "28% GST/TDS buffer is locked and safe"}
                        </p>
                    </div>
                </div>

                <div 
                    onClick={toggleTaxBuffer}
                    className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                >
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500 px-2 group-hover:text-white">Tax Buffer</span>
                    <div className={cn(
                        "w-12 h-6 rounded-xl transition-all relative flex items-center px-1",
                        isTaxBufferUnlocked ? "bg-rose-500" : "bg-emerald-600"
                    )}>
                        <div className={cn(
                            "w-4 h-4 rounded-lg bg-white shadow-xl transition-all",
                            isTaxBufferUnlocked ? "translate-x-6" : "translate-x-0"
                        )} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {metrics.map((m, i) => {
                    const isCashMetric = m.label.includes('CASH');
                    return (
                        <motion.div
                            key={m.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                                "p-5 rounded-2xl border transition-all duration-700 flex flex-col justify-between group h-[180px] relative overflow-hidden",
                                isCashMetric && !isTaxBufferUnlocked ? "bg-white/[0.01] border-white/5 grayscale-[0.8] opacity-80" : "bg-white/[0.02] border-white/5"
                            )}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <m.icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                                    <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                                        {m.label}
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    m.health === 'green' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                    m.health === 'yellow' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                    "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                )} />
                            </div>

                            <div className="relative z-10">
                                <div className={cn("text-2xl font-bold tracking-tighter mb-1", m.color)}>
                                    {m.value}
                                </div>
                                
                                {isCashMetric && !isTaxBufferUnlocked ? (
                                    <div className="group/tooltip relative">
                                        <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 cursor-help">
                                            {m.subValue} <Info className="w-2.5 h-2.5" />
                                        </div>
                                        {/* MONOSPACED BREAKDOWN TOOLTIP */}
                                        <div className="absolute bottom-full left-0 mb-4 w-48 p-4 rounded-2xl bg-[#0a0f1e] border border-white/10 shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-50">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Govt Reserve Lock</p>
                                            <div className="space-y-2 font-mono text-[10px]">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">GST (18%)</span>
                                                    <span className="text-white">{fmt(gstBuffer)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">TDS (10%)</span>
                                                    <span className="text-white">{fmt(tdsBuffer)}</span>
                                                </div>
                                                <div className="h-px bg-white/5 my-2" />
                                                <div className="text-[8px] text-slate-600 leading-relaxed uppercase italic">
                                                    Reserved for Govt of India monthly/quarterly dues.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : m.subValue && (
                                    <div className={cn("text-[10px] font-bold tracking-wide", m.subValueColor || "text-slate-500")}>
                                        {m.subValue}
                                    </div>
                                )}
                            </div>

                            {/* Sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-50 transition-opacity">
                                <Sparkline data={m.trend} color={m.health === 'green' ? '#10b981' : m.health === 'yellow' ? '#f59e0b' : '#f43f5e'} />
                            </div>

                            {/* Ghost Effect Overlays */}
                            {isCashMetric && !isTaxBufferUnlocked && (
                               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
                            )}
                        </motion.div>
                    );
                })}
                {/* Progress vs Last Month Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between group h-[180px]"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                        <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                            PROGRESS VS LAST MONTH
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Runway</div>
                            <div className={cn("text-lg font-black tabular-nums", delta.runwayChangeDays && delta.runwayChangeDays > 0 ? "text-emerald-400" : "text-rose-400")}>
                                {delta.runwayChangeDays && delta.runwayChangeDays > 0 ? '+' : ''}{delta.runwayChangeDays ? (delta.runwayChangeDays / 30).toFixed(1) : 0} mo
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Burn</div>
                            <div className={cn("text-lg font-black tabular-nums", delta.burnChangePercent && delta.burnChangePercent <= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {delta.burnChangePercent && delta.burnChangePercent <= 0 ? '↓' : '↑'} {fmt(Math.abs((delta.prevNetBurn || summary.netBurn) - summary.netBurn))} 
                                {delta.burnChangePercent && <span className="text-xs opacity-70 ml-1">({Math.abs(Math.round(delta.burnChangePercent))}%)</span>}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function Sparkline({ data, color }: { data: number[], color: string }) {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 200;
    const height = 48;
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((d - min) / range) * height
    }));

    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d" preserveAspectRatio="none">
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d={`${pathData} L ${width},${height} L 0,${height} Z`}
                fill={color}
                fillOpacity="0.1"
            />
        </svg>
    );
}
