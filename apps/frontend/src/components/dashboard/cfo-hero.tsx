import React from 'react';
import { Activity, BrainCircuit, RotateCw, CheckCircle2, AlertCircle, Info, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTimeSince, CFOState } from '@/store/cfo-state-store';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { KeyMetrics } from './key-metrics';

import { useRouter } from 'next/navigation';

interface CfoHeroProps {
    state: CFOState;
}

export function CfoHero({ state }: CfoHeroProps) {
    const { narrative, dashboardMode, generatedAt, dynamicConfidence, versionId, delta } = state;
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await apiClient.post('/cfo-engine/state/invalidate');
            await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        } finally {
            setTimeout(() => setIsRefreshing(false), 800);
        }
    };
    
    const isCritical = dashboardMode === 'CRITICAL';
    const isWarning = dashboardMode === 'WARNING';
    const ConfidenceIcon = dynamicConfidence.score >= 80 ? CheckCircle2 : dynamicConfidence.score >= 50 ? AlertCircle : Info;

    const hasSignificantChanges = (delta.runwayChangeDays && Math.abs(delta.runwayChangeDays) > 0);

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative pt-6 pb-2"
        >
            {/* Background Glow */}
            <div className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[150px] rounded-full pointer-events-none opacity-20",
                isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
            )} />

            <div className="relative z-10">
                {/* Decision Engine Badge & Trust Indicators */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
                        isCritical ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]" :
                        isWarning ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    )}>
                        <BrainCircuit className="w-3 h-3" />
                        AI CFO Engine • {dashboardMode}
                    </div>

                    <div className="group relative flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 cursor-help">
                        <ConfidenceIcon className={cn("w-3 h-3", 
                            dynamicConfidence.score >= 80 ? "text-emerald-400" : 
                            dynamicConfidence.score >= 50 ? "text-amber-400" : "text-rose-400"
                        )} />
                        {dynamicConfidence.meaning} ({dynamicConfidence.score}%)

                        {/* Confidence Breakdown Tooltip */}
                        <div className="absolute top-full left-0 mt-2 w-72 p-4 rounded-2xl bg-[#0d1222] border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <h4 className="text-white text-xs font-black mb-3 uppercase tracking-widest">Why this score?</h4>
                            <p className="text-[10px] text-slate-400 mb-4 leading-tight">
                                {state.trust.confidenceExplanation || (dynamicConfidence.score >= 80 ? "Complete bank data and recent sync provide high certainty." :
                                 dynamicConfidence.score >= 50 ? "Certainty is moderate due to partial categorization or delayed sync." :
                                 "Score is low due to missing accounts or stale data.")}
                            </p>

                            <div className="space-y-3 mb-4 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Bank Connection</span>
                                    <span className={cn("text-[10px] font-black", dynamicConfidence.breakdown.bankSynced ? "text-emerald-400" : "text-rose-400")}>
                                        {dynamicConfidence.breakdown.bankSynced ? "SYNCED" : "STALE"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Categorization</span>
                                    <span className="text-white text-[10px] font-black">{Math.round(dynamicConfidence.breakdown.categorizationPercent)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Coverage</span>
                                    <span className="text-white text-[10px] font-black">{dynamicConfidence.breakdown.dataCoverageDays} Days</span>
                                </div>
                            </div>
                            
                            {dynamicConfidence.warnings.length > 0 && (
                                <div className="pt-3 border-t border-white/5 space-y-3">
                                    {dynamicConfidence.warnings.map((w, i) => (
                                        <div key={i} className="space-y-1">
                                            <p className="text-white text-[10px] font-bold leading-tight">{w.problem}</p>
                                            <p className="text-slate-500 text-[9px] leading-tight">{w.impact}</p>
                                            <button 
                                                onClick={() => w.actionPayload?.navigateTo && router.push(w.actionPayload.navigateTo)}
                                                className="text-primary text-[9px] font-black uppercase hover:underline"
                                            >
                                                {w.action} →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
                        Financial Consistency Guarantee
                    </div>

                    <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 ml-auto text-[10px] uppercase tracking-widest leading-none">
                        <div className="flex items-center gap-1.5 font-bold">
                            <span className={cn(
                                "flex items-center gap-1.5",
                                state.trust.dataQualityIndicator === 'green' ? "text-emerald-400" : 
                                state.trust.dataQualityIndicator === 'yellow' ? "text-amber-400" : "text-rose-400"
                            )}>
                                {state.trust.dataQualityIndicator === 'green' ? '🟢 Clean' : 
                                 state.trust.dataQualityIndicator === 'yellow' ? '🟡 Partial' : '🔴 Incomplete'} Data
                            </span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="font-bold text-slate-400 font-mono tracking-normal">Source: {state.trust.dataSource}</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="font-bold text-slate-300">Last synced: {getTimeSince(state.trust.lastSyncedAt)}</span>
                        <div className="w-px h-3 bg-white/10" />
                        <button 
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={cn(
                                "p-1 rounded-full hover:bg-white/10 transition-all text-slate-400 hover:text-white group",
                                isRefreshing && "animate-spin"
                            )}
                            title="Refresh Financial Data"
                        >
                            <RotateCw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className={cn(
                        "text-4xl md:text-5xl font-black tracking-tighter leading-[1.05] uppercase max-w-4xl",
                        isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-white"
                    )}>
                        {narrative.headline}
                    </h1>

                    <div className="space-y-3">
                        <p className="text-slate-400 text-lg leading-relaxed max-w-3xl font-medium">
                            {narrative.summary}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">
                                Based on latest snapshot (Last Analysis: {new Date(generatedAt).toLocaleTimeString()})
                            </p>

                            {/* Progress Signals */}
                            <div className="flex items-center gap-3 ml-2">
                                {(delta.runwayChangeDays !== null && delta.runwayChangeDays !== 0) && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                                        {delta.runwayChangeDays > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", delta.runwayChangeDays > 0 ? "text-emerald-400" : "text-rose-400")}>
                                            Runway {delta.runwayChangeDays > 0 ? '+' : ''}{delta.runwayChangeDays} days vs last week
                                        </span>
                                    </div>
                                )}
                                {(delta.burnChangePercent !== null && delta.burnChangePercent !== 0) && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                                        {delta.burnChangePercent < 0 ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : <ArrowUpRight className="w-3 h-3 text-rose-400" />}
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", delta.burnChangePercent < 0 ? "text-emerald-400" : "text-rose-400")}>
                                            Burn {delta.burnChangePercent > 0 ? '↑' : '↓'}{Math.abs(Math.round(delta.burnChangePercent))}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics extracted to page layout */}
            </div>
        </motion.section>
    );
}
