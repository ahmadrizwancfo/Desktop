'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export interface DailyCashPosition {
    date: string;
    formattedDate: string;
    openingBalance: string;
    inflow: string;
    outflow: string;
    closingBalance: string;
    riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface CashflowProjectionResult {
    organizationId: string;
    zeroCashDate: string | null;
    formattedZeroCashDate: string | null;
    minimumCashPoint: {
        amount: string;
        date: string;
        formattedDate: string;
    };
    riskWindowStart: string | null;
    dailyPositions: DailyCashPosition[];
    computedAt: string;
}

export function CashflowTimelineWorkspace() {
    const [projection, setProjection] = useState<CashflowProjectionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'WARNING_ONLY'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTimeline();
    }, []);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cfo-engine/cashflow-timeline');
            if (res.data) {
                setProjection(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch cashflow timeline:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Computing 90-Day Cashflow Timeline...</p>
                </div>
            </div>
        );
    }

    if (!projection) {
        return (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400">
                <p className="text-sm">No cashflow timeline data available.</p>
                <button onClick={fetchTimeline} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg">
                    Retry Projection
                </button>
            </div>
        );
    }

    const filteredPositions = projection.dailyPositions.filter(p => {
        if (filter === 'WARNING_ONLY' && p.riskLevel === 'SAFE') return false;
        if (searchTerm && !p.date.includes(searchTerm) && !p.formattedDate.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Top Zero Cash Banner */}
            <div className={`p-6 rounded-2xl border ${projection.formattedZeroCashDate ? 'bg-rose-950/40 border-rose-800/60' : 'bg-emerald-950/40 border-emerald-800/60'} shadow-xl backdrop-blur-md`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${projection.formattedZeroCashDate ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`}></span>
                            <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                                90-Day Predictive Cash Runway
                            </h2>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
                            {projection.formattedZeroCashDate ? (
                                <span>Zero Cash Date: <span className="text-rose-400 underline decoration-rose-500/50">{projection.formattedZeroCashDate}</span></span>
                            ) : (
                                <span className="text-emerald-400">Cash-Flow Sustainable (90+ Days)</span>
                            )}
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Lowest Cash Point: <span className="font-semibold text-slate-200">₹{projection.minimumCashPoint.amount}</span> on {projection.minimumCashPoint.formattedDate}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={fetchTimeline} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition">
                            🔄 Recompute
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        All 90 Days ({projection.dailyPositions.length})
                    </button>
                    <button
                        onClick={() => setFilter('WARNING_ONLY')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${filter === 'WARNING_ONLY' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        Warning & Critical Only
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search date (e.g. 14 Nov)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
            </div>

            {/* Daily Position Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 text-slate-400 font-semibold sticky top-0 backdrop-blur-md border-b border-slate-800">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Opening Cash</th>
                                <th className="p-3">Expected Inflow</th>
                                <th className="p-3">Expected Outflow</th>
                                <th className="p-3">Closing Cash</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {filteredPositions.map((day, i) => {
                                const isZeroDay = day.date === projection.zeroCashDate;
                                return (
                                    <tr key={i} className={`hover:bg-slate-800/50 transition ${isZeroDay ? 'bg-rose-950/50 font-bold' : ''}`}>
                                        <td className="p-3 font-mono text-slate-200">{day.formattedDate}</td>
                                        <td className="p-3 font-mono">₹{day.openingBalance}</td>
                                        <td className="p-3 font-mono text-emerald-400">{parseFloat(day.inflow) > 0 ? `+₹${day.inflow}` : '-'}</td>
                                        <td className="p-3 font-mono text-rose-400">{parseFloat(day.outflow) > 0 ? `-₹${day.outflow}` : '-'}</td>
                                        <td className="p-3 font-mono font-semibold text-white">₹{day.closingBalance}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                day.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                                                day.riskLevel === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                            }`}>
                                                {day.riskLevel}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
