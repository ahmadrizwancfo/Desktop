'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, CalendarClock, TrendingUp, Compass, ShieldCheck, Scale, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const principles = [
    {
        number: "01",
        tag: "ACCRUAL VS LIQUIDITY",
        title: "Revenue is not cash.",
        description: "Your accounting shows ₹45L in booked revenue. But enterprise clients take 75 days to clear payments while payroll and ₹4.2L in GST obligations are due this Friday. We track spendable cash in bank, not theoretical revenue.",
        statLabel: "Spendable Cash vs Booked Revenue",
        statValue: "₹12.4L spendable vs ₹45L booked",
        badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
        number: "02",
        tag: "TIMELINESS OF TRUTH",
        title: "Monthly reports arrive too late.",
        description: "Traditional accounting delivers historical statements weeks after month-end. By then, overspending is already unrecoverable history. Financial reality must be understood before commitments are signed.",
        statLabel: "Reporting Cadence",
        statValue: "Real-time ledger reconciliation",
        badgeColor: "text-slate-300 bg-white/[0.04] border-white/10",
    },
    {
        number: "03",
        tag: "DYNAMIC TRADEOFFS",
        title: "Every decision carries a runway price.",
        description: "Hiring two senior developers appears manageable with ₹50L in the bank. Four months later, your safety margin narrows unexpectedly. The exact runway consequence should be modeled before sending the offer letter.",
        statLabel: "Pre-Hire Consequence",
        statValue: "-4.9 months runway mapped",
        badgeColor: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    }
];

const philosophy = [
    { title: "Financial truth before opinion.", desc: "Bank cash movements override gut feeling and internal theories." },
    { title: "Evidence before advice.", desc: "Every recommendation traces directly back to verifiable ledger entries." },
    { title: "Consequences before commitment.", desc: "Test the exact runway impact before signing contracts or making hires." },
    { title: "Judgment before action.", desc: "Clear executive reasoning paired with the safest viable alternative." }
];

export function ProblemSolution() {
    return (
        <section id="laws" className="py-24 px-6 max-w-6xl mx-auto relative border-t border-white/5">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>THE NATURE OF STARTUP CASH</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    Financial reality behaves differently than spreadsheets suggest.
                </h2>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                    Most companies do not fail from a lack of vision. They encounter cash crunches because traditional financial reports look backward rather than guiding today's decisions.
                </p>
            </div>

            {/* 3 Realities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                {principles.map((p, idx) => (
                    <div 
                        key={idx}
                        className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-7 flex flex-col justify-between hover:border-white/15 transition-all duration-300 group"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-slate-500 transition-colors">
                                    {p.number}
                                </span>
                                <div className={cn("text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border", p.badgeColor)}>
                                    {p.tag}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                                {p.title}
                            </h3>

                            <p className="text-sm text-slate-400 leading-relaxed font-normal mb-8">
                                {p.description}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-white/5 font-mono">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{p.statLabel}</div>
                            <div className="text-xs font-bold text-slate-200">{p.statValue}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Natural Philosophy Strip: 4 Operating Principles */}
            <div className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-8 sm:p-10 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                            FOUNDER OPERATING PHILOSOPHY
                        </div>
                        <h4 className="text-xl font-bold text-white tracking-tight">
                            The principles that guide every decision.
                        </h4>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                        Zero guesswork • Zero vanity metrics
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {philosophy.map((item, i) => (
                        <div key={i} className="space-y-2">
                            <div className="text-xs font-bold text-slate-200 tracking-tight font-sans">
                                {item.title}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
