'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NextStepRecommendationBar } from '@/components/navigation/next-step-recommendation-bar';

export interface TimelineEvent {
    id: string;
    eventType: 'ALERT' | 'SIMULATION' | 'ACTION_APPROVED' | 'ACTION_PREPARED' | 'STATE_CHANGE';
    module: string;
    title: string;
    description: string;
    timestamp: string;
    financialImpact?: string;
    deepLinkHref?: string;
}

export default function GlobalTimelinePage() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTimelineEvents();
    }, []);

    const fetchTimelineEvents = async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/cfo-engine/history', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                const formatted: TimelineEvent[] = [];

                // Format Decision Events
                if (data.decisions) {
                    data.decisions.forEach((d: any) => {
                        formatted.push({
                            id: `dec_${d.id}`,
                            eventType: d.acted ? 'ACTION_APPROVED' : 'SIMULATION',
                            module: 'Decision Lab',
                            title: d.decisionStatement || 'CFO Decision Scenario',
                            description: `Choice: ${d.optionChosen || 'Evaluated'} | Runway impact: +${d.runwayDelta || 0} days`,
                            timestamp: d.createdAt,
                            financialImpact: `${d.runwayDelta || 0} days`,
                            deepLinkHref: '/decision-lab',
                        });
                    });
                }

                // Format Snapshots
                if (data.snapshots) {
                    data.snapshots.forEach((s: any) => {
                        formatted.push({
                            id: `snap_${s.id}`,
                            eventType: 'STATE_CHANGE',
                            module: 'LiveState Engine',
                            title: 'Financial Position Snapshot Updated',
                            description: `Cash balance: ₹${s.cashInBank} | Net burn: ₹${s.netBurn}/mo`,
                            timestamp: s.generatedAt,
                            financialImpact: `₹${s.cashInBank}`,
                            deepLinkHref: '/cashflow-operating-system',
                        });
                    });
                }

                formatted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setEvents(formatted);
            }
        } catch (err) {
            console.error('Failed to fetch global timeline:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Global Decision Timeline
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Unified Chronological Audit Trail • Alerts, Simulations, Approvals & Live State Changes
                    </p>
                </div>
                <button
                    onClick={fetchTimelineEvents}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                >
                    🔄 Refresh Events
                </button>
            </div>

            {/* Timeline Stream */}
            {loading ? (
                <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs">Loading Global Timeline Event Stream...</p>
                    </div>
                </div>
            ) : events.length === 0 ? (
                <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
                    <span className="text-3xl block mb-1">📜</span>
                    <p className="text-sm font-semibold text-slate-300">No Timeline Events Recorded Yet</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
                    {events.map((ev) => (
                        <div key={ev.id} className="relative group">
                            {/* Dot Badge */}
                            <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-950 ${
                                ev.eventType === 'ACTION_APPROVED' ? 'bg-emerald-500' :
                                ev.eventType === 'SIMULATION' ? 'bg-indigo-500' :
                                ev.eventType === 'ALERT' ? 'bg-rose-500' :
                                'bg-cyan-500'
                            }`}></span>

                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl hover:border-slate-700 transition">
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                    <span className="px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                        {ev.module}
                                    </span>
                                    <span className="font-mono text-slate-400">
                                        {new Date(ev.timestamp).toLocaleString()}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-white">{ev.title}</h3>
                                    <p className="text-xs text-slate-300 mt-0.5">{ev.description}</p>
                                </div>

                                {ev.deepLinkHref && (
                                    <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                                        <Link
                                            href={ev.deepLinkHref}
                                            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                        >
                                            View Source Module ➔
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Next-Step Guidance */}
            <NextStepRecommendationBar
                title="Connected Journey Complete"
                description="Simulate a new scenario or review pending action items in Action Center."
                steps={[
                    { label: '🔬 Open Decision Lab', href: '/decision-lab', variant: 'emerald', icon: '🔬' },
                    { label: '⚡ Open Action Center', href: '/action-center', variant: 'primary', icon: '⚡' },
                    { label: '📊 Return to Dashboard', href: '/dashboard', variant: 'secondary' },
                ]}
            />
        </div>
    );
}
