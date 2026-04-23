import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertCircle, Zap, TrendingUp, Sparkles, Clock, 
    ChevronRight, ArrowRight, ShieldAlert, BadgeAlert,
    Info, ExternalLink, BrainCircuit, Scale, Minus, 
    AlertTriangle, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState, Decision, DecisionOutput } from '@/store/cfo-state-store';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/store/cfo-state-store';

interface CfoDecisionsProps {
    engine: DecisionOutput;
    state?: CFOState;
}

const urgencyThemes = {
    critical: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    high: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    low: "bg-slate-500/10 text-slate-500 border-slate-500/20"
};

const confidenceThemes = {
    high: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    low: "text-rose-500 bg-rose-500/10 border-rose-500/20"
};

export function CfoDecisions({ engine, state }: CfoDecisionsProps) {
    const { dailyFocus, urgency, currentRunway, decisionMemory, ownershipNote } = engine;
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [recalcMessage, setRecalcMessage] = React.useState<string | null>(null);

    // Filter out velocity leaks since they are handled strictly by the Leak Detector Sidebar
    const validDecisions = engine.decisions.filter(d => d.impactRunwayDays === undefined || d.impactRunwayDays >= 0);
    const primaryDecision = dailyFocus.fix && (dailyFocus.fix.impactRunwayDays === undefined || dailyFocus.fix.impactRunwayDays >= 0) 
        ? dailyFocus.fix 
        : validDecisions[0];
    const secondaryDecisions = validDecisions.filter(d => d.id !== primaryDecision?.id);
    
    // Gated Intensity UI Logic
    const isCrisis = (currentRunway <= 3) || (decisionMemory?.pendingDecisions >= 3);

    const toggleTask = async (decisionId: string, taskIndex: number) => {
        if (!primaryDecision) return;
        const newPlan = [...primaryDecision.executionPlan];
        newPlan[taskIndex].completed = !newPlan[taskIndex].completed;
        
        try {
            await fetch(`/api/cfo-engine/decisions/${decisionId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recommendedActions: newPlan })
            });
            window.location.reload(); 
        } catch (err) {
            console.error("Task toggle failed", err);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        setIsUpdating(true);
        if (status === 'FIXED') setRecalcMessage("Recalculating financial position...");
        
        try {
            await fetch(`/api/cfo-engine/decisions/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            await fetch('/api/cfo-engine/state/invalidate', { method: 'POST' });
            window.location.reload();
        } catch (err) {
            console.error("Failed to update status", err);
        } finally {
            setIsUpdating(false);
            setRecalcMessage(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* 🚨 ADAPTIVE PRESSURE BANNER */}
            {decisionMemory?.nudge && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className={cn(
                        "p-3 rounded-2xl flex items-center justify-between group transition-all duration-500",
                        isCrisis ? "bg-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.3)]" : "bg-amber-500/20 border border-amber-500/30"
                    )}
                >
                    <div className="flex items-center gap-3 pl-3">
                        <BadgeAlert className={cn("w-5 h-5", isCrisis ? "text-white animate-pulse" : "text-amber-500")} />
                        <span className={cn("text-xs font-black uppercase tracking-wider", isCrisis ? "text-white" : "text-amber-500")}>
                            {decisionMemory.nudge}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* 🧠 THE OUTCOME CLARITY HERO CARD v3.5 */}
            <AnimatePresence mode="wait">
                {primaryDecision && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "glass-card rounded-[2.5rem] p-10 border-l-[12px] relative group shadow-2xl transition-all duration-700",
                            urgency === 'critical' ? 'border-l-rose-500' : 'border-l-primary',
                            isCrisis && "ring-2 ring-rose-500/30 ring-offset-4 ring-offset-black",
                            isUpdating && "opacity-50 pointer-events-none"
                        )}
                    >
                        {recalcMessage && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="mb-4">
                                    <Sparkles className="w-12 h-12 text-primary" />
                                </motion.div>
                                <span className="text-white font-black uppercase tracking-[0.2em] text-sm animate-pulse">{recalcMessage}</span>
                            </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="flex-1 space-y-8">
                                <div className="space-y-4">
                                    <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tighter">
                                        {primaryDecision.title}
                                    </h2>
                                    <p className="text-slate-400 text-xl leading-relaxed max-w-xl font-medium italic">
                                        "{primaryDecision.message}"
                                    </p>

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        {primaryDecision.impactRunwayDays !== undefined && primaryDecision.impactRunwayDays !== 0 && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-sm">
                                                <TrendingUp className="w-4 h-4" />
                                                Runway {primaryDecision.impactRunwayDays > 0 ? '+' : ''}{primaryDecision.impactRunwayDays} days
                                            </div>
                                        )}
                                        {primaryDecision.impactBurnMonthly !== undefined && primaryDecision.impactBurnMonthly !== 0 && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-sm">
                                                <TrendingUp className="w-4 h-4" />
                                                Burn reduced by {formatCurrency(primaryDecision.impactBurnMonthly)}/mo
                                            </div>
                                        )}
                                        {(primaryDecision.impactLine && !primaryDecision.impactRunwayDays && !primaryDecision.impactBurnMonthly) && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-xs">
                                                <TrendingUp className="w-3 h-3" />
                                                {primaryDecision.impactLine}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <span className={cn(
                                            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                            urgencyThemes[urgency as keyof typeof urgencyThemes]
                                        )}>
                                            <ShieldAlert className="w-4 h-4" />
                                            {primaryDecision.recommendationStrength === 'strong' ? 'Mandate' : 'Recommendation'}
                                        </span>
                                        {primaryDecision.reversibility && (
                                            <span className={cn(
                                                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                primaryDecision.reversibility === 'high' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                primaryDecision.reversibility === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            )}>
                                                {primaryDecision.reversibility === 'high' ? '🟢 Easy to undo' : 
                                                 primaryDecision.reversibility === 'medium' ? '🟡 Moderate effort' : 
                                                 '🔴 Hard to reverse'}
                                            </span>
                                        )}
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase",
                                            confidenceThemes[primaryDecision.confidence?.label.toLowerCase() as keyof typeof confidenceThemes] || "text-slate-400 bg-slate-500/10 border-slate-500/20"
                                        )}>
                                            <CheckCircle2 className="w-3 h-3" /> Confidence: {primaryDecision.confidence?.label || 'Moderate'}
                                        </div>
                                    </div>
                                </div>

                                {/* 🟢 THE SACRIFICE (GAIN/LOSS) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 group/gain transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Gain</span>
                                        </div>
                                        <p className="text-sm font-bold text-white leading-snug">{primaryDecision.tradeOffs.gain}</p>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 group/loss transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Minus className="w-4 h-4 text-rose-500" />
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Loss</span>
                                        </div>
                                        <p className="text-sm font-bold text-white leading-snug">{primaryDecision.tradeOffs.loss}</p>
                                    </div>
                                </div>

                                {/* ⚠️ THE OUTCOME CLARITY BOX (Refined v3.5) */}
                                <div className="p-8 rounded-[2rem] bg-rose-500/5 border-2 border-rose-500/10 group/outcome relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <AlertTriangle className="w-32 h-32 text-rose-500" />
                                    </div>
                                    
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-rose-500" />
                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">If you continue this path</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                                                    <span className="text-[8px] font-black text-rose-500 uppercase">Risk: {primaryDecision.alternative.riskLevel}</span>
                                                </div>
                                                <div className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full border",
                                                    confidenceThemes[primaryDecision.alternative.confidence]
                                                )}>
                                                    <span className="text-[8px] font-black uppercase">Confidence: {primaryDecision.alternative.confidence}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-xl font-bold text-white tracking-tight leading-tight max-w-md">
                                                {primaryDecision.alternative.option}
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock className="w-3 h-3" /> Timeframe
                                                    </span>
                                                    <p className="text-[11px] font-bold text-slate-300 italic">{primaryDecision.alternative.timeframe || 'Immediate'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Minus className="w-3 h-3" /> Logical Outcome
                                                    </span>
                                                    <p className="text-[11px] font-bold text-rose-300/80 leading-relaxed italic">{primaryDecision.alternative.consequence}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 💡 RATIONALE + FOOTER */}
                                <div className="space-y-4">
                                    <div className="p-6 rounded-3xl bg-white/5 border-l-4 border-l-slate-600 flex items-start gap-4">
                                        <BrainCircuit className="w-6 h-6 text-slate-500 shrink-0 mt-1" />
                                        <div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">CFO Rationale</span>
                                            <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{primaryDecision.rationale}"</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500/50" />
                                            Validated against current financial state
                                        </span>
                                        <span className="text-[10px] font-black text-slate-700 uppercase">Version 3.5 Outcome Clarity</span>
                                    </div>
                                </div>

                                {/* 🧮 SHOW THE MATH */}
                                {state && (
                                    <details className="group/math bg-black/20 border border-white/5 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Why this decision? (<span className="text-emerald-400/80">Show the math</span>)</span>
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 group-open/math:bg-white/10 transition-colors">
                                                <ChevronRight className="w-4 h-4 text-slate-500 group-open/math:hidden" />
                                                <ChevronRight className="w-4 h-4 text-slate-500 hidden group-open/math:block rotate-90" />
                                            </div>
                                        </summary>
                                        <div className="px-6 pb-6 pt-2">
                                            <ul className="space-y-2 font-mono text-xs">
                                                <li className="flex justify-between items-center text-slate-400"><span className="uppercase text-[9px] tracking-widest">Cash Balance:</span> <span className="text-white font-bold">{formatCurrency(state.summary.cashInBank)}</span></li>
                                                <li className="flex justify-between items-center text-slate-400"><span className="uppercase text-[9px] tracking-widest">Monthly Burn:</span> <span className="text-white font-bold">{formatCurrency(state.summary.netBurn)}</span></li>
                                                <li className="flex justify-between items-center text-slate-400"><span className="uppercase text-[9px] tracking-widest">Avg Burn (30d):</span> <span className="text-white font-bold">{formatCurrency(state.summary.prevNetBurn > 0 ? state.summary.prevNetBurn : state.summary.netBurn)}</span></li>
                                                <li className="flex justify-between items-center text-emerald-500 font-black pt-3 border-t border-white/10 mt-2 uppercase tracking-wider text-[11px]"><span>→ Projected Runway:</span> <span>{state.summary.runwayMonths} M</span></li>
                                            </ul>
                                        </div>
                                    </details>
                                )}
                            </div>

                            <div className="lg:w-80 flex flex-col gap-4 shrink-0">
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => updateStatus(primaryDecision.id, 'FIXED')}
                                        className="w-full py-6 rounded-[1.5rem] bg-emerald-500 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:scale-[1.03] active:scale-95 transition-all"
                                    >
                                        Execute Recommendation
                                    </button>
                                    <button 
                                        onClick={() => updateStatus(primaryDecision.id, 'IGNORED')}
                                        className="w-full py-4 rounded-[1.5rem] bg-white/5 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-rose-400 transition-colors"
                                    >
                                        Acknowledge Risk & Dismiss
                                    </button>
                                </div>

                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Execution Steps</h3>
                                    <div className="space-y-3">
                                        {primaryDecision.executionPlan.map((task, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => toggleTask(primaryDecision.id, idx)}
                                                className={cn(
                                                    "flex items-center gap-3 cursor-pointer group/task",
                                                    task.completed && "opacity-40"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-sm border transition-colors",
                                                    task.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-700 group-hover/task:border-slate-500"
                                                )} />
                                                <span className={cn("text-[11px] font-bold", task.completed ? "text-emerald-400 line-through" : "text-white")}>
                                                    {task.task}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

