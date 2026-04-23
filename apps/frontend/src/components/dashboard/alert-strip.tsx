'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AlertStripProps {
    mode: 'STABLE' | 'WARNING' | 'CRITICAL';
    message?: string;
    onAction?: () => void;
    isDemo?: boolean;
    onConnect?: () => void;
}

export function AlertStrip({ mode, message, onAction, isDemo, onConnect }: AlertStripProps) {
    if (mode === 'STABLE' && !isDemo) return null;

    const isCritical = mode === 'CRITICAL';

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
                "relative overflow-hidden border-b transition-colors duration-500",
                isDemo 
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                    : isCritical 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}
        >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isDemo ? "bg-indigo-500/20" : isCritical ? "bg-rose-500/20" : "bg-amber-500/20"
                    )}>
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                        {isDemo && (
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 block opacity-80">Sample Data Active</span>
                        )}
                        <p className="text-xs font-bold tracking-tight">
                            {message || (isDemo
                                ? "This is a simulated high-risk scenario to demonstrate how FounderCFO works."
                                : isCritical 
                                    ? "SURVIVAL MODE: Significant burn deviation detected. Focus on extending runway."
                                    : "Advisory: Minor financial variance detected. Review suggested optimizations.")
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isDemo ? (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={onConnect}
                            className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-white/10 text-indigo-400"
                        >
                            See Your Real Runway <ArrowRight className="w-3 h-3" />
                        </Button>
                    ) : (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={onAction}
                            className={cn(
                                "h-8 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-white/10",
                                isCritical ? "text-rose-400" : "text-amber-400"
                            )}
                        >
                            Review Decisions <ArrowRight className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Subtle pulse for critical mode */}
            {isCritical && (
                <motion.div 
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-rose-500 pointer-events-none"
                />
            )}
        </motion.div>
    );
}
