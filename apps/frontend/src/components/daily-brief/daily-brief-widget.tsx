'use client';

import React from 'react';
import Link from 'next/link';

interface DailyBriefWidgetProps {
    brief: any;
    loading: boolean;
}

export function DailyBriefWidget({ brief, loading }: DailyBriefWidgetProps) {
    if (loading) {
        return (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                <div className="animate-pulse flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Generating Founder Daily Brief...</span>
                </div>
            </div>
        );
    }

    if (!brief) return null;

    return (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">☕</span>
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Founder Daily Brief</h3>
                        <p className="text-[10px] text-slate-400">{brief.formattedDate} • 2-Min Read</p>
                    </div>
                </div>
                <Link
                    href="/daily-brief"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                >
                    Read Full Brief ➔
                </Link>
            </div>

            {/* Quick Metrics Line */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block font-sans">Cash Balance</span>
                    <span className="font-bold text-white">₹{brief.snapshot.cashBalance}</span>
                </div>
                <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block font-sans">24h Delta</span>
                    <span className={`font-bold ${parseFloat(brief.snapshot.cashDelta24h) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(brief.snapshot.cashDelta24h) >= 0 ? '+' : ''}₹{brief.snapshot.cashDelta24h}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] uppercase text-slate-400 font-bold block font-sans">Zero Cash Date</span>
                    <span className="font-bold text-rose-400">{brief.snapshot.formattedZeroCashDate || 'Beyond 90D'}</span>
                </div>
            </div>

            {/* Today's Single Recommended Action */}
            {brief.recommendedAction && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                    <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">Today&apos;s Single Priority Action</span>
                        <p className="text-xs font-bold text-white mt-0.5">{brief.recommendedAction.actionTitle}</p>
                    </div>
                    <Link
                        href="/action-center"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition whitespace-nowrap shadow-lg shadow-emerald-950/50"
                    >
                        ⚡ Execute ➔
                    </Link>
                </div>
            )}
        </div>
    );
}
