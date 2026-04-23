'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { History, Activity, Zap, RotateCcw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TimelineEvent {
    id: string;
    type: 'MODE_CHANGE' | 'ACTION_EXECUTED' | 'ACTION_REVERTED';
    title: string;
    timestamp: string | Date;
    explanation: {
        primaryDriver: string;
        contributingFactors: string[];
        impact?: { runwayBefore: number, runwayAfter: number };
    };
}

interface DecisionTimelineProps {
    events: TimelineEvent[];
}

export function DecisionTimeline({ events }: DecisionTimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="p-8 rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600 text-xs font-bold gap-3">
                <History className="w-5 h-5 opacity-50" />
                No decision history available.
            </div>
        );
    }

    return (
        <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[1px] before:bg-white/5">
            {events.map((event, i) => {
                const isModeChange = event.type === 'MODE_CHANGE';
                const isReverted = event.type === 'ACTION_REVERTED';
                const impact = event.explanation.impact;
                const impactValue = impact ? impact.runwayAfter - impact.runwayBefore : 0;

                return (
                    <motion.div 
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                    >
                        {/* Timeline Node */}
                        <div className={cn(
                            "absolute -left-[23px] top-1 w-6 h-6 rounded-full border-4 border-[#020617] flex items-center justify-center z-10",
                            isModeChange ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" :
                            isReverted ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" :
                            "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        )}>
                            {isModeChange ? <Activity className="w-2.5 h-2.5 text-black" /> :
                             isReverted ? <RotateCcw className="w-2.5 h-2.5 text-black" /> :
                             <Zap className="w-2.5 h-2.5 text-black" />}
                        </div>

                        {/* Content Card */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">{event.title}</h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 italic">What & Why</p>
                                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                        {event.explanation.primaryDriver}
                                    </p>
                                </div>

                                {event.explanation.contributingFactors.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {event.explanation.contributingFactors.map((factor, idx) => (
                                            <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                                {factor}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {impact && (
                                    <div className="pt-3 border-t border-white/5 flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Impact</p>
                                            <div className="flex items-center gap-1.5">
                                                {impactValue > 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : 
                                                 impactValue < 0 ? <TrendingDown className="w-3 h-3 text-rose-400" /> : 
                                                 <Activity className="w-3 h-3 text-slate-500" />}
                                                <span className={cn(
                                                    "text-xs font-black",
                                                    impactValue > 0 ? "text-emerald-400" : impactValue < 0 ? "text-rose-400" : "text-slate-400"
                                                )}>
                                                    {impactValue > 0 ? '+' : ''}{impactValue.toFixed(1)}m <span className="opacity-50 font-medium tracking-tighter">Runway Shift</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Final State</p>
                                            <p className="text-xs font-black text-white">{impact.runwayAfter.toFixed(1)}m</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
