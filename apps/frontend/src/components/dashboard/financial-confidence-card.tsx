'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, ShieldCheck } from 'lucide-react';

interface FinancialConfidenceCardProps {
    isDemo: boolean;
    confidenceScore?: number;
}

export function FinancialConfidenceCard({ isDemo, confidenceScore = 68 }: FinancialConfidenceCardProps) {
    const verifiedPct = isDemo ? 20 : 68;
    const operatingPct = isDemo ? 10 : 12;
    const estimatedPct = 100 - verifiedPct - operatingPct;

    return (
        <div className="p-6 rounded-[2rem] bg-[#0c1322] border border-white/[0.08] space-y-6 text-left shadow-xl">
            {/* Header */}
            <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] block mb-1">
                    Financial Confidence
                </span>
                <p className="text-xs text-slate-400 font-medium">
                    How much of your data is real vs estimated
                </p>
            </div>

            {/* Donut Visual */}
            <div className="flex items-center justify-between gap-4 py-2">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background track */}
                        <path
                            className="text-slate-800"
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Level 1 Estimated (Yellow) */}
                        <path
                            className="text-amber-400 transition-all duration-1000"
                            strokeDasharray={`${estimatedPct}, 100`}
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Level 2 Verified (Emerald) */}
                        <path
                            className="text-emerald-400 transition-all duration-1000"
                            strokeDasharray={`${verifiedPct}, 100`}
                            strokeDashoffset={`-${estimatedPct}`}
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Level 3 Operating (Sky) */}
                        <path
                            className="text-sky-400 transition-all duration-1000"
                            strokeDasharray={`${operatingPct}, 100`}
                            strokeDashoffset={`-${estimatedPct + verifiedPct}`}
                            strokeWidth="3.8"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black text-white leading-none">{verifiedPct}%</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Verified</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 text-xs font-medium">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                            <span className="text-slate-300 text-[11px]">Level 3 — Operating</span>
                        </div>
                        <span className="font-bold text-white font-mono text-[11px]">{operatingPct}%</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <span className="text-slate-300 text-[11px]">Level 2 — Verified</span>
                        </div>
                        <span className="font-bold text-white font-mono text-[11px]">{verifiedPct}%</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="text-slate-300 text-[11px]">Level 1 — Estimated</span>
                        </div>
                        <span className="font-bold text-white font-mono text-[11px]">{estimatedPct}%</span>
                    </div>
                </div>
            </div>

            {/* Context Box */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">What this means</span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {isDemo 
                        ? "Your core baseline is estimated. Connect bank records or Tally Prime XML to upgrade to Verified confidence."
                        : "Your core cash, burn and runway are verified. Connect more data sources to improve confidence."}
                </p>
            </div>

            {/* CTA */}
            <Link
                href="/integrations"
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Improve Confidence
            </Link>
        </div>
    );
}
