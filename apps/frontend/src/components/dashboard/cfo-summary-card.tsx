'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Calendar, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CFOStatus = 'STABLE' | 'WATCH' | 'ACTION';

interface CFOSummaryProps {
    status: CFOStatus;
    runwayMonths: number;
    monthlyBurn: number;
    cashBalance: number;
    safeToHire: boolean;
    fundraiseWindowDays: number;
    message: string;
}

export function CFOSummaryCard({
    status = 'WATCH',
    runwayMonths = 7.2,
    monthlyBurn = 240000,
    cashBalance = 1200000,
    safeToHire = false,
    fundraiseWindowDays = 60,
    message = "Marketing spend increased 18% this month, reducing runway by 0.5 months."
}: Partial<CFOSummaryProps>) {

    const statusConfig = {
        'STABLE': { color: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500/20', bgLight: 'bg-emerald-500/10', icon: CheckCircle2, label: 'STABLE' },
        'WATCH': { color: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500/20', bgLight: 'bg-amber-500/10', icon: AlertTriangle, label: 'WATCH' },
        'ACTION': { color: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500/20', bgLight: 'bg-rose-500/10', icon: AlertCircle, label: 'ACTION NEEDED' }
    };

    const currentStatus = statusConfig[status];
    const Icon = currentStatus.icon;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full relative group"
        >
            {/* Ambient Ambient Glow */}
            <div className={cn(
                "absolute -inset-1 rounded-[2.5rem] blur-2xl opacity-10 transition-opacity duration-500 group-hover:opacity-20",
                currentStatus.color
            )} />

            <div className={cn(
                "relative rounded-[2rem] overflow-hidden glass-premium border-[1px] transition-all duration-500",
                currentStatus.border
            )}>
                {/* Status Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01] backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner", currentStatus.text)}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight text-editorial">FounderCFO Intelligence</h2>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">March 2026 • Real-time Sync</p>
                        </div>
                    </div>
                    <div className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border shadow-inner", currentStatus.bgLight, currentStatus.text, currentStatus.border)}>
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", currentStatus.color)} />
                        {currentStatus.label}
                    </div>
                </div>

                <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Primary Narrative */}
                    <div className="lg:col-span-7 flex flex-col justify-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl md:text-5xl font-light text-slate-200 mb-8 leading-[1.2] text-editorial"
                        >
                            {message.split("burning").length > 1 ? (
                                <>
                                    Burning <span className="text-white font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(monthlyBurn)}</span>
                                    {message.split("burning")[1]}
                                </>
                            ) : message}
                        </motion.div>

                        <div className="flex gap-4">
                            <button className="px-8 py-3.5 rounded-2xl bg-white text-[#020617] font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm">
                                Optimize Burn
                            </button>
                            <button className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10 transition-all text-sm backdrop-blur-md">
                                Ask AI CFO
                            </button>
                        </div>
                    </div>

                    {/* Key Decision Metrics */}
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        {/* Runway Card */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="col-span-2 p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden group/metric"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                                    <Calendar className="w-3 h-3" /> Runway Status
                                </div>
                                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border tracking-tighter", runwayMonths < 6 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}>
                                    {runwayMonths < 6 ? "CRITICAL" : "HEALTHY"}
                                </span>
                            </div>
                            <div className="text-5xl font-black text-white mb-1 tracking-tighter relative z-10">
                                {runwayMonths}
                                <span className="text-base text-slate-500 font-medium ml-2 uppercase tracking-widest italic">Months</span>
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium uppercase tracking-widest relative z-10">Based on L3M Dynamic Burn</div>
                        </motion.div>

                        {/* Fundraise Window */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-4">
                                <TrendingUp className="w-3 h-3" /> Capital
                            </div>
                            <div className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Stage A</div>
                            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">In {fundraiseWindowDays} Days</div>
                        </motion.div>

                        {/* Hiring Decision */}
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-4">
                                <UserPlus className="w-3 h-3" /> Hiring
                            </div>
                            <div className="flex items-center gap-2">
                                {safeToHire ? (
                                    <div className="text-2xl font-black text-emerald-400 uppercase tracking-tight">Active</div>
                                ) : (
                                    <div className="text-2xl font-black text-rose-400 uppercase tracking-tight">Paused</div>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium uppercase tracking-widest mt-1 italic">Efficiency First</div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
