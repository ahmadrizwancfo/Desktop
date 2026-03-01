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
        <div className="w-full">
            <div className={cn(
                "relative rounded-3xl overflow-hidden glass-card border-[1px] transition-all duration-300",
                currentStatus.border
            )}>
                {/* Status Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white tracking-tight">FounderCFO Summary</h2>
                        <span className="text-slate-500 text-sm font-medium px-2 py-1 rounded bg-white/5">March 2026</span>
                    </div>
                    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase", currentStatus.bgLight, currentStatus.text)}>
                        <Icon className="w-4 h-4" />
                        {currentStatus.label}
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Primary Narrative */}
                    <div className="lg:col-span-7 flex flex-col justify-center">
                        <div className="text-3xl md:text-4xl font-light text-slate-300 mb-6 leading-normal">
                            {message.split("burning").length > 1 ? (
                                <>
                                    This month, you are burning <span className="text-white font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(monthlyBurn)}</span>
                                    {message.split("burning")[1]}
                                </>
                            ) : message}
                        </div>

                        <div className="flex gap-4">
                            <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                View Burn Analysis
                            </button>
                            <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10 transition-colors">
                                Ask AI CFO
                            </button>
                        </div>
                    </div>

                    {/* Key Decision Metrics */}
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                        {/* Runway Card */}
                        <div className="col-span-2 p-5 rounded-2xl bg-[#0f172a]/40 border border-white/5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider">
                                    <Calendar className="w-4 h-4" /> Runway
                                </div>
                                <span className={cn("text-xs font-bold px-2 py-0.5 rounded", runwayMonths < 6 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                                    {runwayMonths < 6 ? "CRITICAL" : "HEALTHY"}
                                </span>
                            </div>
                            <div className="text-4xl font-black text-white mb-1">{runwayMonths} <span className="text-lg text-slate-500 font-medium">Months</span></div>
                            <div className="text-xs text-slate-500">Based on L3M Average Burn</div>
                        </div>

                        {/* Fundraise Window */}
                        <div className="p-5 rounded-2xl bg-[#0f172a]/40 border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                                <TrendingUp className="w-4 h-4" /> Fundraise
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">Start Now</div>
                            <div className="text-[10px] text-amber-500 font-medium">Window closes in {fundraiseWindowDays} days</div>
                        </div>

                        {/* Hiring Decision */}
                        <div className="p-5 rounded-2xl bg-[#0f172a]/40 border border-white/5">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                                <UserPlus className="w-4 h-4" /> Hiring
                            </div>
                            <div className="flex items-center gap-2">
                                {safeToHire ? (
                                    <div className="text-2xl font-bold text-emerald-400">Safe</div>
                                ) : (
                                    <div className="text-2xl font-bold text-rose-400">Pausing</div>
                                )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{safeToHire ? "Budget available for 2 roles" : "Wait for runway > 9mo"}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
