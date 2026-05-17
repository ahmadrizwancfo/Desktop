'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link2, PenLine, FlaskConical, ArrowRight, Loader2, ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { apiClient } from '@/lib/api-client';
import { seedDemoData } from '@/lib/demo-data';

export default function GetStartedPage() {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleDemo = async () => {
        setLoading('demo');
        try {
            const result = await seedDemoData(apiClient);
            if (result.success) {
                router.push('/insight?source=demo');
            } else {
                console.error('Demo seed failed:', result.error);
                setLoading(null);
            }
        } catch (err) {
            console.error('Demo seed error:', err);
            setLoading(null);
        }
    };

    const options = [
        {
            id: 'integrations',
            icon: Link2,
            title: 'Connect Integrations',
            description: 'Razorpay, Zoho, Bank Sync',
            sub: 'Automatic data import',
            confidence: 'HIGH',
            confidenceColor: 'text-emerald-400',
            confidenceBg: 'bg-emerald-500/10 border-emerald-500/20',
            confidenceIcon: ShieldCheck,
            border: 'border-emerald-500/20 hover:border-emerald-500/40',
            glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
            onClick: () => router.push('/integrations'),
        },
        {
            id: 'manual',
            icon: PenLine,
            title: 'Enter Financials',
            description: 'Revenue, costs, cash balance',
            sub: 'Structured manual input',
            confidence: 'MEDIUM',
            confidenceColor: 'text-amber-400',
            confidenceBg: 'bg-amber-500/10 border-amber-500/20',
            confidenceIcon: Shield,
            border: 'border-amber-500/20 hover:border-amber-500/40',
            glow: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.08)]',
            onClick: () => router.push('/manual-input'),
        },
        {
            id: 'demo',
            icon: FlaskConical,
            title: 'Try Sample Data',
            description: 'Pre-loaded startup profile',
            sub: 'For exploration only',
            confidence: 'LOW',
            confidenceColor: 'text-slate-400',
            confidenceBg: 'bg-slate-500/10 border-slate-500/20',
            confidenceIcon: ShieldAlert,
            border: 'border-white/10 hover:border-white/20',
            glow: 'hover:shadow-[0_0_40px_rgba(255,255,255,0.03)]',
            onClick: handleDemo,
        },
    ];

    return (
        <div className="min-h-screen bg-[#020617] relative overflow-hidden flex items-center justify-center">
            {/* Ambient */}
            <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600/8 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex mb-6">
                        <Logo size="xl" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4">
                        How do you want to <span className="text-gradient">power your CFO</span>?
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto">
                        Choose how to provide your financial data. You can always change this later.
                    </p>
                </motion.header>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {options.map((opt, i) => (
                        <motion.button
                            key={opt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.08 }}
                            onClick={opt.onClick}
                            disabled={loading !== null}
                            className={cn(
                                "relative p-8 rounded-[2rem] border-2 bg-white/[0.02] text-left transition-all duration-300 group",
                                "hover:bg-white/[0.04] active:scale-[0.98]",
                                "disabled:opacity-50 disabled:pointer-events-none",
                                opt.border, opt.glow
                            )}
                        >
                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                {loading === opt.id ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <opt.icon className="w-6 h-6 text-white" />
                                )}
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-black text-white mb-1 tracking-tight">{opt.title}</h3>
                            <p className="text-sm text-slate-400 font-medium mb-1">{opt.description}</p>
                            <p className="text-[11px] text-slate-600 font-bold mb-6">{opt.sub}</p>

                            {/* Confidence Badge */}
                            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest", opt.confidenceBg)}>
                                <opt.confidenceIcon className={cn("w-3 h-3", opt.confidenceColor)} />
                                <span className={opt.confidenceColor}>Confidence: {opt.confidence}</span>
                            </div>

                            {/* Arrow */}
                            <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <ArrowRight className="w-5 h-5 text-white/40" />
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-[11px] text-slate-600 mt-8 font-bold"
                >
                    Integrations are optional. You can start with manual data and upgrade anytime.
                </motion.p>
            </div>
        </div>
    );
}
