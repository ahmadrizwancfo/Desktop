'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, CalendarClock, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const laws = [
    {
        number: "01",
        tag: "THE CASH LAG REALITY",
        title: "Revenue is not cash.",
        description: "Your dashboard shows ₹45L in booked revenue. But enterprise clients take 75 days to clear invoices while payroll and ₹4.2L in GST reserves are due this Friday. FounderCFO tracks spendable cash, not vanity accruals.",
        icon: Wallet,
        statLabel: "Spendable Cash vs Booked Revenue",
        statValue: "₹12.4L spendable vs ₹45L booked",
        badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
        number: "02",
        tag: "THE REPORTING GAP",
        title: "Delayed accounting is fatal.",
        description: "Traditional accounting firms deliver last month's numbers on the 20th. By the time you notice an unexpected SaaS spike or margin collapse, that money is already gone. FounderCFO operates in continuous real time.",
        icon: CalendarClock,
        statLabel: "Accountant Lag vs FounderCFO",
        statValue: "20-day lag eliminated",
        badgeColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    },
    {
        number: "03",
        tag: "THE TRADEOFF ENGINE",
        title: "Every decision has a runway price tag.",
        description: "Hiring 2 senior developers feels completely safe with ₹50L in the bank. Four months later, your safety margin drops below 6 months. FounderCFO simulates the exact runway consequence before you send the offer letter.",
        icon: TrendingUp,
        statLabel: "Pre-Hire Simulation Impact",
        statValue: "-4.9 months runway mapped",
        badgeColor: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    }
];

export function ProblemSolution() {
    return (
        <section className="py-24 px-6 max-w-6xl mx-auto relative">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>THE THREE UNFORGIVING LAWS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    Financial mistakes feel invisible until they're expensive.
                </h2>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                    Most startups don't fail from lack of ambition. They run out of money because traditional spreadsheets cannot model live trade-offs.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {laws.map((law, idx) => {
                    const Icon = law.icon;
                    return (
                        <div 
                            key={idx}
                            className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-7 flex flex-col justify-between hover:border-white/15 transition-all duration-300 group relative"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-slate-500 transition-colors">
                                        {law.number}
                                    </span>
                                    <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className={cn("inline-block text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border mb-3", law.badgeColor)}>
                                    {law.tag}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                                    {law.title}
                                </h3>

                                <p className="text-sm text-slate-400 leading-relaxed font-normal mb-8">
                                    {law.description}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5 font-mono">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{law.statLabel}</div>
                                <div className="text-xs font-bold text-slate-200">{law.statValue}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
