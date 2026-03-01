'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NarrativeInsightProps {
    type: 'burn' | 'revenue' | 'compliance' | 'insight';
    title: string;
    narrative: string;
    impact: string; // e.g. "+ ₹45,000"
    impactType: 'positive' | 'negative' | 'neutral';
    action?: string; // Optional action button text
}

export function NarrativeInsight({ type, title, narrative, impact, impactType, action }: NarrativeInsightProps) {
    const icons = {
        burn: TrendingDown,
        revenue: TrendingUp,
        compliance: AlertTriangle,
        insight: TrendingUp
    };
    const Icon = icons[type];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-start gap-4"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 bg-[#0f172a]",
                type === 'compliance' ? "text-amber-500" : "text-primary"
            )}>
                <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-white">{title}</h4>
                    <div className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        impactType === 'negative' ? "bg-rose-500/10 text-rose-500" :
                            impactType === 'positive' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-400"
                    )}>
                        {impact}
                    </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                    {narrative}
                </p>

                {action && (
                    <button className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        {action} <ArrowRight className="w-3 h-3" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}
