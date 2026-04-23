'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight, Play, Zap, ShieldAlert } from 'lucide-react';
import { CFOState, formatCurrency } from '@/store/cfo-state-store';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DecisionPanelProps {
    state: CFOState;
}

export function DecisionPanel({ state }: DecisionPanelProps) {
    const router = useRouter();
    const { todaysActions } = state;
    
    const handleStartTest = async (actionId: string) => {
        try {
            await apiClient.post(`/cfo-engine/actions/start-shadow`, { actionId });
            toast.success('Simulation started in Shadow Mode');
            router.refresh();
        } catch (err) {
            toast.error('Failed to start simulation');
        }
    };

    if (!todaysActions || todaysActions.length === 0) return null;

    return (
        <section className="pt-6">
            <div className="flex items-center gap-2 mb-6">
                <Target className="w-4 h-4 text-primary" />
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Critical Action Plan</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todaysActions.slice(0, 2).map((action, i) => (
                    <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group flex flex-col p-6 rounded-2xl border-2 border-white/5 bg-[#0a0f1e] hover:bg-white/[0.04] hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-sm font-black text-white tracking-tight group-hover:text-primary transition-colors leading-tight">
                                    {action.title}
                                </h3>
                                <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                    +{action.impactDays}d
                                </div>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-6 flex-1">
                                {action.description}
                            </p>

                            <Button 
                                onClick={() => handleStartTest(action.id)}
                                className="w-full h-11 rounded-xl bg-white text-black hover:bg-primary hover:text-white font-black text-xs gap-2 transition-all"
                            >
                                <Play className="w-3 h-3 fill-current" /> Execute Action Step
                            </Button>
                        </div>
                        
                        {/* Glow effect on hover */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
