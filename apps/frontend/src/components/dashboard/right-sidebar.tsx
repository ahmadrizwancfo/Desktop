'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingDown, TrendingUp, Wallet, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState } from '@/store/cfo-state-store';
import { formatCurrency } from '@/lib/utils';

interface RightSidebarProps {
    state: CFOState;
}

export function RightSidebar({ state }: RightSidebarProps) {
    const { summary, delta, behavioralAudit } = state;
    
    const isSustainable = summary.isSustainable;
    const runwayMonths = summary.runwayMonths;
    const { riskProfile = 'PROACTIVE' } = behavioralAudit || {};

    return (
        <div className="flex flex-col gap-6 sticky top-24">
            {/* 1. RUNWAY */}
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-3xl p-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">RUNWAY</span>
                </div>
                <h3 className="text-3xl font-black text-white tabular-nums">
                    {isSustainable ? "> 36" : runwayMonths.toFixed(1)} <span className="text-xs font-bold text-slate-500 lowercase">mo</span>
                </h3>
                <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                    <div 
                        className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isSustainable || runwayMonths > 12 ? "bg-emerald-500" : runwayMonths > 4 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${Math.min(100, (runwayMonths / 36) * 100)}%` }}
                    />
                </div>
            </div>

            {/* 2. BURN TREND (MINI) */}
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-3xl p-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">BURN TREND</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-white tabular-nums">
                            {formatCurrency(summary.monthlyExpenses)}
                        </h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Net Monthly Burn</p>
                    </div>
                    {delta.burnChangePercent !== null && delta.burnChangePercent !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-black mb-1 px-2 py-1 rounded-lg",
                            delta.burnChangePercent <= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                        )}>
                            {delta.burnChangePercent <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {Math.abs(delta.burnChangePercent).toFixed(0)}%
                        </div>
                    )}
                </div>
            </div>

            {/* 3. CASH POSITION */}
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-3xl p-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">CASH POSITION</span>
                </div>
                <h3 className="text-2xl font-black text-white tabular-nums">
                    {formatCurrency(summary.cashInBank)}
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Available Liquidity</p>
            </div>

            {/* 4. RISK LEVEL */}
            <div className={cn(
                "border rounded-3xl p-6 transition-all relative overflow-hidden",
                riskProfile === 'CHAOTIC' ? "bg-rose-500/5 border-rose-500/20" : 
                riskProfile === 'REACTIONARY' ? "bg-amber-500/5 border-amber-500/20" :
                "bg-emerald-500/5 border-emerald-500/20"
            )}>
                <div className="flex items-center gap-2 mb-4">
                    {riskProfile === 'CHAOTIC' ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">RISK PROFILE</span>
                </div>
                <div className={cn(
                    "text-xl font-black uppercase tracking-widest",
                    riskProfile === 'CHAOTIC' ? "text-rose-400" : 
                    riskProfile === 'REACTIONARY' ? "text-amber-400" :
                    "text-emerald-400"
                )}>
                    {riskProfile}
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                    {riskProfile === 'CHAOTIC' ? 'Critical Attention Required' : riskProfile === 'REACTIONARY' ? 'Defensive Strategy' : 'Optimal Efficiency'}
                </p>
            </div>
        </div>
    );
}
