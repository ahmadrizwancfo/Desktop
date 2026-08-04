'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NextStepRecommendationBar } from '@/components/navigation/next-step-recommendation-bar';
import { apiClient } from '@/lib/api-client';

export default function DailyBriefPage() {
    const [brief, setBrief] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showTrustDetails, setShowTrustDetails] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchDailyBrief();
    }, []);

    const fetchDailyBrief = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cfo-engine/daily-brief');
            if (res.data && res.data.brief) {
                setBrief(res.data.brief);
            }
        } catch (err) {
            console.error('Failed to fetch daily brief:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrepareActionFromBrief = async () => {
        if (!brief?.recommendedAction) return;
        try {
            const res = await apiClient.post('/cfo-engine/action-center/prepare', {
                sourceModule: 'Dashboard',
                actionType: brief.recommendedAction.actionCenterType || 'INVOICE_REMINDER',
                title: brief.recommendedAction.actionTitle,
                urgency: 'HIGH',
                financialImpact: '45000',
                payload: {
                    recipientEmail: 'client@company.com',
                    subject: brief.recommendedAction.actionTitle,
                    body: brief.recommendedAction.reasoning,
                },
            });

            if (res.status === 200 || res.status === 201) {
                router.push('/action-center');
            }
        } catch (e) {
            console.error('Failed to prepare action from brief:', e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-slate-300">Preparing today&apos;s CFO briefing &amp; priority recommendations...</p>
                </div>
            </div>
        );
    }

    if (!brief) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">☕</span>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            Founder Daily Brief
                        </h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {brief.formattedDate} • 2-Minute Executive Briefing • SSOT Trust Layer
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchDailyBrief}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                    >
                        🔄 Recompute Brief
                    </button>
                </div>
            </div>

            {/* ☕ 5-MINUTE MORNING CFO LOOP STEPPER */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                        5-Min Daily Loop
                    </span>
                    <p className="text-xs text-slate-300 font-semibold hidden sm:block">
                        1. Morning Readout $\rightarrow$ 2. Execute Action $\rightarrow$ 3. Simulate Runway
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrepareActionFromBrief}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95 flex items-center gap-1.5"
                    >
                        <span>⚡ Act Now</span>
                    </button>
                    <button
                        onClick={() => router.push('/simulator')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                    >
                        📈 Simulate
                    </button>
                </div>
            </div>

            {/* Section 1: Financial Snapshot */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Financial Snapshot</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Cash Balance</span>
                        <p className="text-base font-black text-white font-mono mt-0.5">₹{brief.snapshot.cashBalance}</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">24h Cash Delta</span>
                        <p className={`text-base font-black font-mono mt-0.5 ${parseFloat(brief.snapshot.cashDelta24h) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {parseFloat(brief.snapshot.cashDelta24h) >= 0 ? '+' : ''}₹{brief.snapshot.cashDelta24h}
                        </p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Monthly Net Burn</span>
                        <p className="text-base font-black text-rose-400 font-mono mt-0.5">₹{brief.snapshot.monthlyBurn}/mo</p>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Zero Cash Date</span>
                        <p className="text-base font-black text-white font-mono mt-0.5">{brief.snapshot.formattedZeroCashDate || 'Beyond 90D'}</p>
                    </div>
                </div>
            </div>

            {/* Section 2: What's New Yesterday */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. What Changed Yesterday</h3>
                <div className="space-y-2">
                    {brief.whatsNew.map((item: any) => (
                        <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-200">{item.title}</span>
                            <span className="font-mono font-bold text-white">{item.amount}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 3: Ranked Risks & Opportunities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risks */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">3. Active Risks (Ranked)</h3>
                    <div className="space-y-2">
                        {brief.risks.map((r: any) => (
                            <div key={r.id} className="p-3 bg-slate-950 border border-rose-900/40 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white">{r.title}</h4>
                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-500/20 text-rose-400">{r.severity}</span>
                                </div>
                                <p className="text-[11px] text-slate-400">{r.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Opportunities */}
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">4. Prioritized Opportunities</h3>
                    <div className="space-y-2">
                        {brief.opportunities.map((opp: any) => (
                            <div key={opp.id} className="p-3 bg-slate-950 border border-emerald-900/40 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-white">{opp.title}</h4>
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold">+{opp.expectedRunwayImpactDays} Days</span>
                                </div>
                                <p className="text-[11px] text-slate-400">{opp.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section 4: Single Priority Recommended Action */}
            <div className="p-6 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl space-y-4 shadow-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    5. Today&apos;s Single Priority Recommended Action
                </span>

                <div className="space-y-2">
                    <h2 className="text-lg font-black text-white">{brief.recommendedAction.actionTitle}</h2>
                    <p className="text-xs text-emerald-200">{brief.recommendedAction.reasoning}</p>
                </div>

                {/* Action Workflow Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                        onClick={handlePrepareActionFromBrief}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
                    >
                        <span>⚡</span> Prepare Action in Action Center ➔
                    </button>
                    <Link
                        href="/decision-lab"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                        🔬 Simulate in Decision Lab
                    </Link>
                </div>
            </div>

            {/* Section 5: Trust Layer Evidence & Data Sources */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Trust Layer Evidence</h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                        {Math.round(brief.trustLayer.confidenceScore * 100)}% Confidence
                    </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono text-slate-300">
                    {brief.trustLayer.supportingEvidence.map((ev: string, i: number) => (
                        <p key={i}>✓ {ev}</p>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                    <span>Cited Data Sources:</span>
                    {brief.trustLayer.dataSources.map((ds: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-300">{ds}</span>
                    ))}
                </div>
            </div>

            {/* Next Step Bar */}
            <NextStepRecommendationBar
                title="Daily Brief Complete"
                description="What would you like to do next?"
                steps={[
                    { label: '⚡ Execute Prepared Actions', href: '/action-center', variant: 'emerald', icon: '⚡' },
                    { label: '🔬 Open Decision Lab', href: '/decision-lab', variant: 'primary', icon: '🔬' },
                    { label: '📊 Return to Executive Dashboard', href: '/dashboard', variant: 'secondary' },
                ]}
            />
        </div>
    );
}
