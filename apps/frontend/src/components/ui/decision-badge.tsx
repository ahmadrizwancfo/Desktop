'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, Clock, HelpCircle } from 'lucide-react';

type DecisionType = 'yes' | 'no' | 'caution' | 'pending' | 'unknown';

interface DecisionBadgeProps {
    decision: DecisionType;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    animate?: boolean;
}

const DECISION_STYLES = {
    yes: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        icon: Check,
        defaultLabel: 'Yes, Safe',
    },
    no: {
        bg: 'bg-rose-500/20',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        icon: X,
        defaultLabel: 'No, Risky',
    },
    caution: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: AlertTriangle,
        defaultLabel: 'Proceed with Caution',
    },
    pending: {
        bg: 'bg-sky-500/20',
        border: 'border-sky-500/30',
        text: 'text-sky-400',
        icon: Clock,
        defaultLabel: 'Pending Decision',
    },
    unknown: {
        bg: 'bg-slate-500/20',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        icon: HelpCircle,
        defaultLabel: 'Needs More Data',
    },
};

const SIZE_STYLES = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
};

const ICON_SIZES = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
};

export function DecisionBadge({
    decision,
    label,
    size = 'md',
    showIcon = true,
    animate = true
}: DecisionBadgeProps) {
    const style = DECISION_STYLES[decision];
    const Icon = style.icon;

    const badge = (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border ${style.bg} ${style.border} ${style.text} ${SIZE_STYLES[size]}`}
        >
            {showIcon && <Icon className={ICON_SIZES[size]} />}
            {label || style.defaultLabel}
        </span>
    );

    if (animate) {
        return (
            <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
            >
                {badge}
            </motion.span>
        );
    }

    return badge;
}

// Decision logic helpers
export function getHireDecision(runway: number, monthlyBurn: number, salaryCost: number): DecisionType {
    const newBurn = monthlyBurn + salaryCost;
    const newRunway = runway * (monthlyBurn / newBurn);

    if (newRunway >= 12) return 'yes';
    if (newRunway >= 9) return 'caution';
    if (newRunway >= 6) return 'no';
    return 'no';
}

export function getRunwayDecision(months: number): DecisionType {
    if (months >= 12) return 'yes';
    if (months >= 9) return 'caution';
    if (months >= 6) return 'pending';
    return 'no';
}

export function getBurnDecision(currentBurn: number, previousBurn: number): DecisionType {
    const change = ((currentBurn - previousBurn) / previousBurn) * 100;

    if (change <= 0) return 'yes';
    if (change <= 5) return 'caution';
    if (change <= 15) return 'pending';
    return 'no';
}

export function getGrowthDecision(growthPercent: number): DecisionType {
    if (growthPercent >= 20) return 'yes';
    if (growthPercent >= 10) return 'caution';
    if (growthPercent >= 0) return 'pending';
    return 'no';
}
