import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertCircle, Zap, TrendingUp, Sparkles, Clock, 
    ChevronRight, ArrowRight, ShieldAlert, BadgeAlert,
    Info, ExternalLink, BrainCircuit, Scale, Minus, 
    AlertTriangle, CheckCircle2, Activity, History, ShieldCheck,
    Lock, Timer, TrendingDown, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState, Decision, DecisionOutput, formatRunway, formatCurrency, useCfoStateStore } from '@/store/cfo-state-store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

interface CfoDecisionsProps {
    engine: DecisionOutput;
    state?: CFOState;
}

export function CfoDecisions({ engine, state }: CfoDecisionsProps) {
    const { dailyFocus, urgency, currentRunway, decisionMemory } = engine;
    const [executedId, setExecutedId] = useState<string | null>(null);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const triggerVictory = useCfoStateStore(s => s.triggerVictory);
    const [showDetails, setShowDetails] = useState(false);
    const queryClient = useQueryClient();

    const validDecisions = engine.decisions;
    const primaryDecision = validDecisions.find(d => !dismissedIds.has(d.id)) || null;

    // Track "Shown" event
    useEffect(() => {
        if (primaryDecision) {
            apiClient.post('/cfo-engine/state/decision-click', {
                decisionId: primaryDecision.id,
                optionChosen: 'SHOWN'
            }).catch(() => {});
        }
    }, [primaryDecision?.id]);

    const executeDecision = async (id: string) => {
        const decisionToExecute = validDecisions.find(d => d.id === id);
        try {
            await apiClient.post('/cfo-engine/state/decision-acted', {
                decisionId: id,
                currentRunway: currentRunway
            });
            setExecutedId(id);

            // Victory State Trigger
            if (decisionToExecute) {
                const savings = decisionToExecute.impactBurnMonthly || 0;
                const penaltySaved = decisionToExecute.inactionFeeAccrued || 0;
                triggerVictory(savings + penaltySaved, 5, decisionToExecute.title);
            }

            toast.success('Mandate executed. Monitoring outcome...');
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        } catch (err) {
            toast.error('Failed to execute mandate. Intelligence link unstable.');
        }
    };

    if (!primaryDecision) return null;

    const timeSinceShown = primaryDecision.shownAt 
        ? Math.floor((new Date().getTime() - new Date(primaryDecision.shownAt).getTime()) / (1000 * 60 * 60))
        : 0;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <BadgeAlert className="w-5 h-5 text-rose-500" />
                    <h2 className="text-white font-black uppercase tracking-widest text-sm">Active Mandates</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <Activity className="w-3 h-3" /> BEHAVIORAL PRESSURE: ACTIVE
                </div>
            </div>

            <motion.div 
                layoutId={primaryDecision.id}
                className={cn(
                    "relative overflow-hidden rounded-[4rem] p-12 border-2 transition-all duration-700",
                    primaryDecision.urgency === 'critical' ? "bg-rose-500/[0.03] border-rose-500/20 shadow-[0_0_100px_rgba(244,63,94,0.05)]" : "bg-white/[0.02] border-white/10"
                )}
            >
                {/* Mastermind v4.0 Status Header */}
                <div className="flex flex-wrap items-center gap-4 mb-10">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-2xl">
                        <Timer className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {timeSinceShown <= 24 
                                ? `Decision Window: ${24 - timeSinceShown}h Grace Left` 
                                : `Window Expired: ${timeSinceShown - 24}h Penalty Active`
                            }
                        </span>
                    </div>
                    {primaryDecision.inactionFeeAccrued && primaryDecision.inactionFeeAccrued > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-2xl animate-pulse">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                Efficiency Loss: -{formatCurrency(primaryDecision.inactionFeeAccrued)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    primaryDecision.urgency === 'critical' ? "bg-rose-500 text-white" : "bg-primary text-black"
                                )}>
                                    {primaryDecision.type === 'mandate' ? 'Survival Mandate' : 'CFO Recommendation'}
                                </span>
                                <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">ID: {primaryDecision.id}</span>
                            </div>
                            <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                                {primaryDecision.title}
                            </h2>
                            <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
                                "{primaryDecision.message}"
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Impact</span>
                                <p className="text-lg font-bold text-white">{primaryDecision.impactLine || `+${primaryDecision.impactRunwayDays} Days Runway`}</p>
                            </div>
                            <div className="flex-1 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Reversibility</span>
                                <p className="text-lg font-bold text-white uppercase tracking-tighter">
                                    {primaryDecision.reversibility === 'high' ? 'High (Easy)' : 
                                     primaryDecision.reversibility === 'medium' ? 'Moderate' : 'Low (Hard)'}
                                </p>
                            </div>
                        </div>
                    </div>

                        <div className="lg:col-span-5 flex flex-col justify-end gap-6">
                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6 overflow-hidden pb-4"
                                    >
                                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                            <ChevronRight className="w-4 h-4 text-primary" /> Execution Plan
                                        </h3>
                                        <div className="space-y-3">
                                            {primaryDecision.executionPlan.map((step, i) => (
                                                <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                                                    <div className="w-5 h-5 rounded-lg border-2 border-white/20 mt-0.5 flex-shrink-0 group-hover:border-primary/50 transition-colors" />
                                                    <div>
                                                        <p className="text-white text-sm font-bold leading-tight mb-1">{step.task}</p>
                                                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-tighter">{step.impact}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                >
                                    {showDetails ? 'Hide Plan' : 'View Execution Details'}
                                    <ChevronRight className={cn("w-3 h-3 transition-transform", showDetails && "rotate-90")} />
                                </button>

                                {/* Contextual Action Buttons */}
                                <div className="flex gap-2">
                                    {primaryDecision.title.toLowerCase().includes('marketing') && (
                                        <Link href="/expenses?category=Marketing+%26+Ads" className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                            <BarChart3 className="w-3 h-3" /> Review Marketing Spend
                                        </Link>
                                    )}
                                    {(primaryDecision.title.toLowerCase().includes('burn') || primaryDecision.title.toLowerCase().includes('cost') || primaryDecision.title.toLowerCase().includes('cut')) && (
                                        <Link href="/expenses" className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                            <TrendingDown className="w-3 h-3" /> Review All Expenses
                                        </Link>
                                    )}
                                    <Link href={`/simulator?preset=mandate-${primaryDecision.id}`} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                        <Activity className="w-3 h-3" /> Simulate Impact
                                    </Link>
                                </div>

                                <button 
                                    onClick={() => executeDecision(primaryDecision.id)}
                                    className={cn(
                                        "w-full py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl",
                                        primaryDecision.urgency === 'critical' ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-primary text-black hover:bg-primary/90"
                                    )}
                                >
                                    <Zap className="w-4 h-4" /> Approve & Track
                                </button>
                                <button 
                                    onClick={() => setDismissedIds(prev => new Set(prev).add(primaryDecision.id))}
                                    className="w-full py-3 text-[9px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                >
                                    Defer Decision
                                </button>
                            </div>
                        </div>
                </div>

                {/* Background Grid Pattern */}
                <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            </motion.div>
        </div>
    );
}
