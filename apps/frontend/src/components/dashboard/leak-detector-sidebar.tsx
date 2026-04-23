'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Clock, MoveRight } from 'lucide-react';
import { Decision, trackDecisionClick } from '@/store/cfo-state-store';
import { formatCurrency, cn } from '@/lib/utils';

interface LeakDetectorSidebarProps {
    decisions: Decision[];
}

export function LeakDetectorSidebar({ decisions }: LeakDetectorSidebarProps) {
    // Isolate mandates with negative runway impacts (the core "Velocity Leaks")
    const leaks = decisions.filter(d => d.impactRunwayDays !== undefined && d.impactRunwayDays < 0);

    if (leaks.length === 0) {
        return (
            <div className="w-full h-full bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <div className="w-4 h-4 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-white">No Active Leaks</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px]">Your fixed costs are stable. Velocity is under control.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#111111] border border-rose-500/20 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-2 border-b border-rose-500/20 pb-4">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">Velocity Leak Detector</h3>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
                {leaks.map((leak, idx) => (
                    <motion.div 
                        key={leak.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-rose-500/5 group border border-rose-500/20 rounded-xl p-4 hover:bg-rose-500/10 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">{leak.title}</h4>
                            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded text-[10px] font-black text-red-400">
                                <TrendingDown className="w-3 h-3" />
                                {Math.abs(leak.impactRunwayDays || 0)} Days Lost
                            </div>
                        </div>

                        <p className="text-xs text-rose-200/80 leading-relaxed font-medium mb-4">
                            {leak.message}
                        </p>
                        
                        {/* Interactive Math Box */}
                        <div className="bg-black/40 rounded-lg p-3 border border-rose-500/10 mb-4">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                <span>Burn Expansion</span>
                                <span>Runway Impact</span>
                            </div>
                            <div className="flex justify-between items-center font-black">
                                <span className="text-white">+ {formatCurrency(Math.abs(leak.impactBurnMonthly || 0))}</span>
                                <span className="text-rose-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    -{Math.abs(leak.impactRunwayDays || 0)} Days
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                trackDecisionClick(leak.id, 'investigate');
                            }}
                            className="w-full py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-rose-500/20 border-b-rose-500/40 cursor-default"
                        >
                            Take Corrective Action
                            <MoveRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </button>
                    </motion.div>
                ))}
            </div>
            
            <div className="mt-2 text-[9px] text-center text-slate-500 uppercase tracking-widest font-black">
                Wartime V4.0 Hard Logic Override Active
            </div>
        </div>
    );
}
