'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit, ArrowRight } from 'lucide-react';

interface BottomInsightBannerProps {
    insight?: string;
    actionHint?: string;
}

export function BottomInsightBanner({
    insight = "Your collections slowdown is the primary risk to your cash runway.",
    actionHint = "Focus on enterprise accounts receivable follow-ups."
}: BottomInsightBannerProps) {
    return (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0c1322] to-indigo-950/40 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-2xl">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI CFO Insight</span>
                        <span className="text-slate-600 text-xs">•</span>
                        <span className="text-xs font-semibold text-white truncate">{insight}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium truncate">{actionHint}</p>
                </div>
            </div>

            <Link
                href="/ai-cfo"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
                <span>Ask AI CFO</span>
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}
