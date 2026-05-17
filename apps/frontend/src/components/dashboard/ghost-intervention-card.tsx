'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ghost, ShieldAlert, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CriticalAlert, useCfoStateStore } from '@/store/cfo-state-store';
import { apiClient } from '@/lib/api-client';

interface GhostInterventionCardProps {
    alert: CriticalAlert;
    onAcknowledged?: () => void;
}

export function GhostInterventionCard({ alert, onAcknowledged }: GhostInterventionCardProps) {
    const [isOverriding, setIsOverriding] = useState(false);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleAcknowledge = async () => {
        try {
            await apiClient.post(`/cfo-engine/state/alert-acknowledge/${alert.id}`);
            onAcknowledged?.();
        } catch (err) {
            console.error('Failed to acknowledge ghost alert', err);
        }
    };

    const handleOverride = async () => {
        if (!comment.trim()) return;
        setIsSubmitting(true);
        try {
            const decisionId = alert.id.replace('ghost_', '');
            await apiClient.post('/cfo-engine/state/ghost-override', {
                decisionId,
                comment
            });
            onAcknowledged?.();
        } catch (err) {
            console.error('Failed to override ghost alert', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full mb-8 relative group"
        >
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-[2.5rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative bg-slate-900 border-2 border-rose-500/30 rounded-[2.5rem] p-8 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <Ghost size={120} />
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center relative z-10">
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-rose-500" />
                        </div>
                    </div>

                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Critical Intervention Required</span>
                            <div className="h-px w-12 bg-rose-500/20" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                            {alert.title}
                        </h2>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-2xl">
                            {alert.description}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        {!isOverriding ? (
                            <>
                                <button
                                    onClick={handleAcknowledge}
                                    className="px-6 py-4 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-white/5"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Fixing in Zoho Now
                                </button>
                                <button
                                    onClick={() => setIsOverriding(true)}
                                    className="px-6 py-4 rounded-xl bg-slate-800 text-white border border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    Valid Residual Payment
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3 w-full sm:min-w-[300px]">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="One-line residual comment..."
                                        className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all"
                                        autoFocus
                                    />
                                    <MessageSquare className="absolute right-4 top-3.5 w-4 h-4 text-slate-700" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={!comment.trim() || isSubmitting}
                                        onClick={handleOverride}
                                        className="flex-grow px-4 py-3 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isSubmitting ? 'Confirming...' : 'Confirm Override'}
                                    </button>
                                    <button
                                        onClick={() => setIsOverriding(false)}
                                        className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Penalty: 5% Daily Burn Tax active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Window: 3-Day Discrepancy detected</span>
                    </div>
                    <div className="ml-auto text-rose-400 font-mono text-xs font-bold flex items-center gap-2">
                        Trust Score Penalty: -12.4%
                        <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
