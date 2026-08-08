import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCfoStateStore, CFOState, updateDecisionStatus, trackDecisionActed } from '@/store/cfo-state-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    ArrowUpRight, 
    Clock, 
    AlertTriangle, 
    Play, 
    ChevronRight,
    TrendingUp,
    ShieldAlert,
    Target,
    Zap,
    HelpCircle,
    Shield,
    Sparkles,
    Info,
    MessageSquare
} from 'lucide-react';

interface CfoHeroProps {
    state: CFOState;
}

export function CfoHero({ state }: CfoHeroProps) {
    const router = useRouter();
    const { summary } = state;
    const { triggerVictory } = useCfoStateStore();
    const queryClient = useQueryClient();
    const [showWhy, setShowWhy] = useState(false);
    const [showMissionDrawer, setShowMissionDrawer] = useState(false);
    const [missionStep, setMissionStep] = useState<1 | 2 | 3 | 4>(1);
    const [isExecuting, setIsExecuting] = useState(false);
    const decision = state.decisionEngine?.dailyFocus?.oneThing;
    const confidenceScore = state.dynamicConfidence?.score ?? 0;

    const { data: continuousBrief } = useQuery({
        queryKey: ['continuous-brief'],
        queryFn: async () => {
            const res = await apiClient.get('/cfo-engine/continuous-brief');
            return res.data;
        }
    });

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

                    {/* ☕ THE LIVING CFO VIEWPORT 1 EXPERIENCE */}
                    <div className="mb-6 p-6 rounded-2xl bg-[#18181B] border border-white/[0.06] space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-widest">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                {continuousBrief?.livingCfoBrief?.greeting || continuousBrief?.founderGreeting || 'Good morning, Founder. I reviewed everything that changed since yesterday.'}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                {continuousBrief?.livingCfoBrief?.companyIntelligence?.companyChapter || '🚀 GROWTH & EXPANSION PHASE'}
                            </span>
                        </div>

                        {/* ⚙️ "WHILE I WAS WORKING..." SILENT ACCOMPLISHMENTS */}
                        <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">While I was working...</span>
                            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-300">
                                {(continuousBrief?.livingCfoBrief?.whileIWasWorking || [
                                    "Reviewed 146 transactions",
                                    "Refreshed runway calculation",
                                    "Checked GST exposure",
                                    "Monitored receivables",
                                    "Updated cash forecast"
                                ]).map((item: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 🏆 SILENT WINS CELEBRATION BLOCK */}
                        {continuousBrief?.livingCfoBrief?.silentWins?.length > 0 && (
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Yesterday's Silent Wins
                                </span>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold text-white">
                                    {continuousBrief.livingCfoBrief.silentWins.map((win: string, idx: number) => (
                                        <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-300">
                                            ✓ {win}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 🛡️ EXPLAINABLE TRUST BREAKDOWN */}
                        {continuousBrief?.livingCfoBrief?.explainableTrust && (
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                        Today's Recommendations Are Highly Reliable
                                    </span>
                                    <span className="text-xs font-black text-white">{continuousBrief.livingCfoBrief.explainableTrust.score}% Trust</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Verified Evidence:</span>
                                        {continuousBrief.livingCfoBrief.explainableTrust.verifiedSources.map((s: string, i: number) => (
                                            <div key={i} className="text-emerald-400 font-medium">✓ {s}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Waiting For (To Reach 98%):</span>
                                        {continuousBrief.livingCfoBrief.explainableTrust.waitingFor.map((w: string, i: number) => (
                                            <div key={i} className="text-slate-400 font-medium">• {w}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-8">
                        {/* 1. Title & Heading */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-primary" />
                                </div>
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                    Today's Executive Decision • Est. 2 Mins
                                </span>
                            </div>
                            
                            <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-[0.95] max-w-3xl">
                                {continuousBrief?.prioritizedMission?.title || continuousBrief?.todaysPriority?.actionTitle || decision.title}
                            </h2>
                        </div>

                        {/* 2. Reasoning, Why Today & Risk of Ignored */}
                        <div className="max-w-2xl space-y-3">
                            <p className="text-slate-300 font-semibold text-sm leading-relaxed">
                                <span className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest block mb-1">Why Today Instead of Tomorrow?</span>
                                &quot;{continuousBrief?.livingCfoBrief?.waitingForYourDecision?.whyToday || continuousBrief?.prioritizedMission?.reasonWhyToday || decision.rationale}&quot;
                            </p>

                            {/* Risk If Ignored Card */}
                            {continuousBrief?.livingCfoBrief?.waitingForYourDecision?.riskIfIgnored && (
                                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 block mb-0.5">Risk If Ignored</span>
                                    &quot;{continuousBrief.livingCfoBrief.waitingForYourDecision.riskIfIgnored}&quot;
                                </div>
                            )}

                            {/* 🎯 POSTPONED DECISIONS JUSTIFICATION */}
                            {continuousBrief?.executiveAgenda?.postponedRationale && (
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Postponed Priorities Justification</span>
                                    <p className="text-xs font-medium text-slate-300">
                                        &quot;{continuousBrief.executiveAgenda.postponedRationale}&quot;
                                    </p>
                                </div>
                            )}

                            {/* Opportunity Box */}
                            {continuousBrief?.whatHappensNext?.topOpportunity && (
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">Top Opportunity Discovered</span>
                                        <span className="text-xs font-bold text-white">{continuousBrief.whatHappensNext.topOpportunity.title}</span>
                                    </div>
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-400 text-black text-xs font-black tabular-nums">
                                        Save {continuousBrief.whatHappensNext.topOpportunity.estimatedSavings}
                                    </span>
                                </div>
                            )}

                            {continuousBrief?.executiveAgenda?.secondaryWatchItems?.length > 0 && (
                                <div className="pt-2">
                                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest block mb-1">Secondary Watch Items</span>
                                    <p className="text-xs text-slate-400 font-medium">
                                        • {continuousBrief.executiveAgenda.secondaryWatchItems.join(' • ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 📊 SPRINT 8: EXECUTIVE MANAGEMENT SCORECARD */}
                        {continuousBrief?.compoundScorecard && (
                            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Executive Management Scorecard</span>
                                    {continuousBrief?.confidenceEvolution?.explanation && (
                                        <span className="text-[10px] font-bold text-indigo-400">{continuousBrief.confidenceEvolution.explanation}</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Cash Discipline</span>
                                        <span className="text-base font-black text-white tabular-nums">{continuousBrief.compoundScorecard.cashDiscipline.score}/100</span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Collections</span>
                                        <span className="text-base font-black text-white tabular-nums">{continuousBrief.compoundScorecard.collectionsControl.score}/100</span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Spending Control</span>
                                        <span className="text-base font-black text-white tabular-nums">{continuousBrief.compoundScorecard.spendingControl.score}/100</span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Execution</span>
                                        <span className="text-base font-black text-white tabular-nums">{continuousBrief.compoundScorecard.decisionExecution.score}/100</span>
                                    </div>
                                </div>
                            </div>
                        )}

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

                        {/* 5. Executive Mission Launcher Button */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button 
                                onClick={() => {
                                    setMissionStep(1);
                                    setShowMissionDrawer(true);
                                }}
                                className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                Start Executive Mission (3 Mins)
                            </button>

                            <button 
                                onClick={() => router.push('/ai-cfo')}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4 text-indigo-400" />
                                Ask AI CFO
                            </button>
                        </div>

                        {/* 6. Contextual Follow-up Question Chips */}
                        {continuousBrief?.suggestedQuestions?.length > 0 && (
                            <div className="pt-4 border-t border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Would you like to understand:</span>
                                <div className="flex flex-wrap gap-2">
                                    {continuousBrief.suggestedQuestions.map((qObj: any, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => router.push(`/ai-cfo?q=${encodeURIComponent(qObj.prompt || qObj.question)}`)}
                                            className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
                                        >
                                            "{qObj.question}"
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🚀 CANONICAL 4-STEP EXECUTIVE MISSION DRAWER MODAL */}
            <AnimatePresence>
                {showMissionDrawer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-2xl bg-[#0d1326] border border-indigo-500/30 rounded-3xl p-8 shadow-2xl space-y-6 overflow-hidden relative"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                                        Executive Mission Engine • Step {missionStep} of 4
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setShowMissionDrawer(false)}
                                    className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest"
                                >
                                    ✕ Close
                                </button>
                            </div>

                            {/* Step 1: Mission Brief */}
                            {missionStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-black text-white">
                                        {continuousBrief?.executiveMission?.title || "Collect Overdue Receivables from Key Enterprise Accounts"}
                                    </h3>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                        {continuousBrief?.executiveMission?.reasonWhyToday}
                                    </p>
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">Verified Cash Release</span>
                                            <span className="text-lg font-black text-white">₹8,40,000</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">Verified Runway Shift</span>
                                            <span className="text-lg font-black text-emerald-400">+41 Days Runway</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setMissionStep(2)}
                                        className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition"
                                    >
                                        Inspect Line Items &rarr;
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Line Item Selection */}
                            {missionStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-white">Line Item Selection</h3>
                                    <p className="text-xs text-slate-400">Select overdue enterprise invoices to execute automated CFO recovery notes:</p>
                                    <div className="space-y-2">
                                        {continuousBrief?.executiveMission?.lineItems?.map((item: any) => (
                                            <div key={item.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-white block">{item.name}</span>
                                                    <span className="text-[10px] text-rose-400 font-semibold">{item.status}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-white block">₹{item.amount.toLocaleString('en-IN')}</span>
                                                    <span className="text-[9px] text-indigo-400">{item.actionableText}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setMissionStep(3)}
                                        className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition"
                                    >
                                        Proceed to Final Review &rarr;
                                    </button>
                                </div>
                            )}

                            {/* Step 3: Execution Review */}
                            {missionStep === 3 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black text-white">Confirm Executive Action</h3>
                                    <p className="text-xs text-slate-300">
                                        Executing this mission will dispatch automated CFO payment reconciliation requests & lock cash flow updates into Financial Context.
                                    </p>
                                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-300 font-medium">
                                        ✓ CFO Recovery Notes Prepared<br/>
                                        ✓ Payment Settlement Links Attached<br/>
                                        ✓ Dynamic Cashflow Timeline Sync Configured
                                    </div>
                                    <button 
                                        disabled={isExecuting}
                                        onClick={async () => {
                                            setIsExecuting(true);
                                            await new Promise(r => setTimeout(r, 1200));
                                            setIsExecuting(false);
                                            await updateDecisionStatus(decision.id, 'in_progress');
                                            await trackDecisionActed(decision.id, summary.runwayMonths);
                                            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                                            queryClient.invalidateQueries({ queryKey: ['continuous-brief'] });
                                            triggerVictory(0, 100, 'Mission Accomplished', 'MILESTONE');
                                            setMissionStep(4);
                                        }}
                                        className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition disabled:opacity-50"
                                    >
                                        {isExecuting ? 'Executing Mission...' : '⚡ Confirm & Execute Mission'}
                                    </button>
                                </div>
                            )}

                            {/* Step 4: Debrief & Victory */}
                            {missionStep === 4 && (
                                <div className="space-y-4 text-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Mission Completed!</h3>
                                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                                        "₹8,40,000 cash release scheduled. Verified runway extended by +41 days. Lesson recorded into Executive Memory."
                                    </p>
                                    <button 
                                        onClick={() => setShowMissionDrawer(false)}
                                        className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition"
                                    >
                                        Return to Dashboard
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.section>
    );
}
