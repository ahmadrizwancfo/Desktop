'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, PlayCircle, BarChart3, PieChart, Users, Settings, Bell, Search, TrendingUp, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 px-6 sm:px-10 overflow-hidden min-h-[90vh] flex flex-col justify-center">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[130px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '3s' }} />
            </div>

            <div className="max-w-7xl mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary mb-8 hover:bg-white/10 transition-colors cursor-default backdrop-blur-md">
                        <Zap className="w-3 h-3 fill-primary" />
                        <span>AI-Powered Financial Intelligence v2.0</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent leading-[1.1]">
                        The Financial OS for <br className="hidden md:block" />
                        <span className="text-primary relative inline-block">
                            Modern Founders
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Replace your fragmented finance stack with one intelligent platform.
                        Automate bookkeeping, tax compliance, and runway forecasting in real-time.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
                        <Link
                            href="/register"
                            className="group px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative">Start Free Trial</span>
                            <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="#demo"
                            className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center backdrop-blur-sm"
                        >
                            <PlayCircle className="w-4 h-4" />
                            See How It Works
                        </Link>
                    </div>

                    {/* Dashboard Preview (High Fidelity Mockup - Narrative Driven) */}
                    <motion.div
                        initial={{ opacity: 0, y: 60, rotateX: 15 }}
                        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, type: "spring", bounce: 0.2 }}
                        className="relative mx-auto max-w-6xl"
                        style={{ perspective: '2000px' }}
                    >
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0f172a] ring-1 ring-white/5 text-left">
                            {/* Dashboard UI Structure */}
                            <div className="flex h-[600px]">

                                {/* Sidebar */}
                                <div className="w-64 border-r border-white/5 bg-slate-900/50 p-4 hidden md:flex flex-col gap-1">
                                    <div className="flex items-center gap-2 px-2 mb-8">
                                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                            <TrendingUp className="text-white w-4 h-4" />
                                        </div>
                                        <span className="font-bold tracking-tight text-white">FounderCFO</span>
                                    </div>
                                    {[
                                        { icon: BarChart3, label: "Overview", active: true },
                                        { icon: PieChart, label: "Cash Flow" },
                                        { icon: Users, label: "Payroll" },
                                        { icon: TrendingUp, label: "Forecasts" },
                                        { icon: Settings, label: "Settings" }
                                    ].map((item, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-default",
                                            item.active ? "bg-primary/10 text-primary" : "text-slate-400 hover:text-white hover:bg-white/5"
                                        )}>
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 flex flex-col bg-[#0f172a] relative">
                                    {/* Header */}
                                    <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/20 backdrop-blur-sm">
                                        <div className="text-sm font-medium text-slate-400">Dashboard / Overview</div>
                                        <div className="flex items-center gap-4">
                                            <Search className="w-4 h-4 text-slate-500" />
                                            <Bell className="w-4 h-4 text-slate-500" />
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">NS</div>
                                        </div>
                                    </div>

                                    {/* Dashboard Content */}
                                    <div className="p-8 overflow-hidden relative flex flex-col gap-6">

                                        {/* CFO Summary Card Simulation */}
                                        <motion.div
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            whileInView={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
                                        >
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-lg font-bold text-white">FounderCFO Summary</h2>
                                                    <span className="text-xs font-bold bg-white/5 text-slate-400 px-2 py-1 rounded">March 2026</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Watch
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-12 gap-6">
                                                <div className="col-span-8 pr-4">
                                                    <div className="text-2xl font-light text-slate-300 leading-relaxed">
                                                        You are likely to run out of cash in <span className="text-white font-bold">7.2 months</span> if marketing spend continues to rise by 18% MoM.
                                                    </div>
                                                    <div className="mt-4 flex gap-3">
                                                        <div className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20">Analyze Spend</div>
                                                    </div>
                                                </div>
                                                <div className="col-span-4 grid grid-cols-1 gap-3">
                                                    <div className="p-3 bg-[#0f172a]/50 rounded-xl border border-white/5 flex justify-between items-center">
                                                        <span className="text-xs text-slate-400 font-bold uppercase">Runway</span>
                                                        <span className="text-lg font-bold text-white">7.2 Mo</span>
                                                    </div>
                                                    <div className="p-3 bg-[#0f172a]/50 rounded-xl border border-white/5 flex justify-between items-center">
                                                        <span className="text-xs text-slate-400 font-bold uppercase">Funding</span>
                                                        <span className="text-xs font-bold text-amber-500">Start in 60 days</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Narrative Feed Simulation */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recent Narratives</div>
                                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between w-full mb-1">
                                                            <div className="text-sm font-bold text-white">Revenue Projection</div>
                                                            <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 rounded-full">On Track</div>
                                                        </div>
                                                        <div className="text-xs text-slate-400 leading-relaxed">
                                                            Based on current pipeline, you are projected to hit $1.5M ARR by Q3 2026.
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-4 items-start opacity-60">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                        <Users className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between w-full mb-1">
                                                            <div className="text-sm font-bold text-white">Payroll Update</div>
                                                        </div>
                                                        <div className="text-xs text-slate-400 leading-relaxed">
                                                            Payroll for March has been processed successfully.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Chart Placeholder */}
                                            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-20" />
                                                <div className="flex items-end justify-between h-32 gap-2 mt-8">
                                                    {[40, 60, 45, 70, 55, 80, 65, 85].map((h, i) => (
                                                        <div key={i} className="w-full bg-primary/20 rounded-t-sm" style={{ height: `${h}%` }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Overlay Reflection */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                        </div>

                        {/* Ambient Glow */}
                        <div className="absolute -bottom-10 left-10 right-10 h-24 bg-primary/20 blur-[100px]" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
