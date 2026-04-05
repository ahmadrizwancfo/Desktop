'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    Zap, 
    ArrowRight, 
    PlayCircle, 
    DollarSign, 
    TrendingUp, 
    LineChart, 
    Calculator,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" as any }
    },
};

export function HeroSection() {
    return (
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-28 pb-12 overflow-hidden">
            {/* Core Content Container */}
            <div className="w-full flex flex-col items-center z-20">
                {/* Mid Layer: Floating AI Chips */}
                <div className="hidden lg:block absolute inset-0 pointer-events-none z-10 max-w-[1600px] mx-auto">
                    <FloatingChip icon={DollarSign} text="Runway +2.4 Mo" color="emerald" top="10%" left="12%" delay={0.2} />
                    <FloatingChip icon={TrendingUp} text="Burn Optimized" color="indigo" top="42%" right="10%" delay={0.3} flicker />
                    <FloatingChip icon={LineChart} text="Q3 Projection" color="violet" bottom="30%" left="15%" delay={0.4} />
                    <FloatingChip icon={Calculator} text="Tax Ready" color="teal" top="15%" right="18%" delay={0.5} />
                </div>

                {/* Foreground Layer: Content */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-7xl mx-auto text-center relative z-20 w-full px-6"
                >
                    {/* Badge */}
                    <motion.div 
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 hover:bg-white/[0.05] transition-colors cursor-default backdrop-blur-md relative overflow-hidden group"
                    >
                        <Zap className="w-3 h-3 fill-primary" />
                        <span>Trusted by 100+ Early Stage Teams</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1 
                        variants={itemVariants}
                        className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-4 text-editorial leading-[1.0] text-white"
                    >
                        Your AI CFO <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
                            for Runway, Burn & Decisions
                        </span>
                    </motion.h1>

                    {/* Subheadline & Supporting Lines */}
                    <motion.div variants={itemVariants} className="mb-8 relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-3">
                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium">
                            See your runway, control burn, and know exactly what to do next — instantly.
                        </p>
                        <p className="text-sm md:text-base text-slate-500 font-medium">
                            Built on your real financial data — not generic AI answers.
                        </p>
                        <p className="text-[11px] md:text-xs text-slate-500/60 italic font-light max-w-lg mx-auto leading-relaxed">
                            "Most startups don’t fail because of bad ideas — they run out of cash without realizing it."
                        </p>
                    </motion.div>

                    {/* CTAs */}
                    <div className="flex flex-col items-center justify-center w-full mb-12">
                        {/* Button Row */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full mb-6">
                            {/* Primary Button */}
                            <div className="relative group/btn w-full sm:w-auto">
                                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-lg opacity-40 group-hover/btn:opacity-70 transition duration-500" />
                                <Link
                                    href="/register"
                                    className="relative flex items-center justify-center gap-3 px-10 h-[60px] rounded-xl bg-gradient-to-b from-violet-600 to-blue-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto overflow-hidden group/link"
                                >
                                    <span className="text-lg tracking-wide whitespace-nowrap relative z-10">See My Runway Now →</span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/link:translate-x-full transition-transform duration-1000" />
                                </Link>
                            </div>

                            {/* Secondary Button */}
                            <Link
                                href="#demo"
                                className="group px-8 h-[60px] rounded-xl bg-[#0f172a]/40 border border-white/10 text-white font-semibold hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all flex items-center gap-2 w-full sm:w-auto justify-center backdrop-blur-md"
                            >
                                <PlayCircle className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                                See How It Works
                            </Link>
                        </div>

                        {/* Centered Microcopy */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="text-[10px] text-slate-500/60 font-bold tracking-[0.15em] uppercase whitespace-nowrap"
                        >
                            No setup required • Works with CSV, Zoho, QuickBooks
                        </motion.div>
                    </div>

                    {/* Ticks Row (Feature Validation) */}
                    <motion.div 
                        variants={itemVariants}
                        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-8 opacity-60 hover:opacity-100 transition-opacity duration-500"
                    >
                        <FeatureTick text="Runway in real-time" />
                        <FeatureTick text="Burn & cost insights" />
                        <FeatureTick text="Hiring & fundraising decisions" />
                        <FeatureTick text="Weekly CFO reports" />
                    </motion.div>

                    {/* Positioning & Loop Signal */}
                    <motion.div variants={itemVariants} className="flex flex-col gap-2 relative z-10">
                        <p className="text-sm text-slate-400 font-medium">
                            Built for founders and startups who need a CFO but don’t have one.
                        </p>
                        <p className="text-xs text-primary/80 font-semibold tracking-wide uppercase">
                            Get a weekly AI CFO brief — what changed, what matters, what to do next.
                        </p>
                    </motion.div>
                </motion.div>
            </div>

            {/* Continuous System Glow Trail */}
            <motion.div 
                animate={{ 
                    y: [0, 8, 0],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
            >
                <div className="w-[1px] h-12 bg-gradient-to-b from-primary/60 to-transparent" />
            </motion.div>
        </section>
    );
}

function FeatureTick({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 group/tick cursor-default">
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/tick:border-emerald-500/40 transition-colors">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            </div>
            <span className="text-[11px] md:text-xs font-medium tracking-tight text-slate-300">{text}</span>
        </div>
    );
}

function FloatingChip({ icon: Icon, text, color, top, left, right, bottom, delay, flicker }: any) {
    const colorClasses: any = {
        emerald: "bg-[#060b1e]/60 text-emerald-300 border-emerald-500/20",
        indigo: "bg-[#060b1e]/60 text-indigo-300 border-indigo-500/20",
        violet: "bg-[#060b1e]/60 text-violet-300 border-violet-500/20",
        teal: "bg-[#060b1e]/60 text-teal-300 border-teal-500/20",
    };

    const dotColorClasses: any = {
        emerald: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]",
        indigo: "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)]",
        violet: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]",
        teal: "bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.9)]",
    };

    // Random drift offsets
    const driftX = Math.sin(delay * 10) * 15;
    const driftY = Math.cos(delay * 10) * 15;
    const duration = 8 + (delay * 4);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
            className="absolute z-20"
            style={{ top, left, right, bottom }}
        >
            <motion.div
                animate={{ 
                    x: [-driftX, driftX, -driftX],
                    y: [-driftY, driftY, -driftY],
                    opacity: [0.85, 1, 0.85]
                }}
                transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                    "px-4 py-2.5 rounded-2xl border backdrop-blur-xl flex items-center gap-2.5 text-[11px] font-black group cursor-default transition-all duration-300 hover:scale-[1.05] hover:border-white/20 relative overflow-hidden",
                    colorClasses[color]
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30 pointer-events-none" />
                
                {flicker && (
                    <motion.div 
                        animate={{ opacity: [1, 0.4, 1, 0.7, 1] }} 
                        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 5 }}
                        className={cn("w-1.5 h-1.5 rounded-full relative z-10", dotColorClasses[color])} 
                    />
                )}
                {!flicker && <div className={cn("w-1.5 h-1.5 rounded-full relative z-10", dotColorClasses[color])} />}
                
                <Icon className={cn("w-3.5 h-3.5 relative z-10 transition-transform duration-300 group-hover:scale-110")} />
                <span className="uppercase tracking-[0.15em] relative z-10">{text}</span>
            </motion.div>
        </motion.div>
    );
}
