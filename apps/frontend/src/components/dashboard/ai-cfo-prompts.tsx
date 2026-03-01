'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export function AICFOPrompts() {
    const user = useAuthStore((state) => state.user);

    const { data: prompts, isLoading } = useQuery({
        queryKey: ['ai-prompts', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/recommendations/prompts');
            return res.data as string[];
        },
        enabled: !!user?.organizationId,
    });

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
            {/* Gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5" />

            <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Ask AI CFO</h2>
                        <p className="text-xs text-slate-500">Contextual questions based on your data</p>
                    </div>
                </div>

                <div className="space-y-2 mb-4">
                    {prompts?.map((prompt, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link
                                href={`/ai-cfo?q=${encodeURIComponent(prompt)}`}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-primary/10 transition-colors group"
                            >
                                <MessageCircle className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                                <span className="text-sm text-white flex-1">"{prompt}"</span>
                                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <Link
                    href="/ai-cfo"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-indigo-600 transition-colors"
                >
                    <MessageCircle className="w-4 h-4" />
                    Ask your own question
                </Link>
            </div>
        </div>
    );
}
