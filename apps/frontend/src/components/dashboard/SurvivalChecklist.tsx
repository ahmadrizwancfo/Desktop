'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldAlert, Zap, ArrowRight, DollarSign, HandHelping } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurvivalChecklistProps {
    className?: string;
}

export function SurvivalChecklist({ className }: SurvivalChecklistProps) {
    const tasks = [
        { 
            title: 'Cut Non-Essential SaaS', 
            description: 'Audit all auto-renewals. If it doesn’t drive revenue or core ops, kill it.', 
            icon: Zap,
            impact: '+4 days runway'
        },
        { 
            title: 'Pause All Hiring', 
            description: 'Even if replacement. Every new salary is a runway drain.', 
            icon: ShieldAlert,
            impact: 'Protect current team'
        },
        { 
            title: 'Collect Receivables', 
            description: 'Call every client with an invoice > 7 days old. Cash in hand > revenue booked.', 
            icon: DollarSign,
            impact: 'Immediate liquidity'
        }
    ];

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <HandHelping className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">Survival Checklist</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">High-conviction actions to protect your runway</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tasks.map((task, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                            <task.icon className="w-12 h-12 text-indigo-400" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                                {task.title}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4">
                                {task.description}
                            </p>
                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none bg-indigo-400/10 px-2 py-1 rounded-md">
                                    {task.impact}
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
