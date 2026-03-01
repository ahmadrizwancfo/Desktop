'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AlertTriangle, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function AiInsightsWidget() {
    const { data: insights, isLoading } = useQuery({
        queryKey: ['ai-insights'],
        queryFn: async () => {
            const res = await apiClient.get('/ai/insights');
            return res.data;
        },
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center min-h-[150px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
        TDS_ALERT: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
        COMPLIANCE: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        OPTIMIZATION: { icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
        SAVINGS: { icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI Insights</h3>
            {insights?.length === 0 ? (
                <div className="glass-card rounded-2xl p-4 text-center text-slate-500 text-sm">
                    No insights yet. Add more transactions!
                </div>
            ) : (
                insights?.slice(0, 3).map((insight: any, i: number) => {
                    const config = typeConfig[insight.type] || typeConfig.OPTIMIZATION;
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                                "glass-card rounded-2xl p-4 border",
                                config.bg
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("p-2 rounded-xl", config.bg.split(' ')[0])}>
                                    <Icon className={cn("w-4 h-4", config.color)} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={cn("font-bold text-sm", config.color)}>{insight.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{insight.description}</p>
                                    {insight.action && (
                                        <button className={cn(
                                            "mt-2 text-[10px] font-bold uppercase tracking-widest",
                                            config.color
                                        )}>
                                            {insight.action} →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
