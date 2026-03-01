'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MonthlyFounderReport() {
    const currentMonth = "April 2026";
    const status = "WATCH"; // STABLE | WATCH | CRITICAL
    const [completedActions, setCompletedActions] = React.useState<number[]>([]);

    return (
        <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white text-slate-900 rounded-none shadow-2xl relative overflow-hidden" id="founder-report">
            {/* Print/Download Actions (Hidden in Print) */}
            <div className="absolute top-8 right-8 flex gap-2 print:hidden">
                <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                    <Share2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <Download className="w-4 h-4" /> Export PDF
                </button>
            </div>

            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <div className="text-2xl font-black tracking-tighter text-slate-900 mb-1">FounderCFO Report</div>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Calendar className="w-4 h-4" /> {currentMonth}
                    </div>
                </div>
                <div className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border",
                    status === 'WATCH' ? "bg-amber-500 text-white border-amber-600" : "bg-emerald-500 text-white border-emerald-600"
                )}>
                    Status: {status}
                </div>
            </div>

            {/* Executive Summary */}
            <section className="mb-12">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Executive Summary</h3>
                <div className="text-xl md:text-2xl font-serif text-slate-800 leading-relaxed">
                    "Cash burn increased by <span className="font-bold text-rose-600">18%</span> this month primarily driven by the new AWS infrastructure for the AI model training. While revenue is tracking correctly, we recommend <span className="underline decoration-amber-500 decoration-2 underline-offset-4">freezing non-essential SaaS spend</span> to maintaining the 18-month runway target."
                </div>
            </section>

            {/* High-Level Numbers */}
            <section className="grid grid-cols-3 gap-8 mb-12 border-b border-slate-100 pb-12">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Cash Balance</div>
                    <div className="text-3xl font-black text-slate-900">₹1.24 Cr</div>
                    <div className="text-xs font-bold text-rose-500 mt-1 flex items-center">
                        <TrendingDown className="w-3 h-3 mr-1" /> ₹4.5L (Burn)
                    </div>
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Revenue (ARR)</div>
                    <div className="text-3xl font-black text-slate-900">₹85.2 L</div>
                    <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" /> +12% MoM
                    </div>
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Runway</div>
                    <div className="text-3xl font-black text-slate-900">16.2 Mo</div>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                        Target: 18 Mo
                    </div>
                </div>
            </section>

            {/* What Changed Narrative */}
            <section className="mb-12">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">What Changed?</h3>
                <div className="space-y-4">
                    {[
                        { icon: AlertCircle, color: "text-amber-600 bg-amber-50", title: "Infrastructure Costs Spiked", desc: "EC2 instances for training grew 40% MoM. Is this temporary or the new normal?" },
                        { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", title: "Sales Cycle Shortened", desc: "Average deal closure time dropped from 45 days to 32 days." },
                        { icon: TrendingUp, color: "text-indigo-600 bg-indigo-50", title: "New Hires Onboarded", desc: "2 Senior Engineers joined. Payroll impact starts fully in May." }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", item.color)}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-sm mb-1">{item.title}</div>
                                <div className="text-slate-600 text-sm leading-relaxed">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Strategic Actions */}
            <section className="bg-slate-900 text-white p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full" />

                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 relative z-10">3 Recommended Actions</h3>
                <div className="space-y-6 relative z-10">
                    {[
                        { title: "Review AWS Reserved Instances", action: "Potentially save ₹45k/mo by committing for 1 year." },
                        { title: "Invoice 'Tyke Corp' immediately", action: "₹2.5L payment is 5 days overdue. Send reminder." },
                        { title: "Move excess cash to FD", action: "₹50L is sitting idle in current account. Earn 6.5% via sweep-in." }
                    ].map((action, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-4 group cursor-pointer"
                            onClick={() => {
                                setCompletedActions(prev =>
                                    prev.includes(i)
                                        ? prev.filter(x => x !== i)
                                        : [...prev, i]
                                );
                            }}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors",
                                completedActions.includes(i)
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white/10 group-hover:bg-primary"
                            )}>
                                {completedActions.includes(i) ? '✓' : i + 1}
                            </div>
                            <div className={cn(
                                "flex-1 border-b border-white/10 pb-4 group-last:border-0 group-last:pb-0 transition-opacity",
                                completedActions.includes(i) && "opacity-50"
                            )}>
                                <div className={cn(
                                    "font-bold text-lg mb-1 transition-colors",
                                    completedActions.includes(i) ? "line-through text-slate-500" : "group-hover:text-primary"
                                )}>{action.title}</div>
                                <div className="text-slate-400 text-sm">{action.action}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-opacity opacity-0 group-hover:opacity-100" />
                        </div>
                    ))}
                </div>
            </section>

            <div className="text-center mt-12 text-slate-400 text-xs">
                Generated automatically by FounderCFO Intelligence Engine • Confidential
            </div>
        </div>
    );
}
