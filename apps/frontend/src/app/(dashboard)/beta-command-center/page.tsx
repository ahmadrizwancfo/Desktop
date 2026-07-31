'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function BetaCommandCenterPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'FUNNEL' | 'DIRECTORY' | 'FEEDBACK' | 'ROADMAP'>('FUNNEL');
    const [searchDirectory, setSearchDirectory] = useState('');

    useEffect(() => {
        fetchCommandCenterData();
    }, []);

    const fetchCommandCenterData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cfo-engine/beta-command-center');
            if (res.data) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch beta command center data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold text-slate-300">Loading Internal Beta Command Center Telemetry...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const filteredDirectory = data.founderDirectory.filter((f: any) =>
        f.organizationName.toLowerCase().includes(searchDirectory.toLowerCase()) ||
        f.industry.toLowerCase().includes(searchDirectory.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Internal Confidential Banner */}
            <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-rose-300 font-mono">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>INTERNAL ONLY • FOUNDERCFO BETA COMMAND CENTER • DO NOT EXPOSE TO CUSTOMERS</span>
                </div>
                <span>Confidential Engineering Cockpit</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Private Beta Command Center
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Product Telemetry • Founder Adoption Funnel • Feedback Inbox • Automated Roadmap Insights
                    </p>
                </div>
                <button
                    onClick={fetchCommandCenterData}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                >
                    🔄 Refresh Telemetry
                </button>
            </div>

            {/* Top KPI Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total Beta Organizations</span>
                    <p className="text-2xl font-black text-white mt-1">{data.summary.totalBetaOrgs}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active Founders</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{data.summary.activeFoundersCount}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Actions Approved</span>
                    <p className="text-2xl font-black text-white mt-1">{data.summary.totalActionsApproved}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Founder Health Score</span>
                    <p className="text-2xl font-black text-indigo-400 mt-1">{data.summary.avgHealthScore}/100</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setTab('FUNNEL')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'FUNNEL' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    📉 Adoption Funnel
                </button>
                <button
                    onClick={() => setTab('DIRECTORY')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'DIRECTORY' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    👥 Founder Directory ({data.founderDirectory.length})
                </button>
                <button
                    onClick={() => setTab('FEEDBACK')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'FEEDBACK' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    📥 Feedback Inbox ({data.feedbackInbox.length})
                </button>
                <button
                    onClick={() => setTab('ROADMAP')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'ROADMAP' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    🤖 Roadmap Insights
                </button>
            </div>

            {/* TAB 1: WORKFLOW FUNNEL */}
            {tab === 'FUNNEL' && (
                <div className="space-y-6">
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Product Activation Funnel Conversion</h3>

                        <div className="space-y-3 font-mono text-xs">
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span>1. Signups & Onboarding</span>
                                <span className="font-bold text-white">{data.funnel.signups} Orgs (100%)</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span>2. Data Integration Connected</span>
                                <span className="font-bold text-white">{data.funnel.dataConnected} Orgs ({Math.round((data.funnel.dataConnected / data.funnel.signups) * 100)}%)</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span>3. Daily Briefing Viewed</span>
                                <span className="font-bold text-emerald-400">{data.funnel.briefViewed} Orgs ({Math.round((data.funnel.briefViewed / data.funnel.signups) * 100)}%)</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span>4. Decision Lab Simulation Executed</span>
                                <span className="font-bold text-indigo-400">{data.funnel.decisionLabUsed} Orgs ({Math.round((data.funnel.decisionLabUsed / data.funnel.signups) * 100)}%)</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span>5. Action Prepared & Approved</span>
                                <span className="font-bold text-cyan-400">{data.funnel.actionApproved} Orgs ({data.funnel.conversionRatePercent}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Feature Usage Rankings */}
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Feature Engagement Rankings</h3>
                        <div className="space-y-2 text-xs">
                            {data.featureUsage.map((f: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <span className="font-semibold text-white">{idx + 1}. {f.featureName}</span>
                                    <span className="font-mono text-slate-400">{f.eventCount} Events ({f.uniqueOrgsCount} Unique Orgs)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: FOUNDER DIRECTORY */}
            {tab === 'DIRECTORY' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            placeholder="Search founder organization name..."
                            value={searchDirectory}
                            onChange={(e) => setSearchDirectory(e.target.value)}
                            className="w-72 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                        />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                <tr>
                                    <th className="p-3">Organization</th>
                                    <th className="p-3">Industry</th>
                                    <th className="p-3">Integrations</th>
                                    <th className="p-3">Last Active</th>
                                    <th className="p-3 text-center">Health Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                                {filteredDirectory.map((f: any) => (
                                    <tr key={f.organizationId} className="hover:bg-slate-800/50 transition">
                                        <td className="p-3 font-sans font-bold text-white">{f.organizationName}</td>
                                        <td className="p-3 font-sans">{f.industry}</td>
                                        <td className="p-3">{f.connectedIntegrationsCount} Connected</td>
                                        <td className="p-3 text-slate-400">{new Date(f.lastActiveTimestamp).toLocaleDateString()}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                f.healthStatus === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' :
                                                f.healthStatus === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-rose-500/20 text-rose-400'
                                            }`}>
                                                {f.healthScore}/100 ({f.healthStatus})
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: BETA FEEDBACK INBOX */}
            {tab === 'FEEDBACK' && (
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Beta Founder Feedback Inbox ({data.feedbackInbox.length})</h3>
                    <div className="space-y-3">
                        {data.feedbackInbox.map((fb: any) => (
                            <div key={fb.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fb.rating === 'THUMBS_UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {fb.rating === 'THUMBS_UP' ? '👍 HELPFUL' : '👎 BUG / ISSUE'}
                                        </span>
                                        <span className="font-mono text-slate-400">Path: {fb.path}</span>
                                    </div>
                                    <span className="font-mono text-slate-500">{new Date(fb.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-200 font-medium">{fb.feedbackText}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: AUTOMATED ROADMAP INSIGHTS */}
            {tab === 'ROADMAP' && (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Automated Roadmap Priorities (Evidence-Based)</h3>

                    <div className="space-y-3 text-xs">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Most Used Feature</span>
                            <p className="text-sm font-bold text-white mt-0.5">{data.roadmapInsights.mostUsedFeature}</p>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Top Friction Point</span>
                            <p className="text-sm font-bold text-rose-400 mt-0.5">{data.roadmapInsights.topFrictionPoint}</p>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Recommended Next Sprint Priority</span>
                            <p className="text-sm font-bold text-emerald-400 mt-0.5">{data.roadmapInsights.recommendedNextSprintPriority}</p>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Evidence Summary</span>
                            <p className="text-xs text-slate-300 mt-0.5">{data.roadmapInsights.evidenceSummary}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
