'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, AlertTriangle, TrendingUp, TrendingDown,
    Monitor, Users, Megaphone, Building2, Zap, Shield, Car, Coffee
} from 'lucide-react';

interface ExpenseCategory {
    id: string;
    name: string;
    icon: React.ReactNode;
    amount: number;
    previousAmount: number;
    color: string;
    subcategories?: { name: string; amount: number; change?: number }[];
    aiInsight?: string;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
    {
        id: 'saas',
        name: 'SaaS & Tools',
        icon: <Monitor className="w-4 h-4" />,
        amount: 52000,
        previousAmount: 48000,
        color: 'bg-purple-500',
        subcategories: [
            { name: 'Figma Team', amount: 12000, change: 0 },
            { name: 'AWS', amount: 18000, change: 3000 },
            { name: 'Notion', amount: 8000, change: 0 },
            { name: 'Slack', amount: 6000, change: 0 },
            { name: 'Others', amount: 8000, change: 1000 },
        ],
        aiInsight: 'AWS costs jumped 20%. Check for unused EC2 instances.',
    },
    {
        id: 'payroll',
        name: 'Payroll',
        icon: <Users className="w-4 h-4" />,
        amount: 480000,
        previousAmount: 480000,
        color: 'bg-sky-500',
        subcategories: [
            { name: 'Salaries', amount: 420000 },
            { name: 'Benefits', amount: 35000 },
            { name: 'Contractor', amount: 25000 },
        ],
    },
    {
        id: 'marketing',
        name: 'Marketing',
        icon: <Megaphone className="w-4 h-4" />,
        amount: 85000,
        previousAmount: 95000,
        color: 'bg-rose-500',
        subcategories: [
            { name: 'Google Ads', amount: 40000, change: -5000 },
            { name: 'Meta Ads', amount: 25000, change: -5000 },
            { name: 'Content', amount: 20000 },
        ],
        aiInsight: 'Good cost control! Marketing down 10% but CAC stable.',
    },
    {
        id: 'office',
        name: 'Office & Rent',
        icon: <Building2 className="w-4 h-4" />,
        amount: 80000,
        previousAmount: 80000,
        color: 'bg-amber-500',
    },
    {
        id: 'utilities',
        name: 'Utilities',
        icon: <Zap className="w-4 h-4" />,
        amount: 12000,
        previousAmount: 10000,
        color: 'bg-yellow-500',
    },
    {
        id: 'insurance',
        name: 'Insurance',
        icon: <Shield className="w-4 h-4" />,
        amount: 25000,
        previousAmount: 25000,
        color: 'bg-emerald-500',
    },
    {
        id: 'travel',
        name: 'Travel',
        icon: <Car className="w-4 h-4" />,
        amount: 18000,
        previousAmount: 8000,
        color: 'bg-indigo-500',
        aiInsight: 'Travel up 125%. Tag as one-time if client visits.',
    },
    {
        id: 'misc',
        name: 'Miscellaneous',
        icon: <Coffee className="w-4 h-4" />,
        amount: 8000,
        previousAmount: 7000,
        color: 'bg-slate-500',
    },
];

export function ExpenseBreakdown() {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const total = EXPENSE_CATEGORIES.reduce((sum, cat) => sum + cat.amount, 0);
    const previousTotal = EXPENSE_CATEGORIES.reduce((sum, cat) => sum + cat.previousAmount, 0);

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    return (
        <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Expense Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Total: {formatCurrency(total)}
                        <span className={`ml-2 ${total > previousTotal ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ({total > previousTotal ? '+' : ''}{((total - previousTotal) / previousTotal * 100).toFixed(1)}% MoM)
                        </span>
                    </p>
                </div>
            </div>

            {/* Stacked Bar */}
            <div className="h-4 rounded-full overflow-hidden flex mb-6">
                {EXPENSE_CATEGORIES.map((cat, i) => {
                    const width = (cat.amount / total) * 100;
                    return (
                        <motion.div
                            key={cat.id}
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`${cat.color} cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                            title={`${cat.name}: ${formatCurrency(cat.amount)} (${width.toFixed(1)}%)`}
                        />
                    );
                })}
            </div>

            {/* Categories List */}
            <div className="space-y-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                    const percentage = (cat.amount / total) * 100;
                    const change = cat.amount - cat.previousAmount;
                    const changePercent = (change / cat.previousAmount) * 100;
                    const isExpanded = expandedId === cat.id;

                    return (
                        <div key={cat.id}>
                            <motion.div
                                onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-colors ${isExpanded ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${cat.color}/20 flex items-center justify-center`}>
                                            <span className={cat.color.replace('bg-', 'text-')}>{cat.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{cat.name}</p>
                                            <p className="text-[10px] text-slate-500">{percentage.toFixed(1)}% of total</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">{formatCurrency(cat.amount)}</p>
                                            {change !== 0 && (
                                                <p className={`text-[10px] flex items-center gap-1 ${change > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    {change > 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                                                    {change > 0 ? '+' : ''}{changePercent.toFixed(0)}%
                                                </p>
                                            )}
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 ml-11 space-y-3">
                                            {/* Subcategories */}
                                            {cat.subcategories && (
                                                <div className="space-y-2">
                                                    {cat.subcategories.map((sub, i) => (
                                                        <div key={i} className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-400">{sub.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-white">{formatCurrency(sub.amount)}</span>
                                                                {sub.change && sub.change !== 0 && (
                                                                    <span className={`text-[10px] ${sub.change > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                        {sub.change > 0 ? '+' : ''}{formatCurrency(sub.change)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* AI Insight */}
                                            {cat.aiInsight && (
                                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-200">{cat.aiInsight}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
