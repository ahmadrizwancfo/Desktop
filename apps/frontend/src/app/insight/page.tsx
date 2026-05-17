'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Shield, Zap, Activity, BrainCircuit } from 'lucide-react';
import { useCFOState } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

const PROCESSING_MESSAGES = [
    "Analyzing your financial health...",
    "Detecting cash flow risks...",
    "Generating CFO insights..."
];

export default function InsightPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
            </div>
        }>
            <InsightContent />
        </React.Suspense>
    );
}

function InsightContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const source = searchParams.get('source'); // 'demo' or 'manual'

    const { data: cfoState, isLoading, refetch } = useCFOState();
    
    // Force a fresh fetch when landing here to guarantee updated insights
    useEffect(() => {
        refetch();
    }, [refetch]);

    const [phase, setPhase] = useState<'processing' | 'insight'>('processing');
    const [msgIndex, setMsgIndex] = useState(0);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    // Swap processing messages every 1200ms to simulate deep analysis
    useEffect(() => {
        if (phase === 'insight') return;
        const interval = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
        }, 1200);
        return () => clearInterval(interval);
    }, [phase]);

    // Enforce a minimum delay (3s) to build anticipation and ensure processing feel
    useEffect(() => {
        const timer = setTimeout(() => setMinTimeElapsed(true), 3500);
        return () => clearTimeout(timer);
    }, []);

    // Transition to insight once data is loaded AND minimum time has elapsed
    useEffect(() => {
        if (minTimeElapsed && !isLoading && cfoState) {
            setPhase('insight');
        }
    }, [minTimeElapsed, isLoading, cfoState]);

    // Handle missing state cleanly
    useEffect(() => {
        if (minTimeElapsed && !isLoading && !cfoState) {
            // Failsafe: if somehow data didn't load, skip to dashboard
            router.replace('/dashboard');
        }
    }, [minTimeElapsed, isLoading, cfoState, router]);

    // ── WOW Insight Data Configuration ──────────────────────────────────────────
    const isDemo = source === 'demo' || cfoState?.isDemo;

    // 1. Headline
    let headline = "Analyzing your runway...";
    if (cfoState) {
        if (cfoState.summary.isSustainable || cfoState.summary.runwayMonths === Infinity) {
            headline = "You have reached profitability with infinite runway.";
        } else {
            headline = `You're likely to run out of cash in ${cfoState.summary.runwayMonths.toFixed(1)} months.`;
        }
    }

    // 2. Supporting Insight
    let supportingInsight = "Your burn rate requires attention to extend runway safely.";
    if (cfoState) {
        if (cfoState.summary.netBurn > cfoState.summary.monthlyRevenue * 2) {
            supportingInsight = "Your current burn is high compared to your revenue.";
        } else if (cfoState.summary.netBurn > cfoState.summary.monthlyRevenue) {
            supportingInsight = "Your current burn is outpacing your revenue growth.";
        } else if (cfoState.summary.netBurn > 0) {
            supportingInsight = "You are burning cash but maintaining a manageable ratio.";
        } else {
            supportingInsight = "You are generating positive cash flow month over month.";
        }
    }

    // 3. Primary Recommendation
    let primaryRecommendation = cfoState?.decisionEngine.decisions[0]?.message || 'Review your dashboard for financial insights and optimization opportunities.';

    if (isDemo) {
        primaryRecommendation = "This startup extended runway by 60 days after optimizing expenses.";
        supportingInsight = "Based on thousands of similar startup trajectories.";
    }

    // 4. Confidence
    const confidenceLabel = cfoState?.dynamicConfidence?.label || (isDemo ? 'LOW' : 'MEDIUM');

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background Splashes */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="absolute top-8 left-8">
                <Logo size="md" />
            </div>

            <AnimatePresence mode="wait">
                {phase === 'processing' ? (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="flex flex-col items-center justify-center text-center px-4"
                    >
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="w-24 h-24 bg-[#0a0f1e] border-2 border-primary/30 rounded-3xl shadow-2xl flex items-center justify-center relative z-10 overflow-hidden">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-t-2 border-primary opacity-50 rounded-3xl"
                                />
                                <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={msgIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl font-black text-white tracking-tight"
                            >
                                {PROCESSING_MESSAGES[msgIndex]}
                            </motion.h2>
                        </AnimatePresence>
                        
                        <p className="text-slate-500 mt-3 font-medium">Please wait while the CFO Engine computes.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="insight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="max-w-2xl w-full px-6 flex flex-col items-center text-center z-10"
                    >
                        {/* Confidence Indicator */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 mb-8"
                        >
                            <Shield className={cn(
                                "w-3.5 h-3.5",
                                confidenceLabel === 'HIGH' ? "text-emerald-400" :
                                confidenceLabel === 'MEDIUM' ? "text-amber-400" : "text-slate-400"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                confidenceLabel === 'HIGH' ? "text-emerald-400" :
                                confidenceLabel === 'MEDIUM' ? "text-amber-400" : "text-slate-400"
                            )}>
                                Based on your data ({confidenceLabel} Confidence)
                            </span>
                        </motion.div>

                        {/* WOW Headline */}
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] mb-6"
                        >
                            {headline}
                        </motion.h1>

                        {/* Supporting Insight */}
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="text-lg sm:text-xl text-slate-400 font-medium mb-10 max-w-lg"
                        >
                            {supportingInsight}
                        </motion.p>

                        {/* Primary Recommendation Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            className="w-full relative group mb-12"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                            <div className="relative p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 text-left">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-2">Immediate Recommendation</h3>
                                    <p className="text-white text-lg font-bold leading-snug">
                                        {primaryRecommendation}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Proceed to Dashboard CTA */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            onClick={() => router.push('/dashboard')}
                            className="px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                        >
                            Open Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
