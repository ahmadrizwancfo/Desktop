'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, ChevronRight, Activity } from 'lucide-react';

interface CriticalInterventionOverlayProps {
    alert: {
        id: string;
        title: string;
        description: string;
        impact: string;
    };
    onAcknowledge: () => void;
}

export function CriticalInterventionOverlay({ alert, onAcknowledge }: CriticalInterventionOverlayProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-xl bg-[#060913] border-2 border-red-500/50 rounded-3xl p-8 sm:p-12 shadow-[0_0_100px_-20px_rgba(239,68,68,0.5)] relative overflow-hidden"
            >
                {/* Background pulse */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full" />

                <div className="relative space-y-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-red-500 animate-[bounce_2s_infinite]" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-500">
                            Critical AI CFO Intervention
                        </h2>
                    </div>

                    <div className="space-y-4 text-center">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                            {alert.title}
                        </h1>
                        <p className="text-lg text-slate-400 font-medium">
                            {alert.description}
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <Activity className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Calculated Impact</p>
                            <p className="text-xl font-bold text-white">{alert.impact}</p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={onAcknowledge}
                            className="w-full group relative overflow-hidden bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl transition-all shadow-[0_10px_30px_-10px_rgba(239,68,68,0.5)] active:scale-95"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <span className="uppercase tracking-widest text-sm">I Understand the Risk</span>
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>

                    <p className="text-center text-[10px] text-slate-600 uppercase font-black tracking-widest leading-relaxed">
                        Interaction with the dashboard is restricted until you acknowledge the AI CFO's critical intervention signal.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
