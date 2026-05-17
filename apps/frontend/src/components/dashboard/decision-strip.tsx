'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionStripProps {
    title: string;
    urgency: string;
    consequence: string;
    action: string;
    onExecute: () => void;
    onSimulate: () => void;
}

export function DecisionStrip({ 
    title, 
    urgency, 
    consequence, 
    action, 
    onExecute, 
    onSimulate 
}: DecisionStripProps) {
    return (
        <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="sticky top-0 z-[100] w-full bg-black/90 backdrop-blur-xl border-b border-rose-500/20 px-8 py-4 shadow-[0_4px_30px_rgba(244,63,94,0.1)]"
        >
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                {/* 1. Critical Insight & Urgency */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">{title}</h3>
                            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-black text-[9px] font-black uppercase tracking-widest">
                                {urgency}
                            </span>
                        </div>
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1 italic">
                            If ignored → {consequence}
                        </p>
                    </div>
                </div>

                {/* 2. Recommended Action */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4 group">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            <span className="text-emerald-500">Recommended:</span> {action}
                        </span>
                    </div>
                </div>

                {/* 3. Global Actions */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onExecute}
                        className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Execute
                    </button>
                    <button 
                        onClick={onSimulate}
                        className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Simulate
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
