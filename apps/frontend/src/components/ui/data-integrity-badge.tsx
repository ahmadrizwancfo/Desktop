'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, UserCircle, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataIntegrityBadgeProps {
    entityType: string;
    entityId: string;
    lastVerified?: string;
    lastModifiedBy?: string;
    status?: 'verified' | 'pending' | 'warning';
    size?: 'sm' | 'md';
}

export function DataIntegrityBadge({
    entityType,
    entityId,
    lastVerified,
    lastModifiedBy,
    status = 'verified',
    size = 'sm'
}: DataIntegrityBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const statusConfig = {
        verified: {
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            label: 'Verified'
        },
        pending: {
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            label: 'Pending'
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            label: 'Needs Review'
        }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative inline-flex">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className={cn(
                    "flex items-center gap-1 rounded-lg border transition-all hover:scale-105",
                    config.bg,
                    config.border,
                    size === 'sm' ? "px-1.5 py-0.5" : "px-2 py-1"
                )}
            >
                <Shield className={cn(config.color, size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
                {size === 'md' && (
                    <span className={cn("text-xs font-bold", config.color)}>
                        {config.label}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
                    >
                        <div className="glass-card rounded-xl p-4 border border-white/10 shadow-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon className={cn("w-4 h-4", config.color)} />
                                <span className={cn("text-sm font-bold", config.color)}>
                                    {config.label}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <History className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-400">Entity:</span>
                                    <span className="text-white font-mono">{entityType} #{entityId}</span>
                                </div>

                                {lastVerified && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        <span className="text-slate-400">Last verified:</span>
                                        <span className="text-white">{formatTimeAgo(lastVerified)}</span>
                                    </div>
                                )}

                                {lastModifiedBy && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <UserCircle className="w-3 h-3 text-slate-500" />
                                        <span className="text-slate-400">Modified by:</span>
                                        <span className="text-white">{lastModifiedBy}</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/5">
                                This number is reliable and tracked in our audit system.
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-slate-800 border-r border-b border-white/10" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Convenience wrapper for verified metrics
export function VerifiedBadge({ label }: { label?: string }) {
    return (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                {label || 'Verified'}
            </span>
        </div>
    );
}
