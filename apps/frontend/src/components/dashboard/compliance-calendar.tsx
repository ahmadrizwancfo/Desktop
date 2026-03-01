'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ChevronRight,
    FileText,
    Building2,
    Receipt,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceItem {
    date: number;
    type: string;
    title: string;
    description: string;
}

interface CalendarMonth {
    month: string;
    deadlines: ComplianceItem[];
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    GST: { icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    TDS: { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    PF_ESI: { icon: Building2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    ADVANCE_TAX: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    ROC: { icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
};

export function ComplianceCalendar() {
    const [selectedMonth, setSelectedMonth] = useState(0);

    const { data, isLoading } = useQuery({
        queryKey: ['compliance-calendar'],
        queryFn: async () => {
            const res = await apiClient.get('/compliance/calendar?months=6');
            return res.data.calendar as CalendarMonth[];
        },
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const calendar = data || [];
    const currentMonth = calendar[selectedMonth];

    return (
        <div className="glass-card rounded-3xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Compliance Calendar</h3>
                        <p className="text-xs text-slate-500">Upcoming deadlines</p>
                    </div>
                </div>
            </div>

            {/* Month Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {calendar.map((month, i) => (
                    <button
                        key={i}
                        onClick={() => setSelectedMonth(i)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                            selectedMonth === i
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                        )}
                    >
                        {month.month}
                    </button>
                ))}
            </div>

            {/* Deadlines List */}
            <div className="space-y-3">
                <AnimatePresence mode="wait">
                    {currentMonth?.deadlines.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-8 text-slate-500"
                        >
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                            <p className="text-sm">No deadlines this month!</p>
                        </motion.div>
                    ) : (
                        currentMonth?.deadlines.map((deadline, i) => {
                            const config = typeConfig[deadline.type] || typeConfig.GST;
                            const Icon = config.icon;
                            const today = new Date().getDate();
                            const isPast = selectedMonth === 0 && deadline.date < today;
                            const isUrgent = selectedMonth === 0 && deadline.date - today <= 3 && !isPast;

                            return (
                                <motion.div
                                    key={`${deadline.type}-${deadline.date}-${i}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                                        isPast
                                            ? "bg-slate-800/50 border-slate-700/50 opacity-50"
                                            : isUrgent
                                                ? "bg-rose-500/10 border-rose-500/30 animate-pulse-subtle"
                                                : config.bg
                                    )}
                                >
                                    {/* Date Badge */}
                                    <div className={cn(
                                        "flex flex-col items-center justify-center w-14 h-14 rounded-xl",
                                        isPast ? "bg-slate-700/50" : "bg-white/5"
                                    )}>
                                        <span className={cn(
                                            "text-2xl font-bold",
                                            isPast ? "text-slate-500" : isUrgent ? "text-rose-400" : "text-white"
                                        )}>
                                            {deadline.date}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                            {currentMonth?.month.split(' ')[0].slice(0, 3)}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Icon className={cn("w-4 h-4", isPast ? "text-slate-500" : config.color)} />
                                            <span className={cn(
                                                "text-xs font-bold uppercase tracking-wider",
                                                isPast ? "text-slate-500" : config.color
                                            )}>
                                                {deadline.type.replace('_', '/')}
                                            </span>
                                            {isUrgent && (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                                    URGENT
                                                </span>
                                            )}
                                            {isPast && (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-[10px] font-bold">
                                                    PASSED
                                                </span>
                                            )}
                                        </div>
                                        <h4 className={cn(
                                            "font-semibold mt-1",
                                            isPast ? "text-slate-400" : "text-white"
                                        )}>
                                            {deadline.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {deadline.description}
                                        </p>
                                    </div>

                                    {/* Action */}
                                    {!isPast && (
                                        <button className={cn(
                                            "p-2 rounded-xl transition-colors",
                                            "hover:bg-white/10"
                                        )}>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/5">
                {Object.entries(typeConfig).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                        <div key={type} className="flex items-center gap-2">
                            <Icon className={cn("w-3 h-3", config.color)} />
                            <span className="text-xs text-slate-500">{type.replace('_', '/')}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
