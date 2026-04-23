'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CFOState } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface BurnBarProps {
    state: CFOState;
}

export function BurnBar({ state }: BurnBarProps) {
    const { summary, categoryBreakdown } = state;

    // Calculate Fixed vs Variable
    const fixedKeywords = ['rent', 'payroll', 'salary', 'wages', 'software', 'subscription', 'insurance', 'lease', 'legal'];
    
    const { fixedCost, variableCost } = useMemo(() => {
        let fixed = 0;
        let variable = 0;

        categoryBreakdown.forEach((cat) => {
            const isFixed = fixedKeywords.some(k => cat.category.toLowerCase().includes(k));
            if (isFixed) {
                fixed += cat.amount;
            } else {
                variable += cat.amount;
            }
        });

        // Fallback if breakdown doesn't add up precisely to monthlyExpenses
        const trackedSum = fixed + variable;
        const diff = summary.monthlyExpenses - trackedSum;
        if (diff > 0) {
            variable += diff; // dump untracked into variable
        }

        return { fixedCost: fixed, variableCost: variable };
    }, [categoryBreakdown, summary.monthlyExpenses]);

    const revenue = summary.monthlyRevenue;
    const padding = Math.max(revenue, summary.monthlyExpenses) * 0.1; // 10% overflow space
    const maxValue = Math.max(revenue, summary.monthlyExpenses) + padding;

    const revPct = maxValue > 0 ? (revenue / maxValue) * 100 : 0;
    const fixedPct = maxValue > 0 ? (fixedCost / maxValue) * 100 : 0;
    const variablePct = maxValue > 0 ? (variableCost / maxValue) * 100 : 0;
    
    // Ghost liability representation inside Revenue
    const ghostLiability = summary.ghostLiabilities || 0;
    const ghostPct = maxValue > 0 ? (ghostLiability / maxValue) * 100 : 0;

    return (
        <div className="w-full bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Macro Burn Bar</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Structural Breakdown (Trailing 30d)
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Total Monthly Expense</div>
                    <div className="text-2xl font-black text-white">{formatCurrency(summary.monthlyExpenses)}</div>
                </div>
            </div>

            <div className="relative pt-8 pb-4">
                {/* 1. The Expenses Bar */}
                <div className="flex w-full h-8 rounded-lg overflow-hidden relative bg-white/5 mb-3 border border-white/5">
                    {/* Fixed Cost Segment */}
                    <div 
                        className="h-full bg-slate-500 relative flex items-center px-3"
                        style={{ width: `${Math.max(1, fixedPct)}%` }} // make sure it's minimally visible
                    >
                        {fixedPct > 10 && <span className="text-[10px] font-bold text-white uppercase opacity-80 whitespace-nowrap">Fixed</span>}
                    </div>

                    {/* Variable Cost Segment */}
                    <div 
                        className="h-full bg-slate-700 relative flex items-center px-3"
                        style={{ width: `${Math.max(1, variablePct)}%` }}
                    >
                        {variablePct > 10 && <span className="text-[10px] font-bold text-white uppercase opacity-80 whitespace-nowrap">Variable</span>}
                    </div>
                </div>

                {/* 2. The Revenue Bar (Overlaid or parallel) */}
                <div className="flex w-full h-3 rounded-full overflow-hidden bg-white/5 border border-white/5">
                    {/* Real Cash Margin */}
                    <div 
                        className="h-full bg-emerald-500/80 relative"
                        style={{ width: `${Math.max(0, revPct - ghostPct)}%` }}
                    />
                    {/* Ghost Liability Buffer */}
                    <div 
                        className="h-full bg-emerald-900/50 relative"
                        style={{ width: `${ghostPct}%` }}
                        title="Ghost Liability (GST Buffer)"
                    />
                </div>

                {/* Markers and Legend */}
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-4 px-1">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500/80" />
                            <span>Real Cash Revenue ({formatCurrency(revenue - ghostLiability)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-900/50" />
                            <span>GST Buffer ({formatCurrency(ghostLiability)})</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-right">
                        <div className="flex items-center gap-2">
                            <span>Fixed Cost ({formatCurrency(fixedCost)})</span>
                            <div className="w-3 h-3 rounded bg-slate-500" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Variable Cost ({formatCurrency(variableCost)})</span>
                            <div className="w-3 h-3 rounded bg-slate-700" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Actionable Insight Box if burning cash */}
            {summary.netBurn > 0 && (
                <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 flex flex-shrink-0 items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-rose-400">Structural Deficit</h4>
                        <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                            Your revenue currently covers only {Math.round((revenue / Math.max(1, summary.monthlyExpenses)) * 100)}% of your expenses. 
                            {fixedCost > revenue ? ` Warning: Your structural fixed costs (${formatCurrency(fixedCost)}) explicitly exceed your total revenue. Capital dependence is high.` : ` Fixed costs are covered by revenue, but variable spend pushes you into a deficit.`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
