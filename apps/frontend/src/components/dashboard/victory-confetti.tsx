'use client';

import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2, TrendingUp, ArrowRight } from 'lucide-react';
import { useCfoStateStore } from '@/store/cfo-state-store';

export function VictoryConfetti() {
    const { width, height } = useWindowSize();
    const victoryEvent = useCfoStateStore(s => s.victoryEvent);
    const clearVictory = useCfoStateStore(s => s.clearVictory);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (victoryEvent && victoryEvent.type === 'MILESTONE') {
            setShowContent(true);
            const timer = setTimeout(() => {
                setShowContent(false);
                setTimeout(clearVictory, 500);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [victoryEvent, clearVictory]);

    if (!victoryEvent || victoryEvent.type !== 'MILESTONE') return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <ReactConfetti
                width={width}
                height={height}
                numberOfPieces={400}
                recycle={false}
                colors={['#fbbf24', '#f59e0b', '#d97706', '#ffffff']}
            />
            
            <AnimatePresence>
                {showContent && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -40 }}
                        className="pointer-events-auto bg-slate-900 border-4 border-amber-500/30 rounded-[3rem] p-12 shadow-[0_0_100px_-20px_rgba(245,158,11,0.4)] max-w-xl text-center relative overflow-hidden"
                    >
                        {/* Background Shine */}
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent opacity-50" />
                        
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 ring-4 ring-amber-500/20">
                                <Trophy className="w-12 h-12 text-amber-500" />
                            </div>

                             <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
                                {victoryEvent.title}
                            </h1>
                            
                            <p className="text-xl text-amber-200/60 font-medium mb-8 leading-relaxed">
                                Probation complete. The Mastermind has promoted your status. You are now in the top 4% of capital-efficient founders.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-10">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reputation Score</p>
                                    <p className="text-2xl font-black text-white">98.4</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-2xl font-black text-emerald-400">ELITE</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 justify-center text-emerald-400 text-sm font-bold mb-4">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Investor-Ready Report Unlocked</span>
                                </div>
                                <button 
                                    onClick={clearVictory}
                                    className="w-full py-5 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
                                >
                                    Claim Elite Status
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
