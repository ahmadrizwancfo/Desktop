'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PricingTable() {
    return (
        <section id="pricing" className="py-28 px-6 max-w-5xl mx-auto border-t border-white/5">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>DECISION INSURANCE</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    What does one bad financial decision cost?
                </h2>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                    One premature senior hire costs ₹15 Lakhs. A surprise GST penalty costs 18% plus compliance freeze. Continuous financial oversight is decision insurance for your runway.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Free Baseline Tier */}
                <div className="rounded-2xl bg-[#0a0f1e] border border-white/10 p-8 flex flex-col justify-between hover:border-white/20 transition-all">
                    <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                            BASELINE VERIFICATION
                        </div>
                        <div className="flex items-baseline gap-2 mb-4 font-mono">
                            <span className="text-4xl font-bold text-white">₹0</span>
                            <span className="text-xs text-slate-500 font-sans">forever free</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                            For early founders who need to establish their first verified cash baseline and true runway.
                        </p>

                        <div className="space-y-3.5 text-xs text-slate-300 mb-8 font-sans">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Single bank statement CSV reconciliation</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Deterministic 90-day cash runway timeline</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Weekly executive cash briefing</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Statutory GST & TDS reserve buffer calculation</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/register"
                        className="w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-semibold text-center hover:bg-white/[0.08] transition-all text-sm block"
                    >
                        Verify Your Runway Free
                    </Link>
                </div>

                {/* Operating Partner Tier */}
                <div className="rounded-2xl bg-[#0a0f1e] border border-indigo-500/30 p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl hover:border-indigo-500/50 transition-all group">
                    <div className="absolute top-0 right-0 px-3.5 py-1 bg-indigo-500 text-white text-[10px] font-mono font-bold rounded-bl-xl tracking-wider uppercase">
                        OPERATING PARTNER
                    </div>

                    <div>
                        <div className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold mb-2">
                            FULL OPERATING CFO
                        </div>
                        <div className="flex items-baseline gap-2 mb-4 font-mono">
                            <span className="text-4xl font-bold text-white">₹4,999</span>
                            <span className="text-xs text-slate-500 font-sans">/ month</span>
                        </div>
                        <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                            For growing startups who make daily hiring, pricing, and capital allocation decisions.
                        </p>

                        <div className="space-y-3.5 text-xs text-slate-200 mb-8 font-sans">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Multi-bank + Tally Prime XML continuous sync</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Unlimited Decision Lab hiring & contract simulations</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Daily Morning Executive Briefings (08:30 AM)</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Autonomous anomaly detection & delayed receivable alerts</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Investor-ready quarterly financial memo synthesis</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/register"
                        className="w-full py-3.5 rounded-xl bg-white text-[#0a0f1e] font-bold text-center hover:bg-slate-100 transition-all text-sm block shadow-lg"
                    >
                        Start 14-Day Free Access →
                    </Link>
                </div>
            </div>

            {/* ROI Reality Anchor */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
                <span className="text-slate-400 font-sans">BENCHMARK COMPARISON</span>
                <div className="flex flex-wrap items-center gap-4 text-slate-300">
                    <div>Fractional CFO: <span className="text-slate-400">₹75,000/mo</span></div>
                    <div>•</div>
                    <div>1 Premature Hire: <span className="text-rose-400">₹15,00,000</span></div>
                    <div>•</div>
                    <div>FounderCFO: <span className="text-emerald-400 font-bold">₹4,999/mo</span></div>
                </div>
            </div>
        </section>
    );
}
