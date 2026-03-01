'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, DollarSign, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface BreakEvenResult {
    breakEvenUnits: number;
    breakEvenRevenue: number;
    contributionMargin: number;
    contributionMarginRatio: number;
    isAchievable: boolean;
    message: string;
}

export function BreakEvenCalculator() {
    const [fixedCosts, setFixedCosts] = useState(500000);
    const [avgRevenuePerUnit, setAvgRevenuePerUnit] = useState(5000);
    const [variableCostPerUnit, setVariableCostPerUnit] = useState(2000);
    const [result, setResult] = useState<BreakEvenResult | null>(null);

    const calculateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post('/simulator/break-even', {
                fixedCosts,
                avgRevenuePerUnit,
                variableCostPerUnit,
            });
            return res.data as BreakEvenResult;
        },
        onSuccess: (data) => {
            setResult(data);
        }
    });

    const handleCalculate = () => {
        calculateMutation.mutate();
    };

    return (
        <div className="glass-card rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-violet-500" />
                </div>
                Break-Even Calculator
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fixed Costs</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="number"
                            value={fixedCosts}
                            onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                    <p className="text-[10px] text-slate-500">Rent, salaries, software subscriptions</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg. Revenue / Unit</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="number"
                            value={avgRevenuePerUnit}
                            onChange={(e) => setAvgRevenuePerUnit(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Variable Cost / Unit</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="number"
                            value={variableCostPerUnit}
                            onChange={(e) => setVariableCostPerUnit(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                    <p className="text-[10px] text-slate-500">COGS, payment fees, commissions</p>
                </div>
            </div>

            <button
                onClick={handleCalculate}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-bold transition-all mb-8 flex items-center justify-center gap-2"
            >
                <Calculator className="w-4 h-4" />
                Calculate Break-Even Point
            </button>

            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "rounded-2xl p-6 border",
                        result.isAchievable
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-rose-500/10 border-rose-500/20"
                    )}
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "p-3 rounded-xl",
                            result.isAchievable ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                        )}>
                            {result.isAchievable ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">{result.message}</h3>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Break-Even Units</p>
                                    <p className="text-xl font-black text-white">{result.breakEvenUnits === Infinity ? '∞' : result.breakEvenUnits}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Break-Even Revenue</p>
                                    <p className="text-xl font-black text-white">{result.breakEvenRevenue === Infinity ? 'Unachievable' : formatCurrency(result.breakEvenRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Contribution Margin</p>
                                    <p className={cn("text-xl font-black", result.contributionMargin > 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {formatCurrency(result.contributionMargin)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Margin Ratio</p>
                                    <p className="text-xl font-black text-white">{result.contributionMarginRatio.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
