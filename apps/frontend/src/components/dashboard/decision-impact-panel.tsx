'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, 
    TrendingDown, 
    TrendingUp, 
    Clock, 
    ArrowRight, 
    AlertCircle, 
    ShieldCheck, 
    Zap,
    ChevronDown,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuardEvaluation } from '@/lib/pre-decision-guard';

interface DecisionImpactPanelProps {
    evaluation: GuardEvaluation | null;
    isBlocking?: boolean;
    isCfoBlocked?: boolean;
    interventionMessage?: string;
    escalationLevel?: number; // 0-3
    complianceScore?: number;
    onProceed?: (overrideReason?: string) => void;
    onCancel?: () => void;
}

export function DecisionImpactPanel({ 
    evaluation, 
    isCfoBlocked, 
    interventionMessage, 
    escalationLevel = 0,
    complianceScore = 100,
    onProceed, 
    onCancel 
}: DecisionImpactPanelProps) {
    const [confirmText, setConfirmText] = React.useState('');
    const [overrideReason, setOverrideReason] = React.useState('');
    const [delaySeconds, setDelaySeconds] = React.useState(0);
    const [isCounting, setIsCounting] = React.useState(false);

    if (!evaluation) return null;

    const { riskLevel, runwayBefore, runwayAfter, runwayDelta, zeroDateShiftDays, warnings, insights, suggestions } = evaluation;

    const riskColors = {
        SAFE: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
        WATCH: "bg-orange-500/10 border-orange-500/20 text-orange-500",
        DANGER: "bg-red-500/10 border-red-500/20 text-red-500"
    };

    const isDanger = riskLevel === "DANGER" || escalationLevel >= 2;

    const handleProceed = () => {
        if (escalationLevel >= 3 && delaySeconds > 0) return;
        if (escalationLevel === 2 && confirmText.toUpperCase() !== 'CONFIRM') return;
        if (escalationLevel === 3 && !overrideReason.trim()) return;
        
        onProceed?.(overrideReason);
    };

    React.useEffect(() => {
        if (escalationLevel === 3 && !isCounting) {
            setDelaySeconds(10);
            setIsCounting(true);
        }
    }, [escalationLevel, isCounting]);

    React.useEffect(() => {
        if (delaySeconds > 0) {
            const timer = setTimeout(() => setDelaySeconds(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [delaySeconds]);

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:max-w-md bg-[#0C111D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full"
        >
            {/* Header: Risk Level */}
            <div className={cn("px-6 py-4 border-b flex items-center justify-between", riskColors[riskLevel])}>
                <div className="flex items-center gap-2">
                    {isDanger ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
                    <span className="font-black uppercase tracking-widest text-sm">{riskLevel} RISK ZONE</span>
                </div>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase text-slate-500">Compliance</span>
                     <span className={cn(
                        "font-black text-[10px]",
                        complianceScore < 50 ? "text-red-500" : "text-emerald-500"
                     )}>{complianceScore}%</span>
                </div>
            </div>

            {escalationLevel >= 2 && (
                <div className="px-6 py-4 bg-red-600 text-white flex items-center gap-4">
                    <AlertCircle className="w-6 h-6 shrink-0 animate-[bounce_2s_infinite]" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Progressive Friction Level {escalationLevel}</p>
                        <p className="text-sm font-black uppercase tracking-tight">CFO Authority Intercept Active.</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Visual Impact: Before vs After */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Baseline</span>
                        <div className="text-2xl font-black text-white">{runwayBefore.toFixed(1)} <span className="text-sm font-medium text-slate-400">mo</span></div>
                    </div>
                    <div className={cn("space-y-1 p-4 rounded-2xl border", isDanger ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10")}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Post-Decision</span>
                        <div className={cn("text-2xl font-black", runwayDelta < 0 ? "text-red-400" : "text-emerald-400")}>
                            {runwayAfter.toFixed(1)} <span className="text-sm font-medium opacity-60">mo</span>
                        </div>
                    </div>
                </div>

                {/* Level 2: CONFIRMATION Friction */}
                {escalationLevel === 2 && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Type "CONFIRM" to proceed</p>
                        <input 
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="CONFIRM"
                            className="w-full bg-black/40 border border-orange-500/30 rounded-lg px-4 py-2 text-white font-black text-center focus:border-orange-500 transition-all outline-none"
                        />
                    </div>
                )}

                {/* Level 3: OVERRIDE Friction */}
                {escalationLevel === 3 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4">
                        <div>
                            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Override Reason (Mandatory)</p>
                            <textarea 
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                placeholder="Why are you overriding CFO advice?"
                                className="w-full h-24 bg-black/40 border border-red-500/30 rounded-lg px-4 py-2 text-white text-sm focus:border-red-500 transition-all outline-none resize-none"
                            />
                        </div>
                        {delaySeconds > 0 && (
                            <div className="text-center py-2 bg-red-500/20 rounded-lg">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Mandatory Accountability Delay</p>
                                <p className="text-lg font-black text-red-500">{delaySeconds}s</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Impact Stat Banner */}
                {runwayDelta !== 0 && (
                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className={cn("p-3 rounded-xl", runwayDelta < 0 ? "bg-red-500/10" : "bg-emerald-500/10")}>
                            {runwayDelta < 0 ? <TrendingDown className="w-6 h-6 text-red-500" /> : <TrendingUp className="w-6 h-6 text-emerald-500" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">
                                {runwayDelta < 0 ? 'Consequence Found' : 'Benefit Detected'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {runwayDelta < 0 
                                    ? `You lose ${Math.abs(runwayDelta).toFixed(1)} months of survival.`
                                    : `Runway extends by ${runwayDelta.toFixed(1)} months.`
                                }
                            </p>
                        </div>
                    </div>
                )}

                {/* Behavioral Insights Stack */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Strategic Insights</h3>
                    
                    <div className="space-y-2">
                        {insights.map((insight, i) => (
                            <div key={i} className="flex gap-3 text-sm text-slate-300 group">
                                <Zap className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                                <span>{insight}</span>
                            </div>
                        ))}
                        {warnings.map((warning, i) => (
                            <div key={i} className="flex gap-3 text-sm text-red-400 font-medium group">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-6 border-t border-white/5 space-y-3 bg-black/20">
                <div className="flex gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm"
                    >
                        Abort
                    </button>
                    <button 
                        onClick={handleProceed}
                        disabled={
                            isCfoBlocked || 
                            (escalationLevel === 2 && confirmText.toUpperCase() !== 'CONFIRM') || 
                            (escalationLevel === 3 && (!overrideReason.trim() || delaySeconds > 0))
                        }
                        className={cn(
                            "flex-[2] px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm",
                            (isCfoBlocked || (escalationLevel === 2 && confirmText.toUpperCase() !== 'CONFIRM') || (escalationLevel === 3 && (!overrideReason.trim() || delaySeconds > 0)))
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : isDanger 
                                    ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_20px_rgba(220,38,38,0.3)]" 
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_20px_rgba(5,150,105,0.3)]"
                        )}
                    >
                        {isCfoBlocked ? <Lock className="w-4 h-4" /> : isDanger && <AlertTriangle className="w-4 h-4" />}
                        <span>
                            {escalationLevel === 3 && delaySeconds > 0 ? `Wait ${delaySeconds}s` : 
                             isCfoBlocked ? 'Directive: Blocked' : 
                             escalationLevel === 3 ? 'Override Directive' :
                             isDanger ? 'Confirm Decision' : 'Apply Changes'}
                        </span>
                        {!isDanger && !isCfoBlocked && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
