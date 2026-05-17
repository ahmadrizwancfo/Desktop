'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, ArrowRight, Lock } from 'lucide-react';
import { type GatedFeature, getUpgradeTierFor, getTierLabel } from '@/lib/feature-gates';

interface UpgradePromptProps {
    feature: string;
    featureKey: GatedFeature;
    inline?: boolean; // true = small inline badge, false = full card
}

export function UpgradePrompt({ feature, featureKey, inline }: UpgradePromptProps) {
    const upgradeTier = getUpgradeTierFor(featureKey);

    if (inline) {
        return (
            <Link
                href="/upgrade"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
            >
                <Lock className="w-3 h-3" />
                {getTierLabel(upgradeTier)} Feature
            </Link>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 via-primary/5 to-violet-500/5 border border-amber-500/20 text-center"
        >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                {feature}
            </h4>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed max-w-xs mx-auto">
                This feature is available on the <span className="text-amber-400 font-bold">{getTierLabel(upgradeTier)}</span> plan.
                Upgrade to unlock unlimited access.
            </p>
            <Link
                href="/upgrade"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
                Upgrade Now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </motion.div>
    );
}
