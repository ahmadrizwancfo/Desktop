'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Clock, AlertTriangle, ArrowRight, 
    CheckCircle2, TrendingDown, Wallet, X, Zap,
    Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCFOState, formatCurrency } from '@/store/cfo-state-store';

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING FLOW — First-Run "Wow" Experience (< 45 seconds)
// Step 1: "Data Digested" → True Runway & Cash
// Step 2: "Biggest Leak" → Top expense category + critical alert
// Step 3: "Quick Win" → Actionable suggestion
// Uses localStorage to track if user has completed onboarding
// ═══════════════════════════════════════════════════════════════════════════════

const ONBOARDING_KEY = 'foundercfo_onboarding_completed';

export function OnboardingFlow() {
    const { data: state } = useCFOState();
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!state || state.noData || state.isDemo) return;
        const done = localStorage.getItem(ONBOARDING_KEY);
        if (!done) {
            // Small delay so dashboard renders first
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const handleComplete = () => {
        localStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
        setVisible(false);
    };

    if (!visible || !state) return null;

    const runway = state.summary.runwayMonths;
    const cash = state.summary.cashInBank;
    const burn = state.summary.netBurn;
    const isSustainable = state.isInfiniteRunway || runway > 36;

    // Find biggest expense category
    const categories = state.categoryBreakdown || [];
    const biggestLeak = categories.length > 0
        ? categories.reduce((max, cat) => (cat.amount || 0) > (max.amount || 0) ? cat : max, categories[0])
        : null;

    // Find a quick win
    const topAlert = state.criticalAlerts?.[0];
    const quickWin = topAlert
        ? { title: topAlert.title, desc: topAlert.description }
        : biggestLeak
            ? { title: `Review ${biggestLeak.category}`, desc: `₹${((biggestLeak.amount || 0) / 100000).toFixed(1)}L spent here — is every line item justified?` }
            : { title: 'Categorize Transactions', desc: 'Clean categorization improves AI accuracy by 40%.' };

    const steps = [
        // Step 1: Data Digested
        {
            icon: <Sparkles className="w-8 h-8 text-emerald-400" />,
            title: 'Your Data is Live',
            subtitle: 'We analyzed your financial data in seconds.',
            content: (
                <div className="grid grid-cols-2 gap-6 mt-8">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cash</span>
                        </div>
                        <p className="text-3xl font-black text-white tabular-nums">{formatCurrency(cash)}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Runway</span>
                        </div>
                        <p className={cn(
                            "text-3xl font-black tabular-nums",
                            isSustainable ? "text-emerald-400" : runway > 6 ? "text-white" : "text-rose-400"
                        )}>
                            {isSustainable ? '> 36 mo' : `${runway.toFixed(1)} mo`}
                        </p>
                    </div>
                </div>
            ),
        },
        // Step 2: Top Mandate
        {
            icon: <TrendingDown className="w-8 h-8 text-amber-400" />,
            title: 'Top Strategic Mandate',
            subtitle: 'FounderCFO prioritizes your most critical financial mandate.',
            content: (
                <div className="mt-8 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-xs uppercase tracking-wider text-amber-400">DAILY FOCUS</h4>
                            <p className="text-white font-bold text-base mt-1">
                                {state.decisionEngine?.dailyFocus?.oneThing?.title || "Preserve cash & optimize saas subscription stack by 20%."}
                            </p>
                            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                                Act on this mandate directly from the Decision Center on the dashboard to build trust score.
                            </p>
                        </div>
                    </div>
                </div>
            ),
        },
        // Step 3: Scenario Simulator
        {
            icon: <Zap className="w-8 h-8 text-primary" />,
            title: 'Model Your Future',
            subtitle: 'Use the What-If Simulator to forecast changes in headcount, revenue, and subscriptions.',
            content: (
                <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-base">Natural Language Simulator</h4>
                            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                                Simply type things like <span className="text-primary font-bold">"hire 2 devs"</span> or <span className="text-primary font-bold">"cut marketing by 30%"</span> to immediately witness real-time runway impacts.
                            </p>
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    const current = steps[step];

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 30 }}
                        className="relative w-full max-w-lg mx-4 bg-[#0a0f1e] border border-white/10 rounded-[2rem] p-10 shadow-2xl"
                    >
                        {/* Close */}
                        <button
                            onClick={handleComplete}
                            className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-2 mb-8">
                            {steps.map((_, i) => (
                                <div key={i} className={cn(
                                    "h-1 rounded-full transition-all duration-500",
                                    i <= step ? "bg-primary flex-[2]" : "bg-white/10 flex-1"
                                )} />
                            ))}
                        </div>

                        {/* Content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        {current.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">{current.title}</h2>
                                        <p className="text-sm text-slate-400 mt-0.5">{current.subtitle}</p>
                                    </div>
                                </div>
                                {current.content}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-10">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                Step {step + 1} of {steps.length}
                            </span>
                            {step < steps.length - 1 ? (
                                <button
                                    onClick={() => setStep(s => s + 1)}
                                    className="flex items-center gap-2 px-8 py-3 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Next <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Go to Dashboard
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
