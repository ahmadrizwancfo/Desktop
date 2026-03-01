'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, HelpCircle, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Check } from 'lucide-react';

interface CFOTooltipProps {
    children: React.ReactNode;
    title: string;
    explanation: string;
    advice?: string;
    type?: 'info' | 'positive' | 'negative' | 'warning';
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function CFOTooltip({
    children,
    title,
    explanation,
    advice,
    type = 'info',
    position = 'top'
}: CFOTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const typeStyles = {
        info: {
            border: 'border-sky-500/30',
            bg: 'bg-sky-500/10',
            icon: HelpCircle,
            iconColor: 'text-sky-400',
        },
        positive: {
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/10',
            icon: TrendingUp,
            iconColor: 'text-emerald-400',
        },
        negative: {
            border: 'border-rose-500/30',
            bg: 'bg-rose-500/10',
            icon: TrendingDown,
            iconColor: 'text-rose-400',
        },
        warning: {
            border: 'border-amber-500/30',
            bg: 'bg-amber-500/10',
            icon: AlertTriangle,
            iconColor: 'text-amber-400',
        },
    };

    const positionStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const style = typeStyles[type];
    const Icon = style.icon;

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 w-72 ${positionStyles[position]}`}
                    >
                        <div className={`glass-card rounded-2xl p-4 border ${style.border} ${style.bg}`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-1.5 rounded-lg ${style.bg}`}>
                                    <Icon className={`w-4 h-4 ${style.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white mb-1">{title}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{explanation}</p>

                                    {advice && (
                                        <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
                                            <Lightbulb className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                            <p className="text-xs text-primary font-medium">{advice}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Pre-built CFO tooltips for common metrics
export const CFO_TOOLTIPS = {
    runway: {
        title: 'Cash Runway',
        explanation: 'Number of months you can operate before running out of cash, assuming current burn rate continues.',
        advice: 'Aim for 12+ months runway. Below 6 months is critical - start fundraising or cutting costs immediately.',
        type: 'info' as const,
    },
    burnRate: {
        title: 'Burn Rate',
        explanation: 'Total monthly cash outflow minus revenue. This is how much cash you\'re "burning" each month.',
        advice: 'Track month-over-month changes. Burn increasing faster than revenue is a red flag.',
        type: 'warning' as const,
    },
    netBurn: {
        title: 'Net Burn',
        explanation: 'Monthly expenses minus monthly revenue. Positive = burning cash, Negative = profitable.',
        advice: 'Aim to reduce net burn by 10% each quarter through revenue growth or cost optimization.',
        type: 'info' as const,
    },
    revenueGrowth: {
        title: 'Revenue Growth',
        explanation: 'Month-over-month percentage change in total revenue.',
        advice: 'For Series A readiness, aim for 15-20% MoM growth. Below 10% may raise investor concerns.',
        type: 'positive' as const,
    },
    grossMargin: {
        title: 'Gross Margin',
        explanation: 'Percentage of revenue remaining after direct costs. For SaaS, this is revenue minus hosting/infra costs.',
        advice: 'Healthy SaaS margins are 70-90%. Below 60% indicates pricing or efficiency issues.',
        type: 'info' as const,
    },
    cac: {
        title: 'Customer Acquisition Cost',
        explanation: 'Total sales & marketing spend divided by new customers acquired.',
        advice: 'CAC should be recovered within 12 months (CAC < 1 year LTV). If CAC > LTV, you\'re losing money on each customer.',
        type: 'warning' as const,
    },
    mrr: {
        title: 'Monthly Recurring Revenue',
        explanation: 'Predictable monthly revenue from subscriptions. The key metric for SaaS valuations.',
        advice: 'Focus on MRR growth rate. Investors value consistent 15%+ MoM growth over absolute numbers.',
        type: 'positive' as const,
    },
    churn: {
        title: 'Churn Rate',
        explanation: 'Percentage of customers or revenue lost each month.',
        advice: 'Target <5% monthly churn. Above 10% indicates product-market fit issues.',
        type: 'negative' as const,
    },
};
