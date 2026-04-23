'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, HelpCircle } from 'lucide-react';
import { CFOTooltip } from "@/components/ui/cfo-tooltip";

interface SafeModeBannerProps {
    active: boolean;
    rollbackRate: number;
    recoveryProgress?: number;
}

export function SafeModeBanner({ active, rollbackRate, recoveryProgress = 0 }: SafeModeBannerProps) {
    if (!active) return null;

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full bg-indigo-600 px-6 py-2.5 flex items-center justify-center gap-3 shadow-lg z-50 overflow-hidden relative"
        >
            {/* Subtle progress background pulse */}
            {recoveryProgress > 0 && (
                <motion.div 
                    className="absolute inset-0 bg-indigo-400/10 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: recoveryProgress / 5 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            )}

            <ShieldAlert className="w-4 h-4 text-white animate-pulse relative z-10" />
            <p className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 relative z-10">
                Auto-Pilot downgraded to Safe Mode
                <span className="opacity-60 font-medium normal-case tracking-normal hidden sm:inline">
                    (Rollback rate {Math.round(rollbackRate * 100)}% exceeds safety threshold)
                </span>
            </p>
            
            <div className="h-4 w-[1px] bg-white/20 mx-2 relative z-10" />
            
            <div className="text-[10px] font-bold text-indigo-100 flex items-center gap-1.5 relative z-10">
                Manual approval required for all actions
                
                <CFOTooltip
                    title="How to unlock?"
                    explanation="Recalibrate the engine by manually reviewing and executing recommended actions. We require 5 successful manual cycles with low rollback risk to restore trust."
                    advice={`System confidence rebuilding: ${recoveryProgress}/5 cycles completed.`}
                    type="info"
                    position="bottom"
                >
                    <HelpCircle className="w-3 h-3 opacity-60 cursor-help" />
                </CFOTooltip>
            </div>

            {recoveryProgress > 0 && (
                <div className="ml-auto hidden md:flex items-center gap-2 px-2 py-1 bg-white/10 rounded border border-white/5 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
                        Recalibrating Trust ({recoveryProgress}/5)
                    </span>
                </div>
            )}
        </motion.div>
    );
}
