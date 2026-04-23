'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Activity, ArrowUpRight, ArrowDownRight, ChevronRight, Skull, ShieldCheck, ShieldAlert, Shield, Share2, Users, TrendingDown, Target, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { apiClient } from '@/lib/api-client';
import { DecisionImpactPanel } from './decision-impact-panel';
import { CfoBehaviorInsightPanel } from './cfo-behavior-insight-panel';
import { CfoActionCenter } from './cfo-action-center';
import { evaluateDecisionImpact, GuardEvaluation, SimulationInput } from '@/lib/pre-decision-guard';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming it exists or I'll use a simple one

export interface CfoAction {
    title: string;
    impact: string;         // Positive impact
    tradeoff?: string;      // Negative consequence
    onClick?: () => void;
}

interface CfoDecisionScreenProps {
    criticalWarning?: string;
    heroHeadline?: string;
    runwayMonths?: number;
    zeroCashDateStr?: string;
    daysToAct?: number;
    pointOfNoReturn?: string;
    riskTitle?: string;
    riskDescription?: string;
    decisionMessage?: string;
    shareableInsight?: string;
    convictionLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendedActions?: CfoAction[];
    onViewBreakdown?: () => void;
    onRecalculate?: () => void;
    inertiaMetrics?: {
        ignoredAlerts: number;
        daysSinceLastAction: number;
    };
    behavioralAudit?: any;
    autonomousRecommendations?: any;
    currentFinancials?: {
        cashBalance: number;
        monthlyBurn: number;
        monthlyRevenue: number;
    };
}

export function CfoDecisionScreen({
    criticalWarning = 'You have ignored a critical decision to reduce marketing spend for 4 days.',
    heroHeadline = 'Your runway looks strong, but your margin for error is shrinking.',
    runwayMonths = 5.4,
    zeroCashDateStr = 'Aug 12',
    daysToAct = 14,
    pointOfNoReturn = 'If no action is taken in the next 30 days, your runway will drop below 3 months.',
    riskTitle = 'Biggest Risk Right Now',
    riskDescription = 'Your burn increased 27% in the last 30 days due to unchecked software subscriptions.',
    decisionMessage = 'If your expenses cross ₹35.2L/mo, you will re-enter burn mode permanently.',
    shareableInsight = 'Your fixed costs are compounding faster than your ability to acquire new customers.',
    convictionLevel = 'HIGH',
    recommendedActions = [
        {
            title: 'Cut SaaS Costs Now',
            impact: 'Extends runway by +8 months',
            tradeoff: 'May disrupt engineering workflows temporarily'
        },
        {
            title: 'Halt Marketing Spend',
            impact: 'Prevents cash zero crossing next quarter',
            tradeoff: 'May slow growth by ~15%'
        }
    ],
    onViewBreakdown,
    onRecalculate,
    inertiaMetrics = { ignoredAlerts: 0, daysSinceLastAction: 0 },
    behavioralAudit,
    autonomousRecommendations,
    currentFinancials = { cashBalance: 12000000, monthlyBurn: 2500000, monthlyRevenue: 1500000 } // Default fallback
}: CfoDecisionScreenProps) {
    const [simResult, setSimResult] = React.useState<any>(null);
    const [isInvestorMode, setIsInvestorMode] = React.useState(false);
    const [isSimulating, setIsSimulating] = React.useState(false);
    const [isSandboxOpen, setIsSandboxOpen] = React.useState(false);
    
    // Sandbox Inputs
    const [modifiers, setModifiers] = React.useState<SimulationInput>({
        revenueChange: 0,
        costChange: 0,
        hiringImpact: 0,
        oneTimeExpense: 0
    });

    const containerRef = React.useRef<HTMLDivElement>(null);

    // Recompute guard evaluation on the fly
    const guardEvaluation = React.useMemo(() => {
        return evaluateDecisionImpact(modifiers, {
            cashBalance: currentFinancials.cashBalance,
            monthlyBurn: currentFinancials.monthlyBurn,
            monthlyRevenue: currentFinancials.monthlyRevenue,
            runwayMonths: runwayMonths
        });
    }, [modifiers, currentFinancials, runwayMonths]);

    const displayRunway = simResult ? (simResult.new_runway_days_remaining / 30).toFixed(1) : runwayMonths.toFixed(1);
    const displayZeroDate = simResult ? (simResult.new_estimated_zero_cash_date ? new Date(simResult.new_estimated_zero_cash_date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }) : 'Unknown') : zeroCashDateStr;

    const interventionMessage = React.useMemo(() => {
        if (!behavioralAudit || !guardEvaluation) return null;
        if (guardEvaluation.riskLevel === 'DANGER' && behavioralAudit.patterns?.some((p: any) => p.type === 'HIGH_RISK_BIAS')) {
            return "Intervention: You typically take similar decisions that reduce runway significantly.";
        }
        return null;
    }, [behavioralAudit, guardEvaluation]);

    const isCfoBlocked = React.useMemo(() => {
        if (!autonomousRecommendations || !guardEvaluation) return false;
        return autonomousRecommendations.cfoRecommendation === 'BLOCK' && guardEvaluation.riskLevel === 'DANGER';
    }, [autonomousRecommendations, guardEvaluation]);

    const runSimulation = async (modifiers: any) => {
        setIsSimulating(true);
        try {
            const res = await apiClient.post('/cfo-engine/simulate', modifiers);
            setSimResult(res.data);
            if (onRecalculate) onRecalculate();
        } catch (err) {
            console.error('Simulation failed', err);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleShare = async () => {
        if (containerRef.current === null) return;
        try {
            const dataUrl = await toPng(containerRef.current, { cacheBust: true });
            saveAs(dataUrl, `foundercfo-snapshot-${Date.now()}.png`);
        } catch (err) {
            console.error('Failed to generate snapshot', err);
        }
    };

    
    const renderConvictionBadge = () => {
        if (convictionLevel === 'HIGH') {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold tracking-widest uppercase text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>High Conviction (Real Data)</span>
                </div>
            );
        }
        if (convictionLevel === 'MEDIUM') {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold tracking-widest uppercase text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Medium Conviction (Partial Data)</span>
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-xs font-semibold tracking-widest uppercase text-slate-400">
                <Shield className="w-4 h-4" />
                <span>Low Conviction (Assumptions)</span>
            </div>
        );
    };

    const renderInertiaBadge = () => {
        if (inertiaMetrics.ignoredAlerts > 0 || inertiaMetrics.daysSinceLastAction > 3) {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold tracking-widest uppercase text-orange-400">
                    <Clock className="w-4 h-4" />
                    <span>Inertia Risk: {inertiaMetrics.daysSinceLastAction} days stagnant</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#060913] flex flex-col font-sans selection:bg-rose-500/30">
            {/* 4. ELEVATED CRITICAL WARNING */}
            <AnimatePresence>
                {criticalWarning && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="w-full bg-red-600 border-b border-red-500/50"
                    >
                        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                                <span className="text-white font-bold tracking-wide uppercase text-sm">
                                    {criticalWarning}
                                </span>
                            </div>
                            <button className="text-white/80 hover:text-white text-sm font-bold uppercase underline decoration-white/30 hover:decoration-white underline-offset-4 transition-all">
                                Act Now
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                {/* Harsh Spotlight Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />

                <div className="relative w-full max-w-4xl mx-auto space-y-4" ref={containerRef}>
                    {/* TOP CONTROLS */}
                    <div className="flex justify-between items-center mb-2 px-2">
                        <div className="flex gap-4">
                            <button 
                                onClick={handleShare}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share Insight
                            </button>
                        </div>
                        <div className="flex items-center gap-3 p-1 bg-white/5 border border-white/5 rounded-xl">
                            <button 
                                onClick={() => setIsInvestorMode(false)}
                                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", !isInvestorMode ? "bg-white text-black" : "text-slate-500 hover:text-white")}
                            >
                                Founder View
                            </button>
                            <button 
                                onClick={() => setIsInvestorMode(true)}
                                className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", isInvestorMode ? "bg-white text-black" : "text-slate-500 hover:text-white")}
                            >
                                Investor View
                            </button>
                        </div>
                    </div>
                    
                    {/* 1. TOP SECTION (Hero Card - Urgency) */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                        className={cn("bg-[#0a0f1e] border border-red-500/20 rounded-t-3xl rounded-b-xl p-10 sm:p-14 shadow-[0_0_80px_-20px_rgba(220,38,38,0.15)] relative transition-all duration-500", isSimulating && "opacity-50 grayscale")}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
                        
                        <div className="space-y-8">
                            <div className="flex flex-wrap items-center gap-3">
                                {renderConvictionBadge()}
                                {renderInertiaBadge()}
                            </div>

                            <div className="space-y-4">
                                <AnimatePresence mode="wait">
                                    <motion.h1 
                                        key={displayRunway + isInvestorMode}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="text-5xl sm:text-7xl font-black tracking-tighter text-white leading-[1.1]"
                                    >
                                        {isInvestorMode ? (
                                            <>Capital runway sits at <span className="text-red-500">{displayRunway} months</span>.</>
                                        ) : (
                                            <>You have <span className="text-red-500">{displayRunway} months</span> left.</>
                                        )}
                                    </motion.h1>
                                </AnimatePresence>
                                <p className="text-xl sm:text-2xl text-rose-200/90 font-medium tracking-tight">
                                    {isInvestorMode ? "Without correction, capital will be required within 60 days." : heroHeadline}
                                </p>
                            </div>

                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 1.0, ease: 'easeOut' }}
                                className="flex flex-col sm:flex-row gap-6 sm:items-center bg-black/40 border border-white/5 rounded-2xl p-6"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-orange-500" />
                                    <div>
                                        <p className="text-sm text-slate-400 uppercase font-bold tracking-widest">Future Timeline</p>
                                        <p className="text-lg text-white font-medium">Your cash hits zero on <span className="text-red-400 font-bold">{displayZeroDate}</span>.</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-white/10" />
                                <div>
                                    <p className="text-sm text-slate-400 uppercase font-bold tracking-widest">Critical Window</p>
                                    <p className="text-lg text-white font-medium">You have <span className="text-orange-400 font-bold">{daysToAct} days</span> to act.</p>
                                </div>
                            </motion.div>

                            {/* AUTONOMOUS CFO COMMANDS */}
                            <CfoActionCenter recommendations={autonomousRecommendations} />
                        </div>
                    </motion.div>
                    
                    {/* CFO BEHAVIORAL INSIGHT PANEL */}
                    <div className="mt-8">
                         <CfoBehaviorInsightPanel audit={behavioralAudit} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 2. DECISION BLOCK & BIGGEST RISK */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1.6, ease: 'easeOut' }}
                            className="bg-[#0b1021] border border-white/5 rounded-xl p-8 flex flex-col"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Activity className="w-5 h-5 text-orange-500" />
                                <h2 className="text-sm uppercase tracking-widest font-bold text-orange-500">{isInvestorMode ? "BURN DISCIPLINE" : riskTitle}</h2>
                            </div>
                            
                            <p className="text-white text-2xl font-bold leading-tight tracking-tight mb-8">
                                {isInvestorMode ? "Company is currently in expansion mode with negative operational cash flow." : riskDescription}
                            </p>
                            
                            <div className="mt-auto space-y-4">
                                <div className="p-4 bg-red-950/30 border-l-2 border-red-500 rounded-r-lg">
                                    <span className="text-xs font-black uppercase text-red-500 tracking-widest block mb-1">Point of No Return</span>
                                    <p className="text-red-200 text-sm font-medium">
                                        {pointOfNoReturn}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-slate-300 text-base font-medium italic border-l-2 border-white/20 pl-4">
                                        "{shareableInsight}"
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. WHAT-IF SIMULATION LAYER (Engagement Engine) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 2.2, ease: 'easeOut' }}
                            className="bg-[#0b1021] border border-white/5 rounded-xl p-8 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Zap className={cn("w-5 h-5 text-emerald-500")} />
                                    <h2 className="text-sm uppercase tracking-widest font-bold text-emerald-500">Decision Sandbox</h2>
                                </div>
                                <button 
                                    onClick={() => {
                                        setModifiers({ revenueChange: 0, costChange: 0, hiringImpact: 0, oneTimeExpense: 0 });
                                        setIsSandboxOpen(!isSandboxOpen);
                                    }}
                                    className="text-[10px] text-emerald-500/60 hover:text-emerald-500 uppercase font-black tracking-widest transition-all"
                                >
                                    {isSandboxOpen ? 'Close Sandbox' : 'Open Controls'}
                                </button>
                            </div>
                            
                            {!isSandboxOpen ? (
                                <div className="space-y-3 mb-8">
                                    <button 
                                        onClick={() => { setIsSandboxOpen(true); setModifiers(prev => ({ ...prev, hiringImpact: 200000 })); }}
                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Users className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-bold text-white uppercase tracking-tight">Hire 2 people (₹2L/mo)</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-all" />
                                    </button>

                                    <button 
                                        onClick={() => { setIsSandboxOpen(true); setModifiers(prev => ({ ...prev, revenueChange: -300000 })); }}
                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                            <span className="text-sm font-bold text-white uppercase tracking-tight">Revenue drops 20%</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-all" />
                                    </button>
                                    
                                    <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest text-center py-4 italic">
                                        Select a preset or open controls to design a custom scenario.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6 mb-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monthly Cost Change</label>
                                                <span className={cn("text-xs font-bold", (modifiers.costChange || 0) > 0 ? "text-red-400" : "text-emerald-400")}>
                                                    {(modifiers.costChange || 0) > 0 ? '+' : ''}{Math.round((modifiers.costChange || 0) / 1000)}k
                                                </span>
                                            </div>
                                            <input 
                                                type="range" min="-1000000" max="1000000" step="50000"
                                                value={modifiers.costChange}
                                                onChange={(e) => setModifiers(prev => ({ ...prev, costChange: parseInt(e.target.value) }))}
                                                className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monthly Revenue Change</label>
                                                <span className={cn("text-xs font-bold", (modifiers.revenueChange || 0) > 0 ? "text-emerald-400" : "text-red-400")}>
                                                    {(modifiers.revenueChange || 0) > 0 ? '+' : ''}{Math.round((modifiers.revenueChange || 0) / 1000)}k
                                                </span>
                                            </div>
                                            <input 
                                                type="range" min="-1000000" max="1000000" step="50000"
                                                value={modifiers.revenueChange}
                                                onChange={(e) => setModifiers(prev => ({ ...prev, revenueChange: parseInt(e.target.value) }))}
                                                className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Real-time Impact Logic injected here via rendering DecisionImpactPanel elsewhere or inline */}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Skull className="w-5 h-5 text-slate-400" />
                                    <h2 className="text-sm uppercase tracking-widest font-bold text-slate-400">What You Must Do Now</h2>
                                </div>
                                <div className="space-y-4">
                                    {recommendedActions.map((action, i) => (
                                        <button 
                                            key={i}
                                            onClick={action.onClick}
                                            className="w-full group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 text-left transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                                                        {action.title}
                                                    </h3>
                                                    <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                                                        <ArrowUpRight className="w-4 h-4" />
                                                        {action.impact}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* 5. REDUCE COGNITIVE LOAD (Hide Breakdown) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 3.8 }}
                        className="flex justify-center pt-8"
                    >
                        <button 
                            onClick={onViewBreakdown}
                            className="text-slate-500 hover:text-white text-xs uppercase tracking-[0.2em] font-bold transition-colors focus:outline-none underline decoration-slate-700 hover:decoration-white underline-offset-[12px]"
                        >
                            View Full Financial Breakdown
                        </button>
                    </motion.div>
                </div>
            </div>
            {/* PRE-DECISION GUARD OVERLAY */}
            <AnimatePresence>
                {isSandboxOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end p-6 bg-black/40 backdrop-blur-sm pointer-events-none">
                        <div className="pointer-events-auto h-full max-h-[90vh]">
                            <DecisionImpactPanel 
                                evaluation={guardEvaluation}
                                interventionMessage={interventionMessage || undefined}
                                isCfoBlocked={isCfoBlocked}
                                escalationLevel={behavioralAudit?.escalationLevel || 0}
                                complianceScore={behavioralAudit?.complianceScore || 100}
                                onProceed={async (overrideReason) => {
                                    // Log simulation on backend
                                    await apiClient.post('/cfo-engine/state/simulation-log', {
                                        modifiers,
                                        evaluation: {
                                            ...guardEvaluation,
                                            overrideReason
                                        }
                                    });
                                    // Apply to local state
                                    setSimResult({
                                        new_runway_days_remaining: guardEvaluation.runwayAfter * 30.44,
                                        new_estimated_zero_cash_date: guardEvaluation.zeroCashDateAfter
                                    });
                                    setIsSandboxOpen(false);
                                }}
                                onCancel={() => {
                                    setModifiers({ revenueChange: 0, costChange: 0, hiringImpact: 0, oneTimeExpense: 0 });
                                    setIsSandboxOpen(false);
                                }}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
