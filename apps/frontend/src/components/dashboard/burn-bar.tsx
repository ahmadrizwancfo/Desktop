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
    
    let fixedAmount = 0;
    let variable = 0;

    categoryBreakdown.forEach((cat) => {
        const isFixed = fixedKeywords.some(k => cat.category.toLowerCase().includes(k));
        if (isFixed) {
            fixedAmount += cat.amount;
        } else {
            variable += cat.amount;
        }
    });

    // Fallback if breakdown doesn't add up precisely to monthlyExpenses
    const trackedSum = fixedAmount + variable;
    const diff = summary.monthlyExpenses - trackedSum;
    if (diff > 0) {
        variable += diff; // dump untracked into variable
    }

    const fixedCost = fixedAmount;
    const variableCost = variable;
    const totalExpenses = summary.monthlyExpenses || 1;

    const fixedPct = (fixedCost / totalExpenses) * 100;
    const variablePct = (variableCost / totalExpenses) * 100;

    const segments = [
        { label: 'FIXED',    pct: fixedPct,      bg: 'bg-emerald-500',  textColor: 'text-emerald-950' },
        { label: 'VARIABLE', pct: variablePct,   bg: 'bg-slate-600',    textColor: 'text-white' },
    ];

    return (
        <div className="w-full glass-premium border border-white/5 rounded-3xl p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-white tracking-wide uppercase">MACRO BURN BAR</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-1">
                        EXPENSE COMPOSITION (TRAILING 30D)
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-[10px] uppercase font-black tracking-[0.1em] text-slate-500 mb-1">TOTAL MONTHLY EXPENSE</div>
                    <div className="text-2xl font-black text-white tracking-widest">{formatCurrency(summary.monthlyExpenses)}</div>
                </div>
            </div>

            {/* 2-Segment Proportional Bar — Reduced Height */}
            <div className="flex w-full h-9 rounded-2xl overflow-hidden relative shadow-inner bg-white/5">
                {segments.map((seg) => (
                    <div
                        key={seg.label}
                        className={cn(
                            "h-full relative flex items-center justify-center px-3 transition-all duration-500 hover:brightness-125 cursor-default",
                            seg.bg
                        )}
                        style={{ width: `${seg.pct}%` }}
                        title={`${seg.label} — ${seg.pct.toFixed(1)}%`}
                    >
                        {seg.pct > 10 && (
                            <span className={cn("text-[9px] font-black uppercase tracking-widest whitespace-nowrap", seg.textColor)}>
                                {seg.label} {Math.round(seg.pct)}%
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend — Increased Font Size for Key Labels */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="flex items-start gap-2 border-r border-white/5 pr-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1" />
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Spendable Cash</div>
                        <div className="text-lg font-black text-white">{formatCurrency(summary.cashInBank)}</div>
                    </div>
                </div>
                <div className="flex items-start gap-2 border-r border-white/5 pr-4 pl-2 lg:pl-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1" />
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">GOI Reserves</div>
                        <div className="text-lg font-black text-white">{formatCurrency(summary.ghostLiabilities || 0)}</div>
                    </div>
                </div>
                <div className="flex items-start gap-2 border-r border-white/5 pr-4 pl-2 lg:pl-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Fixed Cost</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(fixedCost)}</div>
                    </div>
                </div>
                <div className="flex items-start gap-2 pl-2 lg:pl-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 mt-1" />
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Variable Cost</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(variableCost)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
