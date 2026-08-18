'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    ArrowRight, 
    CheckCircle2, 
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.15,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as any }
    },
};

export function HeroSection() {
    return (
        <section className="relative min-h-[85vh] flex flex-col items-center justify-start pt-32 pb-20 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[380px] bg-gradient-to-b from-indigo-500/8 via-white/[0.02] to-transparent blur-3xl pointer-events-none -z-10" />

            <div className="w-full max-w-5xl mx-auto px-6 text-center z-10 flex flex-col items-center">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full flex flex-col items-center"
                >
                    {/* Operating Posture Tag */}
                    <motion.div 
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-300 mb-8 backdrop-blur-md"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>The Financial Operating Partner</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 
                        variants={itemVariants}
                        className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-6"
                    >
                        The financial partner you wish sat beside you on Day 1.
                    </motion.h1>

                    {/* Subheadline: Private CFO tone */}
                    <motion.p 
                        variants={itemVariants}
                        className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-normal"
                    >
                        Every morning before you open your laptop, cash movements are reconciled, statutory buffers are verified, and your single most important decision is prepared.
                    </motion.p>

                    {/* CTA Group */}
                    <motion.div 
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-4"
                    >
                        <Link
                            href="/register"
                            className="w-full sm:w-auto px-8 h-13 rounded-xl bg-white text-[#070b14] font-semibold hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5 text-base"
                        >
                            <span>Verify Your Runway</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <Link
                            href="#decision-lab"
                            className="w-full sm:w-auto px-7 h-13 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-medium hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center gap-2 text-base backdrop-blur-md"
                        >
                            Explore Decision Lab
                        </Link>
                    </motion.div>

                    {/* Trust Microcopy */}
                    <motion.div 
                        variants={itemVariants}
                        className="text-xs text-slate-500 font-mono tracking-wide mb-14"
                    >
                        No bank passwords required • Standard statement exports from HDFC, ICICI, Axis, SBI & Tally
                    </motion.div>

                    {/* FOLD 1 PROOF: THE MORNING BRIEFING CARD */}
                    <motion.div 
                        variants={itemVariants}
                        className="w-full max-w-3xl text-left rounded-2xl bg-[#0a0f1e] border border-white/10 shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl group"
                    >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500" />
                        
                        {/* Card Header: Reassurance */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                                        MORNING EXECUTIVE BRIEFING
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        AUDITED 08:30 AM
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                    You are safe for now. <span className="text-emerald-400 font-mono font-normal">18.5 months</span> of runway.
                                </h3>
                            </div>
                            <div className="text-left sm:text-right font-mono">
                                <div className="text-xs text-slate-500">SPENDABLE CASH</div>
                                <div className="text-lg font-bold text-white">₹42,85,000</div>
                            </div>
                        </div>

                        {/* Card Body: Work Already Completed */}
                        <div className="py-5 border-b border-white/5 space-y-2.5">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                                COMPLETED PRIOR TO YOUR DAY
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 font-sans">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>412 bank vouchers reconciled across accounts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>₹3.8L protected in statutory tax reserve</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>₹14.2L delayed enterprise invoice flagged</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>Upcoming 60-day payroll stress-tested</span>
                                </div>
                            </div>
                        </div>

                        {/* Card Action: Today's Single Decision */}
                        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                                    TODAY'S SINGLE ACTION
                                </div>
                                <p className="text-sm font-medium text-white">
                                    Preserve cash: Delay hiring 2 senior backend engineers until Q3 collections clear.
                                </p>
                                <p className="text-xs text-slate-400 font-mono">
                                    Consequence: <span className="text-emerald-400">+4.9 months runway preserved</span>
                                </p>
                            </div>
                            <Link
                                href="#decision-lab"
                                className="px-4 py-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-medium transition-colors shrink-0 text-center"
                            >
                                View Consequence →
                            </Link>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
