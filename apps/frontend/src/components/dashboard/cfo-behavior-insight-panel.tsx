'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, TrendingUp, AlertTriangle, Lightbulb, Target, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BehaviorPattern {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
}

interface BehavioralAudit {
    behaviorScore: number;
    riskProfile: 'Aggressive' | 'Balanced' | 'Conservative';
    patterns: BehaviorPattern[];
    insights: string[];
    warnings: string[];
    recommendations: string[];
}

interface CfoBehaviorInsightPanelProps {
    audit: BehavioralAudit | null;
}

export function CfoBehaviorInsightPanel({ audit }: CfoBehaviorInsightPanelProps) {
    if (!audit) return null;

    const { 
        behaviorScore = 0, 
        riskProfile = 'Balanced', 
        patterns = [], 
        insights = [], 
        warnings = [], 
        recommendations = [] 
    } = audit || {};

    const profileColors = {
        Aggressive: "text-red-400 border-red-400/20 bg-red-400/5",
        Balanced: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
        Conservative: "text-blue-400 border-blue-400/20 bg-blue-400/5"
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#0a0f1e] border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl">
                        <BrainCircuit className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">CFO Intelligence Audit</h2>
                        <p className="text-sm text-slate-500 font-medium">Behavioral analysis of your decision memory.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center min-w-[120px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">CFO Score</span>
                        <div className={cn(
                            "text-3xl font-black",
                            behaviorScore > 70 ? "text-emerald-400" : behaviorScore > 40 ? "text-orange-400" : "text-red-400"
                        )}>
                            {behaviorScore}
                        </div>
                    </div>
                    <div className={cn("px-6 py-4 rounded-3xl border flex flex-col items-center justify-center min-w-[120px]", profileColors[riskProfile])}>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Risk Profile</span>
                        <div className="text-sm font-black uppercase tracking-widest">{riskProfile}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Insights & Patterns */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Core Tendencies</h3>
                        </div>
                        <div className="space-y-3">
                            {insights.map((insight, i) => (
                                <p key={i} className="text-base text-slate-300 font-medium leading-relaxed">
                                    "{insight}"
                                </p>
                            ))}
                            {patterns.map((pattern, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        pattern.severity === 'HIGH' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-orange-500"
                                    )} />
                                    <span className="text-sm text-slate-300">{pattern.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Warnings & Recommendations */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Critical Warnings</h3>
                        </div>
                        <div className="space-y-3">
                            {warnings.map((warning, i) => (
                                <div key={i} className="flex gap-3 text-sm text-red-400 bg-red-400/5 border border-red-400/10 p-4 rounded-2xl">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span>{warning}</span>
                                </div>
                            ))}
                            {recommendations.map((rec, i) => (
                                <div key={i} className="flex gap-3 text-sm text-emerald-400 bg-emerald-400/5 border border-emerald-400/10 p-4 rounded-2xl">
                                    <Lightbulb className="w-5 h-5 shrink-0" />
                                    <span>{rec}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
