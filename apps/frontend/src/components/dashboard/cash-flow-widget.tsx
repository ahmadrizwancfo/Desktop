'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TrendingDown, TrendingUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function CashFlowWidget() {
    const { data: forecast, isLoading } = useQuery({
        queryKey: ['cash-flow-forecast'],
        queryFn: async () => {
            const res = await apiClient.get('/ai/cash-flow');
            return res.data;
        },
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    const riskColors = {
        LOW: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        HIGH: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-6 relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Cash Flow Forecast
                </h3>
                <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase border",
                    riskColors[forecast?.riskLevel as keyof typeof riskColors] || riskColors.LOW
                )}>
                    {forecast?.riskLevel} Risk
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Monthly Burn</span>
                    </div>
                    <p className="text-xl font-black text-rose-500">
                        ₹{((forecast?.monthlyBurn || 0) / 100000).toFixed(1)}L
                    </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Runway</span>
                    </div>
                    <p className={cn(
                        "text-xl font-black",
                        (forecast?.runwayMonths || 0) < 6 ? "text-rose-500" :
                            (forecast?.runwayMonths || 0) < 12 ? "text-amber-500" : "text-emerald-500"
                    )}>
                        {forecast?.runwayMonths || 0} Months
                    </p>
                </div>
            </div>

            {/* Mini Chart */}
            <div className="space-y-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">3-Month Projection</p>
                <div className="flex items-end gap-2 h-16">
                    {forecast?.forecast?.map((f: any, i: number) => {
                        const height = Math.max(20, Math.min(100, (f.projected / (forecast?.currentBalance || 1)) * 100));
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className={cn(
                                        "w-full rounded-t transition-all",
                                        f.projected > 0 ? "bg-primary/50" : "bg-rose-500/50"
                                    )}
                                    style={{ height: `${height}%` }}
                                />
                                <span className="text-[8px] text-slate-500 font-bold">{f.month.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {(forecast?.riskLevel === 'HIGH') && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <p className="text-xs text-rose-400">
                        Runway is critical. Consider reducing burn or planning fundraise.
                    </p>
                </div>
            )}
        </motion.div>
    );
}
