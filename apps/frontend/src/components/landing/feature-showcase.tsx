'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, 
    Briefcase, 
    TrendingUp, 
    CheckCircle2, 
    Scale,
    Quote
} from 'lucide-react';
import { cn } from '@/lib/utils';

const scenarios = [
    {
        id: 'hiring',
        icon: Users,
        prompt: "Can we afford to hire 2 Senior Backend Engineers at ₹35L CTC?",
        verdict: "NOT RECOMMENDED TODAY",
        verdictColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
        runwayBefore: "18.5",
        runwayAfter: "13.6",
        delta: "-4.9 months",
        burnDelta: "+₹5,83,000 / mo",
        analysis: "Your current net burn is ₹7.2L/month. Adding ₹5.8L/month in fixed payroll cuts your safety window to under 14 months while enterprise receivables are running 18 days behind schedule.",
        mitigation: "Engage 1 senior contractor on a 90-day milestone contract (₹1.8L/mo). Re-evaluate full-time hiring once collected cash balance crosses ₹35L."
    },
    {
        id: 'enterprise_terms',
        icon: Briefcase,
        prompt: "Should we offer 90-day payment terms to close a ₹50L enterprise contract?",
        verdict: "HIGH WORKING CAPITAL RISK",
        verdictColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        runwayBefore: "18.5",
        runwayAfter: "16.1",
        delta: "-2.4 months buffer",
        burnDelta: "₹18.5L cash deficit in Month 2",
        analysis: "While total contract value is accretive, delaying payment by 90 days causes cash balance to breach your statutory GST and payroll safety reserve on Day 45.",
        mitigation: "Counter with 30-day payment terms paired with a 4% early settlement rebate, or structure as 40% upfront + 60% on delivery."
    },
    {
        id: 'marketing_expansion',
        icon: TrendingUp,
        prompt: "Can we increase performance marketing spend by ₹3.5L/month in Q3?",
        verdict: "APPROVED WITH MILESTONE GATES",
        verdictColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        runwayBefore: "18.5",
        runwayAfter: "16.2",
        delta: "-2.3 months",
        burnDelta: "+₹3,50,000 / mo",
        analysis: "Spendable cash reserves remain healthy above ₹30L. The company has sufficient liquidity buffer to absorb this customer acquisition test for 90 days.",
        mitigation: "Set an automated stop-loss gate: If CAC exceeds ₹4,200 by Day 45, automatically roll back monthly budget to baseline."
    }
];

export function FeatureShowcase() {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const active = scenarios[selectedIdx];

    return (
        <section id="decision-lab" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/5">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>THE EMOTIONAL CENTERPIECE: DECISION LAB</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    Ask difficult questions. Get deterministic answers.
                </h2>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                    Before sending that hiring offer or committing to an annual vendor agreement, see the exact mathematical consequence on your runway.
                </p>
            </div>

            {/* Dilemma Selector Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                {scenarios.map((s, idx) => {
                    const isSelected = selectedIdx === idx;
                    const Icon = s.icon;
                    return (
                        <button
                            key={s.id}
                            onClick={() => setSelectedIdx(idx)}
                            className={cn(
                                "text-left p-4.5 rounded-xl border transition-all text-sm font-medium flex items-center gap-3 cursor-pointer",
                                isSelected 
                                    ? "bg-white/[0.08] border-white/20 text-white shadow-lg" 
                                    : "bg-[#0a0f1e]/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                isSelected ? "bg-white/10 border-white/20 text-white" : "bg-white/[0.02] border-white/5 text-slate-500"
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="line-clamp-2 text-xs sm:text-sm font-sans">{s.prompt}</span>
                        </button>
                    );
                })}
            </div>

            {/* The Simulation Consequence Card */}
            <div className="rounded-2xl bg-[#0a0f1e] border border-white/10 p-6 sm:p-9 relative overflow-hidden backdrop-blur-xl shadow-2xl mb-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                            FOUNDER DILEMMA SIMULATION
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            "{active.prompt}"
                        </h3>
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border self-start md:self-auto", active.verdictColor)}>
                        <span>{active.verdict}</span>
                    </div>
                </div>

                {/* Quantitative Impact Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-white/5 font-mono">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Current Runway</div>
                        <div className="text-xl font-bold text-white">{active.runwayBefore} mo</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Projected Runway</div>
                        <div className="text-xl font-bold text-slate-300">{active.runwayAfter} mo</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Runway Delta</div>
                        <div className="text-xl font-bold text-rose-400">{active.delta}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Monthly Burn Delta</div>
                        <div className="text-xl font-bold text-amber-400">{active.burnDelta}</div>
                    </div>
                </div>

                {/* Qualitative CFO Reasoning & Mitigation */}
                <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                            <Scale className="w-3.5 h-3.5 text-slate-400" />
                            CFO CONSEQUENCE ANALYSIS
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-sans">
                            {active.analysis}
                        </p>
                    </div>

                    <div className="space-y-2 rounded-xl bg-white/[0.02] border border-white/5 p-4.5">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            RECOMMENDED SAFER ALTERNATIVE
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {active.mitigation}
                        </p>
                    </div>
                </div>
            </div>

            {/* THE SINGLE PROOF STORY: One Founder. One Decision. One Outcome. */}
            <div className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-8 sm:p-10 relative overflow-hidden">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">
                    REAL DECISION RECORD • BENGALURU, 2026
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight mb-4">
                    One founder. One decision. One outcome.
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl font-sans mb-6">
                    A seed-stage SaaS founder with ₹55L in bank balances prepared to send offer letters to two senior engineers. The simulation revealed a 5.1-month runway contraction colliding directly with advance tax obligations in September. 
                </p>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl font-sans mb-6">
                    Guided by the analysis, the founder engaged one specialist on a 90-day milestone contract until enterprise receivables cleared. Three months later, cash reserves crossed ₹80L, and the full-time hires were made with 14 months of verified runway intact.
                </p>
                <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-slate-400 pt-4 border-t border-white/5">
                    <div>Avoided: <span className="text-rose-400">Premature ₹70L/yr fixed payroll</span></div>
                    <div>•</div>
                    <div>Preserved: <span className="text-emerald-400">+5.1 months safety runway</span></div>
                    <div>•</div>
                    <div>Outcome: <span className="text-white font-bold">Clean Series A trajectory</span></div>
                </div>
            </div>
        </section>
    );
}
