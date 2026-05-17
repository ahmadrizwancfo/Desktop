'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Calendar, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE ALERTS — Indian Tax & Filing Deadlines
// GST (GSTR-1, GSTR-3B), TDS Deposit, Advance Tax, PF/ESI, ROC
// ═══════════════════════════════════════════════════════════════════════════════

interface ComplianceDeadline {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    daysLeft: number;
    severity: 'critical' | 'warning' | 'info';
    category: 'GST' | 'TDS' | 'ADVANCE_TAX' | 'PF_ESI' | 'ROC';
}

function getUpcomingDeadlines(): ComplianceDeadline[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    const deadlines: ComplianceDeadline[] = [];

    // Helper: create deadline for current or next month
    const addMonthly = (dayOfMonth: number, title: string, desc: string, cat: ComplianceDeadline['category']) => {
        let dueDate = new Date(year, month, dayOfMonth);
        if (day > dayOfMonth) {
            dueDate = new Date(year, month + 1, dayOfMonth);
        }
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        deadlines.push({
            id: `${cat}-${dayOfMonth}`,
            title,
            description: desc,
            dueDate,
            daysLeft,
            severity: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'info',
            category: cat,
        });
    };

    // GST
    addMonthly(11, 'GSTR-1 Filing', 'Outward supplies return for previous month', 'GST');
    addMonthly(20, 'GSTR-3B Filing', 'Summary return with tax payment', 'GST');

    // TDS
    addMonthly(7, 'TDS Deposit', 'Deposit TDS deducted in previous month', 'TDS');

    // PF/ESI
    addMonthly(15, 'PF/ESI Deposit', 'Provident Fund & ESI contribution', 'PF_ESI');

    // Advance Tax (quarterly)
    const advanceTaxDates = [
        { month: 5, day: 15, pct: '15%', q: 'Q1' },
        { month: 8, day: 15, pct: '45%', q: 'Q2' },
        { month: 11, day: 15, pct: '75%', q: 'Q3' },
        { month: 2, day: 15, pct: '100%', q: 'Q4' },
    ];
    for (const at of advanceTaxDates) {
        const dueDate = new Date(year, at.month, at.day);
        if (dueDate.getTime() < now.getTime()) continue; // Skip past dates
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 45) {
            deadlines.push({
                id: `ADVANCE_TAX-${at.q}`,
                title: `Advance Tax ${at.q} (${at.pct})`,
                description: `Advance tax installment due`,
                dueDate,
                daysLeft,
                severity: daysLeft <= 5 ? 'critical' : daysLeft <= 15 ? 'warning' : 'info',
                category: 'ADVANCE_TAX',
            });
        }
    }

    return deadlines.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    GST: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    TDS: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    ADVANCE_TAX: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    PF_ESI: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    ROC: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export function ComplianceAlerts() {
    const deadlines = getUpcomingDeadlines();
    const criticalCount = deadlines.filter(d => d.severity === 'critical').length;

    if (deadlines.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0f1e]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Compliance Radar</h3>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            India — GST · TDS · PF · Advance Tax
                        </span>
                    </div>
                </div>
                {criticalCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                            {criticalCount} Due Soon
                        </span>
                    </div>
                )}
            </div>

            {/* Deadline List */}
            <div className="space-y-3">
                {deadlines.map((dl, i) => {
                    const colors = CATEGORY_COLORS[dl.category] || CATEGORY_COLORS.GST;
                    return (
                        <motion.div
                            key={dl.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01]",
                                dl.severity === 'critical' ? "bg-rose-500/5 border-rose-500/20" :
                                dl.severity === 'warning' ? "bg-amber-500/5 border-amber-500/10" :
                                "bg-white/[0.02] border-white/5"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", colors.bg, colors.text, 'border', colors.border)}>
                                    {dl.category.replace('_', '/')}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{dl.title}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{dl.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "text-right",
                                    dl.severity === 'critical' ? "text-rose-400" :
                                    dl.severity === 'warning' ? "text-amber-400" : "text-slate-400"
                                )}>
                                    <p className="text-lg font-black tabular-nums">{dl.daysLeft}d</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest">
                                        {dl.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-[9px] text-slate-600 leading-relaxed">
                    <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />
                    Dates are calculated for the current month. Always verify with your CA. Non-compliance penalties range from ₹200/day to 18% interest.
                </p>
            </div>
        </motion.div>
    );
}
