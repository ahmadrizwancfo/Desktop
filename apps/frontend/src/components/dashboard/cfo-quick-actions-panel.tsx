'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, 
    ArrowRight, 
    ShieldCheck, 
    TrendingUp, 
    Flame,
    Lock,
    Unlock,
    Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface QuickAction {
    id: string;
    title: string;
    impact: string;
    description: string;
    executionMode: 'ONE_CLICK_APPLY' | 'REVIEW_REQUIRED' | 'APPROVAL_REQUIRED' | 'SUGGESTED';
    type: string;
}

interface CfoQuickActionsPanelProps {
    actions: QuickAction[];
    complianceScore: number;
}

export function CfoQuickActionsPanel({ actions, complianceScore }: CfoQuickActionsPanelProps) {
    const trustZoneActions = actions.filter(a => a.executionMode === 'ONE_CLICK_APPLY');
    const reviewActions = actions.filter(a => a.executionMode === 'REVIEW_REQUIRED' || a.executionMode === 'APPROVAL_REQUIRED');

    const handleApply = async (id: string) => {
        try {
            await apiClient.post(`/cfo-engine/state/mandate-apply/${id}`);
            window.location.reload();
        } catch (error) {
            console.error('Execution failed:', error);
        }
    };

    if (actions.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Execution Hub</h2>
                </div>
                {complianceScore >= 85 && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">Trust Zone Active</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1-Click Apply Zone */}
                {trustZoneActions.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">⚡ Instant Execution</p>
                        <div className="space-y-3">
                            {trustZoneActions.map((action) => (
                                <motion.div 
                                    key={action.id}
                                    whileHover={{ scale: 1.01 }}
                                    className="bg-indigo-600 border border-indigo-400/50 rounded-2xl p-5 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                        <Zap className="w-16 h-16 text-white" />
                                    </div>
                                    
                                    <div className="relative z-10 space-y-3">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-white uppercase tracking-tight">{action.title}</h3>
                                            <p className="text-xs text-indigo-100/70 font-bold leading-relaxed">{action.description}</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> {action.impact}
                                            </div>
                                            <button 
                                                onClick={() => handleApply(action.id)}
                                                className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-black/10"
                                            >
                                                Apply Now
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Review/Approval Zone */}
                {reviewActions.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">🔍 Strategic Review</p>
                        <div className="space-y-3">
                            {reviewActions.map((action) => (
                                <div 
                                    key={action.id}
                                    className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center justify-between group hover:border-white/20 transition-all"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white tracking-tight">{action.title}</h3>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                                            {action.executionMode === 'APPROVAL_REQUIRED' ? 'Requires CEO Approval' : 'Review Required'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleApply(action.id)}
                                        className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
