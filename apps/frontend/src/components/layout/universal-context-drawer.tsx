'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function UniversalContextDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [liveState, setLiveState] = useState<any>(null);
    const [timeline, setTimeline] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchContext();
    }, []);

    const fetchContext = async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const resState = await fetch('/api/cfo-engine/state', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            const resTimeline = await fetch('/api/cfo-engine/cashflow-timeline', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (resState.ok) {
                const dataState = await resState.json();
                setLiveState(dataState);
            }
            if (resTimeline.ok) {
                const dataTimeline = await resTimeline.json();
                setTimeline(dataTimeline);
            }
        } catch (e) {
            console.error('Failed to fetch universal context:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-40 print:hidden">
            {/* Floating Context Pill Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-full shadow-2xl transition backdrop-blur-md group"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider">Universal Context</span>
                    {liveState && (
                        <span className="text-xs font-mono text-emerald-400 font-bold border-l border-slate-700 pl-2">
                            ₹{liveState.cashInBank || '0.00'}
                        </span>
                    )}
                </button>
            )}

            {/* Persistent Slide-Out Context Drawer */}
            {isOpen && (
                <div className="w-80 md:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-xl transition">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🌐</span>
                            <div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Universal Financial Context</h3>
                                <p className="text-[10px] text-slate-400">Live SSOT Metrics • Persistent Across Routes</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-xs text-slate-400">Loading SSOT Context...</div>
                    ) : (
                        <div className="space-y-3">
                            {/* Live Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-[9px] uppercase text-slate-400 font-bold">Cash Balance</span>
                                    <p className="text-sm font-black text-white font-mono mt-0.5">₹{liveState?.cashInBank || '0.00'}</p>
                                </div>
                                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="text-[9px] uppercase text-slate-400 font-bold">Monthly Net Burn</span>
                                    <p className="text-sm font-black text-rose-400 font-mono mt-0.5">₹{liveState?.netBurn || '0.00'}</p>
                                </div>
                            </div>

                            {/* Zero Cash Timeline Box */}
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Zero Cash Date</span>
                                    <p className="text-xs font-extrabold text-white mt-0.5">
                                        {timeline?.formattedZeroCashDate || 'Beyond 90 Days'}
                                    </p>
                                </div>
                                <Link
                                    href="/cashflow-operating-system"
                                    className="px-2.5 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition"
                                >
                                    View Timeline ➔
                                </Link>
                            </div>

                            {/* Quick Navigation Shortcuts */}
                            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                <Link href="/decision-lab" className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-semibold block">
                                    🔬 Decision Lab
                                </Link>
                                <Link href="/action-center" className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-semibold block">
                                    ⚡ Action Center
                                </Link>
                                <Link href="/timeline" className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-semibold block">
                                    📜 Global History
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
