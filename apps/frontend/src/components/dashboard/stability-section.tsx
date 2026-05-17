'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Wallet, 
    Flame, 
    TrendingUp, 
    Calculator,
    Users,
    Gem,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { CFOState, formatCurrency, formatRunway } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';

interface StabilitySectionProps {
    state: CFOState;
}

export function StabilitySection({ state }: StabilitySectionProps) {
    const { summary: s } = state;
    
    const metrics = [
        { title: 'Total Runway', value: formatRunway(s.runwayMonths), trend: 2, icon: Gem, color: 'text-indigo-400' },
        { title: 'Monthly Burn', value: formatCurrency(s.netBurn), trend: -5, icon: Flame, color: 'text-rose-400', isPositiveGood: false },
        { title: 'Est. Revenue', value: formatCurrency(s.monthlyRevenue), trend: 12, icon: TrendingUp, color: 'text-emerald-400' },
        { title: 'Total Expenses', value: formatCurrency(s.monthlyExpenses), trend: 3, icon: Calculator, color: 'text-slate-400', isPositiveGood: false },
    ];

    const statusIndicators = [
        { label: 'Hiring Status', value: 'Paused', color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', icon: Users },
        { label: 'Fundraising', value: 'Not Required', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', icon: Wallet }
    ];

    return (
        <section className="pt-16">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-slate-800 rounded-full" />
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Structured Stability Metrics</h2>
                </div>
                <div className="flex items-center gap-4">
                    {statusIndicators.map((status, i) => (
                        <div key={i} className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2", status.color)}>
                            <status.icon className="w-3 h-3" />
                            {status.label}: {status.value}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.map((m, i) => {
                    const isGood = m.isPositiveGood === false ? m.trend <= 0 : m.trend >= 0;
                    return (
                        <motion.div
                            key={m.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.05] transition-all group"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] grayscale group-hover:grayscale-0 transition-all">
                                    <m.icon className={cn("w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity", m.color)} />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-0.5 text-[9px] font-black opacity-40 group-hover:opacity-100 transition-opacity",
                                    isGood ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {m.trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                    {Math.abs(m.trend)}%
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{m.title}</p>
                            <h3 className="text-xl font-black text-white/70 group-hover:text-white tracking-tight transition-colors">{m.value}</h3>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
