import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCfoStateStore, CFOState, updateDecisionStatus, trackDecisionActed } from '@/store/cfo-state-store';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Zap, TrendingUp, Target, AlertTriangle, ChevronRight, Info } from 'lucide-react';

interface CfoHeroProps {
    state: CFOState;
}

export function CfoHero({ state }: CfoHeroProps) {
    const { summary } = state;
    const { triggerVictory } = useCfoStateStore();
    const queryClient = useQueryClient();
    const [showWhy, setShowWhy] = useState(false);
    const decision = state.decisionEngine?.dailyFocus?.oneThing;
    const confidenceScore = state.dynamicConfidence?.score ?? 0;

    if (!decision) return null;

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
        >
            <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                
                <div className="relative bg-[#0a0f1e]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl">
                    {/* Confidence Badge (condensed) */}
                    <div className="absolute top-8 right-10 flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-2xl font-black text-white tabular-nums">
                                    {Math.round(confidenceScore)}%
                                </div>
                                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${confidenceScore}%` }}
                                        className={cn(
                                            "h-full rounded-full",
                                            confidenceScore >= 80 ? "bg-emerald-500" :
                                            confidenceScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8">
                        {/* 1. Title & Heading */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-primary" />
                                </div>
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                    Primary Strategic Focus
                                </span>
                            </div>
                            
                            <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-[0.95] max-w-3xl">
                                {decision.title}
                            </h2>
                        </div>

                        {/* 2. Reasoning (condensed) */}
                        <div className="max-w-2xl">
                            <p className="text-slate-400 font-medium text-lg leading-relaxed italic">
                                &quot;{decision.rationale}&quot;
                            </p>
                        </div>

                        {/* 3. Impact Grid (compact) */}
                        <div className="flex flex-wrap gap-6 py-5 border-y border-white/5">
                            {decision.impactExplanation && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">If Done</span>
                                    <div className="flex items-center gap-2 text-emerald-400 font-black text-base">
                                        <TrendingUp className="w-4 h-4" />
                                        {decision.impactExplanation}
                                    </div>
                                </div>
                            )}
                            {decision.consequenceExplanation && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">If Ignored</span>
                                    <div className="flex items-center gap-2 text-rose-400 font-black text-base">
                                        <AlertTriangle className="w-4 h-4" />
                                        {decision.consequenceExplanation}
                                    </div>
                                </div>
                            )}
                            {decision.confidence && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                                    <div className={cn(
                                        "font-black text-base",
                                        decision.confidence.label === 'High' ? "text-emerald-400" :
                                        decision.confidence.label === 'Moderate' ? "text-amber-400" : "text-rose-400"
                                    )}>
                                        {decision.confidence.label} ({decision.confidence.score}%)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Trust Toggle: Why this decision? */}
                        <div>
                            <button 
                                onClick={() => setShowWhy(!showWhy)}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                <Info className="w-3 h-3" />
                                {showWhy ? 'Hide Signals' : 'Why this decision?'}
                                <ChevronRight className={cn("w-3 h-3 transition-transform", showWhy && "rotate-90")} />
                            </button>
                            
                            <AnimatePresence>
                                {showWhy && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-5 p-6 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data Signals</h4>
                                                <ul className="space-y-2">
                                                    {decision.secondOrderEffects?.map((effect: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-xs text-slate-500 font-medium leading-snug">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5" />
                                                            {effect}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CFO Logic</h4>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                    {decision.consequenceBasis || "Derived from 90-day cash flow variance and industry growth benchmarks for your current stage."}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 5. Actions (condensed) */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button 
                                onClick={async () => {
                                    if (!decision) return;
                                    await updateDecisionStatus(decision.id, 'in_progress');
                                    await trackDecisionActed(decision.id, summary.runwayMonths);
                                    queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                                    triggerVictory(0, 50, 'Action Initiated', 'MICRO');
                                }}
                                className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                Execute Action
                            </button>
                            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all">
                                Simulate Impact
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.section>
    );
}
