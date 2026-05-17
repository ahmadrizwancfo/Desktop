'use client';

import React from 'react';
import { BrainCircuit, ShieldCheck, Database, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState, getTimeSince } from '@/store/cfo-state-store';

export function StatusRibbon({ state }: { state: CFOState }) {
    const isCritical = state.dashboardMode === 'CRITICAL';
    const isWarning = state.dashboardMode === 'WARNING';

    return (
        <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className={cn(
                "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2",
                isCritical ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                isWarning ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            )}>
                <BrainCircuit className="w-3.5 h-3.5" />
                AI CFO ENGINE: {state.dashboardMode === 'STABLE' ? 'STABLE' : state.dashboardMode}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" />
                FINANCIAL CONSISTENCY: {Math.round(state.dynamicConfidence.score)}%
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400 uppercase tracking-widest">
                <Database className="w-3.5 h-3.5" />
                DATA SOURCE: {state.trust.dataSource}
                {state.trust.dataSource === 'MANUAL' && (
                    <button className="ml-2 px-2 py-0.5 bg-sky-500 text-white rounded text-[8px] hover:bg-sky-400 transition-colors">
                        CONNECT ZOHO
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-black text-slate-300 uppercase tracking-widest ml-auto">
                <Clock className="w-3.5 h-3.5" />
                LAST SYNCED: {getTimeSince(state.trust.lastSyncedAt)}
            </div>
        </div>
    );
}
