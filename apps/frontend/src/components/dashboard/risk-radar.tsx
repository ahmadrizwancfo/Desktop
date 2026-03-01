'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, TrendingDown, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface Risk {
    id: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    probability: number;
    impact: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'MINOR';
    daysUntilCritical?: number;
    mitigation: string;
    affectedMetric: string;
}

const severityConfig = {
    HIGH: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20',
        icon: AlertTriangle,
    },
    MEDIUM: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20',
        icon: Clock,
    },
    LOW: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20',
        icon: Shield,
    },
};

export function RiskRadar() {
    const user = useAuthStore((state) => state.user);

    const { data: risks, isLoading } = useQuery({
        queryKey: ['risks', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/recommendations/risks');
            return res.data as Risk[];
        },
        enabled: !!user?.organizationId,
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!risks || risks.length === 0) {
        return (
            <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Risk Radar</h2>
                        <p className="text-xs text-slate-500">All clear! No risks detected.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Risk Radar</h2>
                        <p className="text-xs text-slate-500">Upcoming risks requiring attention</p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${risks.some(r => r.severity === 'HIGH') ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                    {risks.filter(r => r.severity === 'HIGH').length} High
                </span>
            </div>

            <div className="space-y-3">
                {risks.slice(0, 4).map((risk, i) => {
                    const config = severityConfig[risk.severity];
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={risk.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-4 rounded-xl border ${config.bg} ${config.border} group cursor-pointer hover:scale-[1.01] transition-transform`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg ${config.badge} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-4 h-4 ${config.text}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-white truncate">{risk.title}</h3>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] mb-2">
                                        <span className={`${config.text} font-bold`}>
                                            {risk.probability}% likely
                                        </span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-500">
                                            Impact: {risk.impact}
                                        </span>
                                        {risk.daysUntilCritical !== undefined && (
                                            <>
                                                <span className="text-slate-500">•</span>
                                                <span className="text-rose-400 font-bold">
                                                    {risk.daysUntilCritical}d until critical
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-500">Mitigation:</span>
                                        <span className="text-white truncate">{risk.mitigation}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
