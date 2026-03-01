'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, Calendar, AlertTriangle, RefreshCcw, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RunwaySimulatorProps {
    currentCash?: number;
    currentBurn?: number;
    currentRevenue?: number;
}

export function RunwaySimulator({
    currentCash = 1200000,
    currentBurn = 150000,
    currentRevenue = 80000
}: RunwaySimulatorProps) {

    // Simulation State
    const [engineers, setEngineers] = useState(0);
    const [sales, setSales] = useState(0);
    const [revenueGrowth, setRevenueGrowth] = useState(5); // % MoM
    const [salaryStats] = useState({
        engineer: 120000, // Monthly CTC approx
        sales: 80000
    });

    // Real-time Calculations
    const simulation = useMemo(() => {
        const addedMonthlyBurn = (engineers * salaryStats.engineer) + (sales * salaryStats.sales);
        const totalBurnStart = currentBurn + addedMonthlyBurn;

        let cash = currentCash;
        let months = 0;
        let revenue = currentRevenue;
        const history = [];

        // Project for 24 months or until cash runs out
        while (cash > 0 && months < 36) {
            history.push({ month: months, cash, revenue, burn: totalBurnStart }); // Simplified burn for now

            // Monthly adjustments
            const netBurn = totalBurnStart - revenue;
            cash -= netBurn;
            revenue = revenue * (1 + (revenueGrowth / 100)); // Compounding MoM growth
            months++;
        }

        return {
            runway: months,
            newBurn: totalBurnStart,
            survivalDate: new Date(new Date().setMonth(new Date().getMonth() + months)),
            history
        };
    }, [engineers, sales, revenueGrowth, currentCash, currentBurn, currentRevenue, salaryStats]);

    const impactColor = simulation.runway < 6 ? "text-rose-500" : simulation.runway < 12 ? "text-amber-500" : "text-emerald-500";
    const impactBg = simulation.runway < 6 ? "bg-rose-500" : simulation.runway < 12 ? "bg-amber-500" : "bg-emerald-500";

    return (
        <section className="p-8 rounded-3xl bg-[#0f172a] border border-white/5 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <RefreshCcw className="w-6 h-6 text-primary" />
                        Runway Simulator
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Simulate hiring and growth scenarios to see their impact on your survival.</p>
                </div>
                <div className="text-right">
                    <button
                        onClick={() => {
                            setEngineers(0);
                            setSales(0);
                            setRevenueGrowth(5);
                        }}
                        className="mb-2 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Reset to Current
                    </button>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Projected Runway</div>
                    <motion.div
                        key={simulation.runway}
                        initial={{ scale: 1.5, color: "#fff" }}
                        animate={{ scale: 1, color: "var(--impact-color)" }}
                        className={cn("text-5xl font-black", impactColor)}
                        style={{ "--impact-color": impactColor } as any}
                    >
                        {simulation.runway} <span className="text-xl font-medium text-slate-500">Mo</span>
                    </motion.div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">

                {/* Controls Area */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Hiring Sliders */}
                    <div className="space-y-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> New Hires
                        </h3>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-slate-300">Engineers (₹1.2L/mo)</label>
                                <span className="font-bold text-white">{engineers}</span>
                            </div>
                            <input
                                type="range" min="0" max="10" step="1"
                                value={engineers} onChange={(e) => setEngineers(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-slate-300">Sales (₹80k/mo)</label>
                                <span className="font-bold text-white">{sales}</span>
                            </div>
                            <input
                                type="range" min="0" max="10" step="1"
                                value={sales} onChange={(e) => setSales(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Growth Sliders */}
                    <div className="space-y-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue
                        </h3>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-slate-300">MoM Growth Rate</label>
                                <span className="font-bold text-emerald-400">{revenueGrowth}%</span>
                            </div>
                            <input
                                type="range" min="-10" max="50" step="1"
                                value={revenueGrowth} onChange={(e) => setRevenueGrowth(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Impact Summary */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-slate-400">Addt'l Burn:</span>
                            <span className="font-bold text-rose-400">+{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format((engineers * salaryStats.engineer) + (sales * salaryStats.sales))}/mo</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Survival Until:</span>
                            <span className={cn("font-bold", impactColor)}>
                                {simulation.survivalDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Visualization Area */}
                <div className="lg:col-span-8 bg-[#000]/20 rounded-2xl p-6 border border-white/5 flex flex-col justify-end relative min-h-[400px]">
                    <div className="absolute top-6 left-6 text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Cash Balance Projection
                    </div>

                    {/* Interactive Chart */}
                    <div className="flex items-end justify-between gap-1 w-full h-[300px] relative z-10">
                        {simulation.history.map((point, i) => {
                            // Normalize height
                            const height = Math.min((point.cash / currentCash) * 100, 100);
                            const isDanger = point.cash < (currentCash * 0.2); // Low cash warning

                            // Only show every 2nd or 3rd bar label to fit
                            const showLabel = i % 3 === 0;

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(height, 0)}%` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="flex-1 bg-gradient-to-t from-primary/20 to-primary/60 rounded-t-sm relative group"
                                >
                                    {isDanger && (
                                        <div className="absolute bottom-0 w-full h-full bg-rose-500/20 blur-sm" />
                                    )}

                                    {/* Tooltip */}
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none border border-white/10">
                                        <div className="font-bold text-xs">{new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'INR' }).format(point.cash)}</div>
                                        <div className="text-slate-400">Month {point.month}</div>
                                    </div>

                                    {showLabel && (
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                                            M{point.month}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}

                        {/* Threshold Line (Zero Cash) */}
                        <div className="absolute bottom-0 w-full h-[1px] bg-rose-500" />

                        {/* 6 Month Warning Line (Approximation based on current burn) */}
                        <div className="absolute bottom-[20%] w-full h-[1px] border-t border-slate-700 border-dashed flex items-center">
                            <span className="text-[10px] text-slate-600 bg-[#0f172a] px-1 ml-2">Danger Zone</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background glow based on health */}
            <div className={cn("absolute -top-[20%] -right-[10%] w-[500px] h-[500px] blur-[150px] opacity-20 transition-colors duration-500 pointer-events-none", impactBg)} />
        </section>
    );
}
