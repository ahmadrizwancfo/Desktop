'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Download, Share2, TrendingUp, TrendingDown, Minus, Check, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface Narrative {
    month: string;
    year: number;
    narrative: string;
    highlights: {
        metric: string;
        value: string;
        change: string;
        sentiment: 'positive' | 'negative' | 'neutral';
    }[];
    focus: string;
}

export function FounderNarrative() {
    const user = useAuthStore((state) => state.user);
    const [copied, setCopied] = useState(false);

    const { data: narrative, isLoading } = useQuery({
        queryKey: ['narrative', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/recommendations/narrative');
            return res.data as Narrative;
        },
        enabled: !!user?.organizationId,
    });

    const handleCopy = async () => {
        if (!narrative) return;

        const text = `${narrative.month} ${narrative.year} CFO Update\n\n${narrative.narrative}\n\nKey Metrics:\n${narrative.highlights.map(h => `• ${h.metric}: ${h.value} (${h.change})`).join('\n')}`;

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!narrative) return;

        const text = `# ${narrative.month} ${narrative.year} CFO Update\n\n${narrative.narrative}\n\n## Key Metrics\n\n${narrative.highlights.map(h => `- **${h.metric}**: ${h.value} (${h.change})`).join('\n')}\n\n## Focus Area\n\n${narrative.focus}`;

        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cfo-update-${narrative.month.toLowerCase()}-${narrative.year}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!narrative) return null;

    const sentimentIcon = {
        positive: TrendingUp,
        negative: TrendingDown,
        neutral: Minus,
    };

    const sentimentColor = {
        positive: 'text-emerald-400',
        negative: 'text-rose-400',
        neutral: 'text-slate-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-6 relative overflow-hidden"
        >
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{narrative.month} {narrative.year}</h2>
                            <p className="text-xs text-slate-500">Monthly CFO Narrative</p>
                        </div>
                    </div>
                </div>

                {/* Narrative Text */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <p className="text-sm text-white leading-relaxed">
                        "{narrative.narrative}"
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {narrative.highlights.map((highlight, i) => {
                        const Icon = sentimentIcon[highlight.sentiment];
                        return (
                            <div key={i} className="p-3 rounded-xl bg-white/5 text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{highlight.metric}</p>
                                <p className="text-lg font-black text-white">{highlight.value}</p>
                                <div className={`flex items-center justify-center gap-1 text-xs font-bold ${sentimentColor[highlight.sentiment]}`}>
                                    <Icon className="w-3 h-3" />
                                    {highlight.change}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy for Investor'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors">
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
