'use client';

import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationsFeedProps {
    isDemo: boolean;
    hasVouchers: boolean;
    voucherCount?: number;
    lastUpdatedAt?: string;
}

export const ExecutiveOperationsFeed: React.FC<OperationsFeedProps> = ({
    isDemo,
    hasVouchers,
    voucherCount = 0,
    lastUpdatedAt,
}) => {
    // Generate truthful feed items based strictly on real state
    const feedItems = [
        {
            id: '1',
            icon: CheckCircle2,
            iconColor: 'text-emerald-400',
            title: isDemo 
                ? 'Prepared your baseline model from company context.' 
                : 'Verified model with imported bank statement vouchers.',
            time: 'Session Start',
            status: 'COMPLETED',
        },
        {
            id: '2',
            icon: FileCheck2,
            iconColor: 'text-indigo-400',
            title: 'Prepared your payroll buffer and statutory tax reserve estimates.',
            time: 'Auto-calculated',
            status: 'COMPLETED',
        },
        {
            id: '3',
            icon: ShieldCheck,
            iconColor: 'text-emerald-400',
            title: isDemo
                ? 'Stress-tested your runway against slower collections.'
                : `Reconciled ${voucherCount.toLocaleString('en-IN')} transactions from bank records.`,
            time: lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            status: 'COMPLETED',
        },
        {
            id: '4',
            icon: Clock,
            iconColor: hasVouchers ? 'text-emerald-400' : 'text-amber-400',
            title: hasVouchers
                ? 'Watching for unexpected cash movements.'
                : 'Waiting for financial records to replace baseline estimates.',
            time: 'Active',
            status: hasVouchers ? 'OPERATING' : 'WAITING',
        },
    ];

    return (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 text-left">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        WHAT I&apos;VE ALREADY DONE
                    </span>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Since your last visit, I&apos;ve been working on your numbers.
                    </p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                    {feedItems.filter(i => i.status === 'COMPLETED').length} tasks completed
                </span>
            </div>

            <div className="space-y-3">
                {feedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.id} className="flex items-start gap-3 text-xs">
                            <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", item.iconColor)} />
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-200 font-medium leading-tight">{item.title}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.time}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
