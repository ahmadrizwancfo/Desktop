'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ChevronLeft,
    ChevronRight,
    Receipt,
    Building2,
    FileText,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceEvent {
    id: string;
    date: Date;
    type: 'GST' | 'TDS' | 'ROC' | 'ADVANCE_TAX' | 'PF' | 'ESIC';
    title: string;
    description: string;
    status: 'pending' | 'upcoming' | 'completed' | 'overdue';
}

// Generate compliance deadlines for current month
const generateComplianceEvents = (): ComplianceEvent[] => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return [
        {
            id: 'gstr1',
            date: new Date(year, month, 11),
            type: 'GST',
            title: 'GSTR-1 Filing',
            description: 'Monthly outward supplies return',
            status: now.getDate() > 11 ? 'completed' : 'upcoming'
        },
        {
            id: 'gstr3b',
            date: new Date(year, month, 20),
            type: 'GST',
            title: 'GSTR-3B Filing',
            description: 'Monthly summary return with payment',
            status: now.getDate() > 20 ? 'completed' : 'upcoming'
        },
        {
            id: 'tds',
            date: new Date(year, month, 7),
            type: 'TDS',
            title: 'TDS Deposit',
            description: 'Monthly TDS payment for previous month',
            status: now.getDate() > 7 ? 'completed' : 'upcoming'
        },
        {
            id: 'pf',
            date: new Date(year, month, 15),
            type: 'PF',
            title: 'PF Deposit',
            description: 'Monthly EPF contribution',
            status: now.getDate() > 15 ? 'completed' : 'upcoming'
        },
        {
            id: 'esic',
            date: new Date(year, month, 15),
            type: 'ESIC',
            title: 'ESIC Deposit',
            description: 'Monthly ESIC contribution',
            status: now.getDate() > 15 ? 'completed' : 'upcoming'
        },
        // Quarterly events
        ...(month % 3 === 2 ? [{
            id: 'advance-tax',
            date: new Date(year, month, 15),
            type: 'ADVANCE_TAX' as const,
            title: 'Advance Tax',
            description: 'Quarterly advance tax installment',
            status: (now.getDate() > 15 ? 'completed' : 'upcoming') as 'pending' | 'upcoming' | 'completed' | 'overdue'
        }] : []),
    ];
};

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    GST: { icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    TDS: { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ROC: { icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ADVANCE_TAX: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    PF: { icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ESIC: { icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

const statusConfig = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending' },
    upcoming: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Upcoming' },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Done' },
    overdue: { color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Overdue' },
};

export function AutoComplianceTimeline() {
    const [selectedEvent, setSelectedEvent] = useState<ComplianceEvent | null>(null);
    const events = generateComplianceEvents();

    // Calculate next upcoming event
    const now = new Date();
    const upcomingEvents = events
        .filter(e => e.status === 'upcoming' && e.date >= now)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const nextEvent = upcomingEvents[0];
    const daysUntilNext = nextEvent
        ? Math.ceil((nextEvent.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="glass-card rounded-3xl overflow-hidden">
            {/* Header with Next Risk Warning */}
            <div className="p-6 border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Compliance Timeline
                    </h3>
                    {daysUntilNext !== null && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2",
                                daysUntilNext <= 3 ? "bg-rose-500/20 text-rose-400" :
                                    daysUntilNext <= 7 ? "bg-amber-500/20 text-amber-400" :
                                        "bg-blue-500/20 text-blue-400"
                            )}
                        >
                            <Zap className="w-3 h-3" />
                            Next risk in {daysUntilNext} day{daysUntilNext !== 1 ? 's' : ''}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="p-6">
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />

                    {/* Events */}
                    <div className="space-y-4">
                        {events.map((event, index) => {
                            const config = typeConfig[event.type];
                            const status = statusConfig[event.status];
                            const Icon = config.icon;
                            const isSelected = selectedEvent?.id === event.id;

                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => setSelectedEvent(isSelected ? null : event)}
                                    className={cn(
                                        "relative pl-14 cursor-pointer group",
                                    )}
                                >
                                    {/* Timeline dot */}
                                    <div className={cn(
                                        "absolute left-4 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all",
                                        event.status === 'completed'
                                            ? "bg-emerald-500 border-emerald-500"
                                            : event.status === 'overdue'
                                                ? "bg-rose-500 border-rose-500"
                                                : "bg-slate-800 border-white/20 group-hover:border-primary"
                                    )}>
                                        {event.status === 'completed' && (
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        )}
                                    </div>

                                    {/* Event card */}
                                    <div className={cn(
                                        "p-4 rounded-2xl border transition-all",
                                        isSelected
                                            ? "bg-white/10 border-primary/30"
                                            : "bg-white/5 border-white/5 hover:bg-white/10"
                                    )}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl", config.bg)}>
                                                    <Icon className={cn("w-4 h-4", config.color)} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                                                    <p className="text-xs text-slate-500">
                                                        {event.date.toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-1 rounded uppercase",
                                                status.bg, status.color
                                            )}>
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Expanded details */}
                                        <AnimatePresence>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 mt-4 border-t border-white/10">
                                                        <p className="text-xs text-slate-400 mb-3">
                                                            {event.description}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-indigo-600 transition-colors">
                                                                Mark Complete
                                                            </button>
                                                            <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors">
                                                                Set Reminder
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
