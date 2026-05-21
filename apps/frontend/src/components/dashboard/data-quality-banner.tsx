'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Shield, ShieldAlert, ShieldCheck, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataQuality } from '@/store/cfo-state-store';
import { timeAgo } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// DATA QUALITY BANNER — CTO Mandate #3
// Shows parsing quality, sync status, and "Fix Data Issues" action
// parsingQualityScore < 65 → Prominent warning + Fix button
// ═══════════════════════════════════════════════════════════════════════════════

export function DataQualityBanner() {
    const router = useRouter();
    const dq = useDataQuality();

    const score = dq.confidenceScore;
    const isPoor = score < 50;
    const isFair = score >= 50 && score < 70;

    const qualityLabel = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
    const qualityColor = score >= 85 ? 'emerald' : score >= 70 ? 'sky' : score >= 50 ? 'amber' : 'rose';

    const IconComponent = isPoor ? ShieldAlert : isFair ? Shield : ShieldCheck;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "w-full rounded-2xl border px-6 py-4 flex items-center justify-between gap-4 mb-8",
                isPoor && "bg-rose-500/5 border-rose-500/20",
                isFair && "bg-amber-500/5 border-amber-500/20",
                !isPoor && !isFair && "bg-emerald-500/5 border-emerald-500/20",
            )}
        >
            {/* Left: Icon + Quality Label */}
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    `bg-${qualityColor}-500/10 border border-${qualityColor}-500/20`,
                )}>
                    <IconComponent className={cn("w-5 h-5", `text-${qualityColor}-400`)} />
                </div>

                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Data Quality
                        </span>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                            isPoor && "bg-rose-500/10 text-rose-400",
                            isFair && "bg-amber-500/10 text-amber-400",
                            !isPoor && !isFair && "bg-emerald-500/10 text-emerald-400",
                        )}>
                            {qualityLabel} ({Math.round(score)}%)
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dq.lastSynced ? `Synced ${timeAgo(dq.lastSynced)}` : 'Never synced'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {dq.transactionCount} transactions · {dq.dataSource || 'No source'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Fix Button (only when quality is fair or poor) */}
            {score < 70 && (
                <button
                    onClick={() => router.push('/expenses?filter=needs-review')}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap",
                        isPoor ? "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400" : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400"
                    )}
                >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Fix Data Issues
                    <ArrowRight className="w-3 h-3" />
                </button>
            )}
        </motion.div>
    );
}

/**
 * Inline quality gate for advanced features.
 * Shows "Connect higher quality data for full insights" if score < 70.
 */
export function DataQualityGate({ children, featureName }: { children: React.ReactNode; featureName?: string }) {
    const dq = useDataQuality();
    const score = dq.confidenceScore;

    if (score < 70) {
        return (
            <div className="relative">
                <div className="opacity-40 pointer-events-none select-none">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-[#0a0f1e]/90 backdrop-blur-sm border border-amber-500/20 rounded-2xl px-8 py-6 text-center max-w-md">
                        <Shield className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                            {featureName || 'Advanced Insights'} Locked
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Connect higher quality data for full insights. Current data quality: {Math.round(score)}%.
                            Upload more bank statements or sync your accounting tool to unlock this feature.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
