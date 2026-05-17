'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, TrendingDown, Target, BrainCircuit, Activity, Lock, Unlock, ArrowRight } from 'lucide-react';
import { CFOState, formatCurrency } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';

interface OnboardingTruthTestProps {
    state: CFOState;
    onComplete: () => void;
}

export function OnboardingTruthTest({ state, onComplete }: OnboardingTruthTestProps) {
    const [step, setStep] = useState(0);
    const { summary, behavioralAudit } = state;

    const totalCash = Number(summary.cashInBank) / 0.72; // Reverse the 28% for the "reveal"
    const statutoryBuffer = totalCash * 0.28;
    const spendableCash = Number(summary.cashInBank);
    const runwayDays = Math.round(summary.runwayMonths * 30.4);

    useEffect(() => {
        if (step < 3) {
            const timer = setTimeout(() => setStep(step + 1), step === 0 ? 3000 : 4000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-center space-y-8"
                        >
                            <div className="flex justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="p-4 bg-primary/10 rounded-3xl"
                                >
                                    <BrainCircuit className="w-16 h-16 text-primary" />
                                </motion.div>
                            </div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                                Auditing Financial Nervous System...
                            </h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                                Extracting deterministic truth from your connected accounts.
                            </p>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            <div className="text-center">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Node Liquidity</h3>
                                <div className="text-7xl font-black text-white tracking-tighter">
                                    {formatCurrency(totalCash)}
                                </div>
                            </div>

                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                transition={{ delay: 1.5 }}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] p-8 relative overflow-hidden"
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ delay: 1.5, duration: 2 }}
                                    className="absolute inset-0 bg-rose-500/10"
                                />
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-rose-500/20 rounded-2xl">
                                            <Lock className="w-6 h-6 text-rose-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-rose-500 font-black uppercase tracking-widest text-xs">Statutory Lock Triggered</h4>
                                            <p className="text-rose-500/60 text-[10px] font-bold uppercase tracking-widest">Applying 28% GST + TDS Buffer</p>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-rose-500">
                                        -{formatCurrency(statutoryBuffer)}
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 3 }}
                                className="text-center"
                            >
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Spendable Cash (Oxygen)</h3>
                                <div className="text-8xl font-black text-primary tracking-tighter">
                                    {formatCurrency(spendableCash)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8"
                        >
                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Survival Verdict</h3>
                                <div className="space-y-2">
                                    <div className="text-6xl font-black text-white tracking-widest">{runwayDays}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Days of Oxygen Remaining</div>
                                </div>
                                <div className={cn(
                                    "px-4 py-2 rounded-full inline-block text-[10px] font-black uppercase tracking-widest",
                                    runwayDays < 90 ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-500"
                                )}>
                                    {runwayDays < 90 ? "CRITICAL RISK DETECTED" : "STABLE SURVIVAL ZONE"}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-6">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Efficiency Score</h3>
                                <div className="space-y-4">
                                    <div className="text-6xl font-black text-emerald-400">82<span className="text-2xl text-slate-500">/100</span></div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '82%' }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                                        Your behavior over the last 90 days indicates high discipline, but specific oxygen leaks remain.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-2xl mx-auto text-center space-y-10"
                        >
                            <div className="flex justify-center">
                                <div className="p-6 bg-primary rounded-[2.5rem]">
                                    <Target className="w-12 h-12 text-black" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                    Strategic Mandate #1
                                </h2>
                                <p className="text-slate-400 font-medium text-lg">
                                    Your first diagnostic reveals ₹45,000 in monthly zombie subscriptions. Killing these immediately adds 18 days of oxygen.
                                </p>
                            </div>
                            <button
                                onClick={onComplete}
                                className="group w-full bg-primary hover:bg-primary/90 text-black py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-lg transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
                            >
                                Enter War Room
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
