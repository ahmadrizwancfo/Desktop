'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Zap, 
    Shield, 
    Clock, 
    CheckCircle2, 
    RotateCcw, 
    X, 
    ArrowRight, 
    AlertTriangle,
    Eye,
    TrendingUp,
    Play,
    ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from './countdown-timer';
import { formatCurrency } from '@/store/cfo-state-store';

export type ActionStatus = 'shadow' | 'pending' | 'executed' | 'cancelled';

interface ActionCardProps {
    id: string; // This is the Log ID for pending/executed, or Action ID for shadow
    actionId: string;
    title: string;
    description: string;
    status: ActionStatus;
    riskLevel: 'low' | 'medium' | 'high';
    impact: {
        monthlySavings: number;
        runwayIncrease?: number;
    };
    confidence: number;
    assumptions?: string[];
    scheduledAt?: string;
    isSafeMode?: boolean;
    onCancel?: (id: string) => void;
    onExecute?: (actionId: string) => void;
    onRollback?: (actionId: string) => void;
    onSchedule?: (actionId: string) => void;
}

export function ActionCard({
    id,
    actionId,
    title,
    description,
    status,
    riskLevel,
    impact,
    confidence,
    assumptions,
    scheduledAt,
    isSafeMode,
    onCancel,
    onExecute,
    onRollback,
    onSchedule
}: ActionCardProps) {
    const riskColors = {
        low: "text-emerald-400 bg-emerald-400/10",
        medium: "text-amber-400 bg-amber-400/10",
        high: "text-rose-400 bg-rose-400/10"
    };

    const isManualReview = isSafeMode && status === 'pending';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                status === 'shadow' ? "border-slate-800 bg-slate-900/40" :
                isManualReview ? "border-indigo-500/40 bg-indigo-500/[0.04]" :
                status === 'pending' ? "border-amber-500/30 bg-amber-500/[0.03]" :
                "border-emerald-500/30 bg-emerald-500/[0.03]"
            )}
        >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <div className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    status === 'shadow' ? "bg-slate-800 text-slate-400" :
                    isManualReview ? "bg-indigo-500/20 text-indigo-400" :
                    status === 'pending' ? "bg-amber-500/20 text-amber-400" :
                    "bg-emerald-500/20 text-emerald-400"
                )}>
                    {status === 'shadow' && <Eye className="w-3 h-3" />}
                    {isManualReview && <ShieldAlert className="w-3 h-3" />}
                    {!isManualReview && status === 'pending' && <Clock className="w-3 h-3" />}
                    {status === 'executed' && <CheckCircle2 className="w-3 h-3" />}
                    {isManualReview ? 'Manual Review Required' : status}
                </div>
                <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", riskColors[riskLevel])}>
                    {riskLevel} Risk
                </div>
            </div>

            <h3 className="text-base font-black text-white mb-1.5 tracking-tight">{title}</h3>
            
            {status === 'shadow' && (
                <p className="text-xs text-slate-500 italic mb-4">"Testing safely in the background — no changes applied"</p>
            )}
            
            {status === 'pending' && !isManualReview && (
                <div className="flex items-center gap-2 mb-4">
                    <CountdownTimer 
                        targetDate={scheduledAt || ''} 
                        className="text-amber-400 text-sm"
                    />
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">until execution</span>
                </div>
            )}

            {isManualReview && (
                 <p className="text-xs text-indigo-400 font-bold mb-4 flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> Auto-execution disabled
                </p>
            )}
 
            {status === 'executed' && (
                <p className="text-xs text-emerald-400/80 font-bold mb-4 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Action executed successfully
                </p>
            )}

            {/* Impact Details */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-emerald-500/30 transition-colors">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Impact</p>
                    <p className="text-sm font-black text-emerald-400">+{formatCurrency(impact.monthlySavings)}<span className="text-[10px] opacity-70"> /mo</span></p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Trajectory</p>
                    <p className="text-sm font-black text-white">+{impact.runwayIncrease || 0} days <span className="text-[10px] opacity-70">runway</span></p>
                </div>
            </div>

            {/* Confidence & Why */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-primary" /> CFO Rationale
                    </p>
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        confidence >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        confidence >= 80 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                        {confidence}% Confidence
                    </span>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                        {description}
                    </p>
                    {assumptions && assumptions.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5">Simulation Assumptions</p>
                            <ul className="space-y-1">
                                {assumptions.map((a, i) => (
                                    <li key={i} className="text-[9px] text-slate-500 flex items-start gap-1.5 leading-tight">
                                        <div className="w-1 h-1 rounded-full bg-slate-700 mt-1" />
                                        {a}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {status === 'shadow' && (
                    <Button 
                        onClick={() => onSchedule?.(actionId)}
                        className="flex-1 bg-white hover:bg-slate-100 text-black font-black text-xs h-10 rounded-xl gap-2"
                    >
                        Review / Schedule <ArrowRight className="w-3 h-3" />
                    </Button>
                )}
                
                {status === 'pending' && (
                    <>
                        <Button 
                            variant="ghost" 
                            onClick={() => onCancel?.(id)}
                            className="flex-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold text-xs h-10 rounded-xl"
                        >
                            Dismiss
                        </Button>
                        <Button 
                            onClick={() => onExecute?.(actionId)}
                            className={cn(
                                "flex-1 font-black text-xs h-10 rounded-xl gap-2",
                                isManualReview ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-black"
                            )}
                        >
                            Approve & Execute <Play className="w-3 h-3 fill-current" />
                        </Button>
                    </>
                )}

                {status === 'executed' && (
                    <Button 
                        variant="outline"
                        onClick={() => onRollback?.(actionId)}
                        className="flex-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-black text-xs h-10 rounded-xl gap-2"
                    >
                        <RotateCcw className="w-3 h-3" /> Rollback Action
                    </Button>
                )}
            </div>

            {/* Subtle Progress Bar for Pendings */}
            {status === 'pending' && !isManualReview && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20">
                    <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1800, ease: "linear" }} // 30 mins pseudo
                        className="h-full bg-amber-500"
                    />
                </div>
            )}
        </motion.div>
    );
}
