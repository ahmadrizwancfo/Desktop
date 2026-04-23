'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Command, ArrowRight, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CFOState } from '@/store/cfo-state-store';
import { useRouter } from 'next/navigation';

interface CommandBarProps {
    state: CFOState;
}

export function CommandBar({ state }: CommandBarProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const router = useRouter();

    const getSuggestions = () => {
        if (state.dashboardMode === 'CRITICAL') {
            return [
                "Which categories spiked?",
                "How to extend runway by 2 months?",
                "Identify non-essential SaaS spend"
            ];
        }
        if (state.dashboardMode === 'WARNING') {
            return [
                "Why is burn deviating?",
                "Forecast cash for next 90 days",
                "Compare burn vs last month"
            ];
        }
        return [
            "Is it safe to hire a developer?",
            "Optimize marketing ROI",
            "Project revenue for next quarter"
        ];
    };

    const handleSearch = (q: string = query) => {
        if (!q.trim()) return;
        router.push(`/ai-cfo?q=${encodeURIComponent(q)}`);
    };

    return (
        <div className="relative max-w-3xl mx-auto z-50 -mt-8">
            <motion.div
                animate={{
                    scale: isFocused ? 1.02 : 1,
                    boxShadow: isFocused ? "0 20px 40px -12px rgba(99, 102, 241, 0.2)" : "0 8px 24px -12px rgba(0,0,0,0.5)"
                }}
                className={cn(
                    "flex items-center gap-4 p-2 rounded-2xl border transition-all duration-300",
                    isFocused ? "bg-[#111624] border-primary/40" : "bg-[#0a0f1e] border-white/5"
                )}
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <BrainCircuit className={cn("w-5 h-5 transition-colors", isFocused ? "text-primary" : "text-slate-500")} />
                </div>
                
                <input
                    type="text"
                    placeholder="Ask your CFO anything... (e.g. 'Should I hire now?')"
                    className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-500 font-black">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                    </div>
                    <button 
                        onClick={() => handleSearch()}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-4 p-4 rounded-2xl bg-[#0d1222] border border-white/5 shadow-2xl"
                    >
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">
                            Suggested for your {state.dashboardMode.toLowerCase()} state
                        </div>
                        <div className="space-y-1">
                            {getSuggestions().map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleSearch(s)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 group transition-colors text-left"
                                >
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{s}</span>
                                    <Sparkles className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
