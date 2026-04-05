'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { BrainCircuit, ShieldCheck, BarChart3, Wallet, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FeatureShowcase() {
    const [activeTab, setActiveTab] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const features = [
        {
            id: 'runway',
            title: 'Real-time runway tracking',
            outcome: "Know exactly when you run out of cash — updated continuously.",
            icon: BrainCircuit,
            color: 'bg-primary',
            data: {
              header: "AI CFO Live Analysis",
              value: 7.4,
              unit: "months",
              subtext: "Your runway is 7.4 months",
              tag: "Confidence: High",
              insight: "Reduce cloud spend by 12% to reach 8-month target",
              signal: "RUNWAY HEALTHY",
              signalColor: "text-emerald-400"
            }
        },
        {
            id: 'burn',
            title: 'Burn monitoring',
            outcome: "Catch overspending before it becomes a problem.",
            icon: BarChart3,
            color: 'bg-indigo-500',
            data: {
              header: "AI CFO Anomaly Detected",
              value: 12,
              unit: "% ↑",
              subtext: "Burn increased 12% this month",
              tag: "Burn Alert",
              insight: "Consider reducing marketing spend by 15% to protect runway",
              signal: "BURN ALERT",
              signalColor: "text-rose-400"
            }
        },
        {
            id: 'forecasting',
            title: 'Cash flow forecasting',
            outcome: "See future scenarios before making decisions.",
            icon: Wallet,
            color: 'bg-amber-500',
            data: {
              header: "AI CFO Projection Mode",
              value: "Q4 '26",
              unit: "Target",
              subtext: "Break-even expected",
              tag: "Projection Mode",
              insight: "High growth hiring + Q3 marketing push required",
              signal: "TAX READY",
              signalColor: "text-amber-400"
            }
        },
        {
            id: 'compliance',
            title: 'Compliance visibility',
            outcome: "Stay audit-ready without thinking about it.",
            icon: ShieldCheck,
            color: 'bg-emerald-500',
            data: {
              header: "AI CFO Audit Ready",
              value: 100,
              unit: "%",
              subtext: "Fully compliant",
              tag: "System Secure",
              insight: "Next TDS filing due in 12 days. Data reconciled.",
              signal: "SYSTEM SECURE",
              signalColor: "text-emerald-400"
            }
        }
    ];

    // Auto-rotation logic
    useEffect(() => {
        if (isAutoPlaying) {
            timerRef.current = setInterval(() => {
                setActiveTab((prev) => (prev + 1) % features.length);
            }, 5000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isAutoPlaying, features.length]);

    const handleTabHover = (index: number) => {
        setIsAutoPlaying(false);
        setActiveTab(index);
    };

    const handleTabLeave = () => {
        setIsAutoPlaying(true);
    };

    return (
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative">
            <div className="text-center mb-16 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-black mb-4 editorial tracking-tight">Built for Financial Clarity & Control</h2>
                <p className="text-slate-500/80 text-sm font-medium tracking-[0.2em] uppercase mb-6 flex items-center justify-center gap-3">
                    <span className="w-8 h-px bg-white/5" />
                    This isn’t a dashboard. It’s a decision engine.
                    <span className="w-8 h-px bg-white/5" />
                </p>
                <p className="text-lg text-slate-400 font-light italic">
                    One intelligent operating system for your entire finance stack.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                {/* Left: Outcome-Driven Tabs */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {features.map((feature, idx) => (
                        <button
                            key={feature.id}
                            onMouseEnter={() => handleTabHover(idx)}
                            onMouseLeave={handleTabLeave}
                            onClick={() => setActiveTab(idx)}
                            className={cn(
                                "group text-left p-6 rounded-3xl transition-all duration-500 border relative overflow-hidden",
                                activeTab === idx
                                    ? "bg-white/[0.04] border-white/10 shadow-2xl scale-[1.02]"
                                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                            )}
                        >
                            {/* Selection Glow */}
                            {activeTab === idx && (
                                <motion.div 
                                    layoutId="tabGlow"
                                    className="absolute inset-0 bg-primary/5 blur-2xl -z-10" 
                                />
                            )}

                            <div className="flex items-center gap-4 mb-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                    activeTab === idx ? feature.color : "bg-white/10 group-hover:bg-white/20"
                                )}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className={cn("text-xl font-bold tracking-tight", activeTab === idx ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>
                                    {feature.title}
                                </h3>
                            </div>
                            <p className={cn("text-sm leading-relaxed pl-14 font-medium", activeTab === idx ? "text-slate-300" : "text-slate-500")}>
                                {feature.outcome}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Right: Live Intelligence Panel */}
                <div className="lg:col-span-7 relative h-[580px]">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.02, y: -10 }}
                            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                            className="relative h-full w-full rounded-[2.5rem] border border-white/10 bg-[#060b1e]/60 backdrop-blur-3xl shadow-[0_0_100px_-20px_rgba(0,0,0,1)] overflow-hidden p-10 flex flex-col group"
                        >
                            {/* Internal Gradient Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                            {/* Live Header */}
                            <div className="flex items-center justify-between mb-12 relative z-10">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                        {features[activeTab].data.header}
                                    </span>
                                </div>
                                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/40 tracking-[0.2em] flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-primary fill-primary" />
                                    LIVE DATA STREAM
                                </div>
                            </div>

                            {/* Metric Display */}
                            <div className="mb-10 relative z-10">
                                <div className="flex items-baseline gap-4 mb-2">
                                    <AnimatedMetric value={features[activeTab].data.value} />
                                    <span className="text-2xl font-medium text-slate-400">{features[activeTab].data.unit}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-sm font-bold tracking-tight",
                                            activeTab === 1 ? "text-rose-400" : "text-emerald-400"
                                        )}>
                                            {features[activeTab].data.subtext}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(var(--glow-color),0.6)]",
                                            activeTab === 1 ? "bg-rose-400" : "bg-emerald-400"
                                        )} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {features[activeTab].data.tag}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Live System Chart */}
                            <div className="flex-grow flex items-end gap-2.5 px-2 mb-10 h-36 overflow-hidden bg-white/[0.02] rounded-3xl border border-white/5 p-6 relative">
                                {[35, 55, 40, 75, 50, 65, 90, 60, 80, 45, 70, 85, 55, 75].map((h, i) => (
                                    <motion.div
                                        key={`${activeTab}-${i}`}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: i * 0.04, duration: 1, ease: [0.19, 1, 0.22, 1] }}
                                        className={cn(
                                            "flex-1 rounded-t-sm relative transition-colors duration-500",
                                            activeTab === 1 && i > 10 ? "bg-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-primary/20",
                                            activeTab === 1 && i === 13 && "bg-rose-500/60"
                                        )}
                                    />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                            </div>

                            {/* Thought / Insight Area */}
                            <div className="mt-auto relative z-10">
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group/insight"
                                >
                                    <div className={cn(
                                        "absolute inset-y-0 left-0 w-1",
                                        activeTab === 1 ? "bg-rose-500/60" : "bg-primary/60"
                                    )} />
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Insight & Action</div>
                                        <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <p className="text-base text-slate-200 leading-relaxed font-light italic">
                                        "{features[activeTab].data.insight}"
                                    </p>
                                </motion.div>
                                
                                <div className="flex justify-end mt-4">
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3",
                                        features[activeTab].data.signalColor
                                    )}>
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                            {features[activeTab].data.signal}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}

function AnimatedMetric({ value }: { value: string | number }) {
    if (typeof value === 'string') {
        return <span className="text-7xl font-black text-white editorial tracking-tighter">{value}</span>;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const springValue = useSpring(0, { stiffness: 40, damping: 20 });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const displayValue = useTransform(springValue, (current) => 
        (value % 1 === 0 ? Math.floor(current) : current.toFixed(1)).toString()
    );

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        springValue.set(value);
    }, [value, springValue]);

    return (
        <motion.span className="text-7xl font-black text-white editorial tracking-tighter">
            {displayValue as any}
        </motion.span>
    );
}

