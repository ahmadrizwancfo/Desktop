'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProblemSolution() {
    return (
        <section className="py-24 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Stop guessing your finances</h2>
                <p className="text-xl text-slate-400">
                    Most founders rely on spreadsheets and gut instinct. FounderCFO gives you real answers.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
                {/* The Old Way */}
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden group/manual">
                    <div className="text-center mb-8">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">The Legacy Way</div>
                        <h3 className="text-2xl font-black text-slate-300 editorial tracking-tight">Manual Operations</h3>
                    </div>

                    <ul className="space-y-5">
                        {[
                            "Spreadsheets everywhere",
                            "No real-time runway visibility",
                            "Reactive financial decisions",
                            "Manual bank reconciliation",
                            "Surprise tax bills"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-500 font-light">
                                <div className="mt-1 w-5 h-5 rounded-full bg-red-500/5 flex items-center justify-center shrink-0">
                                    <X className="w-3 h-3 text-red-500/50" />
                                </div>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* The FounderCFO Way */}
                <div className="p-8 rounded-3xl bg-white/[0.04] border border-primary/20 relative overflow-hidden group/cfo transition-all hover:bg-white/[0.06] hover:-translate-y-1">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/cfo:opacity-100 transition-opacity blur-3xl pointer-events-none" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />

                    <div className="text-center mb-8 relative z-10">
                        <div className="text-xs font-black text-primary uppercase tracking-widest mb-2">The FounderCFO Way</div>
                        <h3 className="text-2xl font-black text-white editorial tracking-tight">AI Financial OS</h3>
                    </div>

                    <ul className="space-y-5 relative z-10">
                        {[
                            "Live runway tracking",
                            "AI-driven growth decisions",
                            "Automated data sync",
                            "Weekly financial clarity",
                            "Predictive cash forecasting"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-white font-medium">
                                <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                                    <Check className="w-3 h-3 text-primary" />
                                </div>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Subtle Hover Glow */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px] rounded-full opacity-0 group-hover/cfo:opacity-100 transition-opacity" />
                </div>
            </div>
        </section>
    );
}
