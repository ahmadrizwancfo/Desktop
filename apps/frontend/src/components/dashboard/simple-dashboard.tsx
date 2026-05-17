'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    Clock, 
    BrainCircuit, 
    ArrowUpRight, 
    ArrowDownRight, 
    Target,
    Zap,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState, formatCurrency, formatRunway } from '@/store/cfo-state-store';

interface SimpleDashboardProps {
    state: CFOState;
}

export function SimpleDashboard({ state }: SimpleDashboardProps) {
    const { summary, delta, narrative, decisionEngine } = state;
    
    // Rename terms as requested
    const labels = {
        runway: "How long your money will last",
        burn: "Monthly spending",
        exhaustion: (days: number) => `Your money will last ${days} days at current spending`,
        healthScore: "Financial Health Score",
        macroBurn: "Total Monthly Expenses"
    };

    const runwayMonths = summary.runwayMonths;
    const runwayDays = Math.round(runwayMonths * 30.4);
    
    const moneyIn = summary.monthlyRevenue;
    const moneyOut = summary.monthlyExpenses;
    const profitLoss = moneyIn - moneyOut;
    const isProfitable = profitLoss >= 0;

    // AI Insight logic - get the "One Thing" or a top recommendation
    const topInsight = decisionEngine?.dailyFocus?.oneThing || decisionEngine?.decisions[0];

    return (
        <div className="flex flex-col gap-10">
            {/* 1. Quick Summary Card (The "Everything is okay" view) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <SummaryCard 
                    label="Money In This Month" 
                    value={formatCurrency(moneyIn)} 
                    subValue={`${delta.prevRevenue ? (moneyIn >= delta.prevRevenue ? '↑' : '↓') : ''} vs last month`}
                    icon={TrendingUp}
                    color="text-emerald-400"
                />
                <SummaryCard 
                    label="Money Out This Month" 
                    value={formatCurrency(moneyOut)} 
                    subValue={`${delta.prevNetBurn ? (summary.netBurn <= delta.prevNetBurn ? '↓' : '↑') : ''} vs last month`}
                    icon={TrendingDown}
                    color="text-rose-400"
                />
                <SummaryCard 
                    label={isProfitable ? "Profit This Month" : "Loss This Month"} 
                    value={formatCurrency(Math.abs(profitLoss))} 
                    subValue={isProfitable ? "You are earning more than you spend" : "You are spending more than you earn"}
                    icon={isProfitable ? ShieldCheck : Wallet}
                    color={isProfitable ? "text-emerald-400" : "text-amber-400"}
                    insight={!isProfitable ? "At this rate, your savings will reduce." : "Your savings are growing."}
                />
            </motion.div>

            {/* 2. AI Insight Box (Very Prominent) */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative group"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-indigo-500/30 to-primary/30 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                
                <div className="relative bg-[#0a0f1e]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 overflow-hidden backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                            <BrainCircuit className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-primary font-black uppercase tracking-[0.2em] text-xs">CFO Smart Advice</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
                                {topInsight?.title || "Everything looks stable for now"}
                            </h2>
                            <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed italic mb-8">
                                "{topInsight?.rationale || narrative?.summary || "Keep maintaining your current spending patterns to ensure long-term stability."}"
                            </p>
                            
                            {topInsight && (
                                <button className="group flex items-center gap-4 px-8 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white transition-all shadow-lg shadow-primary/20">
                                    <Target className="w-4 h-4" />
                                    Take Action Now
                                    <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )}
                        </div>
                        
                        <div className="hidden lg:block w-px h-40 bg-white/5" />
                        
                        <div className="flex flex-col gap-6 min-w-[240px]">
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Impact if done</span>
                                <div className="text-2xl font-black text-emerald-400">
                                    +{topInsight?.impactRunwayDays || 45} Days More Runway
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Urgency</span>
                                <div className={cn(
                                    "text-2xl font-black uppercase",
                                    topInsight?.urgency === 'critical' ? "text-rose-500" : "text-amber-400"
                                )}>
                                    {topInsight?.urgency || 'Normal'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* 3. Simple Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SimpleMetricCard 
                    label={labels.runway}
                    value={runwayMonths > 36 ? "Safe for now" : `${runwayMonths.toFixed(1)} Months`}
                    subValue={runwayMonths <= 3 ? labels.exhaustion(runwayDays) : "Your finances are healthy"}
                    icon={Clock}
                    trend={runwayMonths > 6 ? 'good' : 'warning'}
                />
                <SimpleMetricCard 
                    label={labels.burn}
                    value={formatCurrency(summary.netBurn)}
                    subValue={delta.burnChangePercent && delta.burnChangePercent < 0 ? "Spending is decreasing" : "Spending is increasing"}
                    icon={TrendingDown}
                    trend={summary.netBurn <= 0 ? 'good' : 'neutral'}
                />
                <SimpleMetricCard 
                    label={labels.healthScore}
                    value={`${state.behavioralAudit?.behaviorScore || 85}/100`}
                    subValue="Based on your financial discipline"
                    icon={ShieldCheck}
                    trend={ (state.behavioralAudit?.behaviorScore || 85) > 80 ? 'good' : 'warning'}
                />
                <SimpleMetricCard 
                    label={labels.macroBurn}
                    value={formatCurrency(summary.monthlyExpenses)}
                    subValue="Everything you spent this month"
                    icon={Wallet}
                    trend="neutral"
                />
            </div>
        </div>
    );
}

function SummaryCard({ label, value, subValue, icon: Icon, color, insight }: any) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col gap-4 relative overflow-hidden group hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl">
                    <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className={cn("text-4xl font-black tracking-tighter", color)}>
                {value}
            </div>
            <div className="text-xs font-medium text-slate-400">
                {subValue}
                {insight && <div className="mt-2 text-slate-300 font-bold">{insight}</div>}
            </div>
        </div>
    );
}

function SimpleMetricCard({ label, value, subValue, icon: Icon, trend }: any) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-white/5 rounded-xl">
                    <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    trend === 'good' ? "bg-emerald-500" : trend === 'warning' ? "bg-rose-500" : "bg-slate-500"
                )} />
            </div>
            <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</span>
                <div className="text-2xl font-black text-white">{value}</div>
            </div>
            <p className="text-[10px] font-medium text-slate-400 leading-tight">
                {subValue}
            </p>
        </div>
    );
}
