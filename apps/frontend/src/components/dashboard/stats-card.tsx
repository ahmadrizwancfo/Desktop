'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sparkline } from '@/components/ui/sparkline';
import { CFOTooltip, CFO_TOOLTIPS } from '@/components/ui/cfo-tooltip';

interface StatsCardProps {
    title: string;
    value: string;
    trend: number;
    icon: LucideIcon;
    description: string;
    index: number;
    // New props for enhanced features
    sparklineData?: number[];
    tooltipKey?: keyof typeof CFO_TOOLTIPS;
    isPositiveGood?: boolean; // true = increase is good (revenue), false = increase is bad (burn)
}

export function StatsCard({
    title,
    value,
    trend,
    icon: Icon,
    description,
    index,
    sparklineData,
    tooltipKey,
    isPositiveGood = true
}: StatsCardProps) {
    const isPositive = trend > 0;
    const isTrendGood = isPositiveGood ? isPositive : !isPositive;

    const tooltip = tooltipKey ? CFO_TOOLTIPS[tooltipKey] : null;

    const cardContent = (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-300"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    isTrendGood ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            </div>

            <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                <p className="text-slate-500 text-[10px] mt-2 font-medium">{description}</p>
            </div>

            {/* Sparkline visualization */}
            {sparklineData && sparklineData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <Sparkline
                        data={sparklineData}
                        color={isTrendGood ? '#10b981' : '#ef4444'}
                        height={40}
                    />
                </div>
            )}

            {/* Subtle glow effect on hover */}
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </motion.div>
    );

    // Wrap with tooltip if provided
    if (tooltip) {
        return (
            <CFOTooltip
                title={tooltip.title}
                explanation={tooltip.explanation}
                advice={tooltip.advice}
                type={tooltip.type}
                position="bottom"
            >
                {cardContent}
            </CFOTooltip>
        );
    }

    return cardContent;
}
