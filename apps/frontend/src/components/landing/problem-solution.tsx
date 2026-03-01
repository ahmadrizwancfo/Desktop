'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProblemSolution() {
    return (
        <section className="py-24 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Stop managing finance like it's 2015</h2>
                <p className="text-xl text-slate-400">
                    The difference between surviving and scaling is financial intelligence.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
                {/* The Old Way */}
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                    <div className="text-center mb-8">
                        <div className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">The Hard Way</div>
                        <h3 className="text-2xl font-bold text-slate-300">Manual Operations</h3>
                    </div>

                    <ul className="space-y-4">
                        {[
                            "Waiting 15 days for monthly P&L",
                            "Guessing runway based on bank balance",
                            "Manually reconciling GST returns",
                            "Surprise tax bills destroying cash flow",
                            "Investor reports take 2 days to prep"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-slate-400">
                                <div className="mt-1 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <X className="w-3 h-3 text-red-400" />
                                </div>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* The FounderCFO Way */}
                <div className="p-8 rounded-3xl bg-white/[0.05] border border-primary/20 relative overflow-hidden ring-1 ring-primary/50 shadow-2xl shadow-primary/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />

                    <div className="text-center mb-8">
                        <div className="text-sm font-bold text-primary uppercase tracking-widest mb-2">The FounderCFO Way</div>
                        <h3 className="text-2xl font-bold text-white">AI Automation</h3>
                    </div>

                    <ul className="space-y-4">
                        {[
                            "Real-time P&L and Balance Sheet",
                            "AI-predicted runway & scenario planning",
                            "Auto-reconciliation & 1-click GST filing",
                            "Proactive alerts for compliance & tax",
                            "Live investor dashboard links"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-white font-medium">
                                <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Check className="w-3 h-3 text-primary" />
                                </div>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
