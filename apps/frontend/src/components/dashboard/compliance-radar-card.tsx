'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';

export function ComplianceRadarCard() {
    const complianceItems = [
        {
            id: '1',
            title: 'GST–GSTR-1 Filing',
            subtitle: 'Outward supplies return',
            daysLeft: '2d',
            dueDate: 'Due 7 May',
            badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
            badgeText: 'DUE SOON',
        },
        {
            id: '2',
            title: 'PF/ESI Deposit',
            subtitle: 'Monthly payroll contribution',
            daysLeft: '6d',
            dueDate: 'Due 11 May',
            badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            badgeText: 'DUE',
        },
        {
            id: '3',
            title: 'GSTR-3B Filing',
            subtitle: 'Summary tax return',
            daysLeft: '11d',
            dueDate: 'Due 16 May',
            badgeBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
            badgeText: 'DUE',
        },
        {
            id: '4',
            title: 'TDS Deposit',
            subtitle: 'Section 194C/194J TDS',
            daysLeft: '29d',
            dueDate: 'Due 3 Jun',
            badgeBg: 'bg-white/5 text-slate-400 border-white/5',
            badgeText: 'UPCOMING',
        },
        {
            id: '5',
            title: 'Advance Tax Q2 (45%)',
            subtitle: 'AY 2025-26 statutory liability',
            daysLeft: '37d',
            dueDate: 'Due 11 Jun',
            badgeBg: 'bg-white/5 text-slate-400 border-white/5',
            badgeText: 'UPCOMING',
        },
    ];

    return (
        <div className="p-6 rounded-[2rem] bg-[#0c1322] border border-white/[0.08] space-y-6 text-left shadow-xl">
            {/* Header */}
            <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] block mb-1">
                    Compliance Radar
                </span>
                <p className="text-xs text-slate-400 font-medium">
                    Upcoming Indian statutory compliance that needs attention
                </p>
            </div>

            {/* List */}
            <div className="space-y-3">
                {complianceItems.map((item) => (
                    <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3 group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${item.badgeBg}`}>
                                {item.badgeText}
                            </span>
                            <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium truncate">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="text-xs font-black text-rose-400 font-mono block">
                                ⏱ {item.daysLeft}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">
                                {item.dueDate}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Link */}
            <div className="pt-2">
                <Link
                    href="/compliance"
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                >
                    <span>View all compliance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
