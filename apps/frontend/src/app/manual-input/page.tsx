'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Loader2,
    IndianRupee,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Info,
    Shield,
    Banknote,
    Building2,
    Zap,
    Percent,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
}

interface Warning {
    id: string;
    message: string;
    type: 'warn' | 'info';
}

// ─── Currency Input ─────────────────────────────────────────────────────────────

function CurrencyInput({
    label,
    icon: Icon,
    value,
    onChange,
    required = false,
    error,
    description,
}: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    error?: string;
    description?: string;
}) {
    const numVal = Number(value) || 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <label className="text-sm font-bold text-slate-300">
                        {label}
                        {required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                </div>
                {numVal > 0 && (
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                        {fmt(numVal)}
                    </span>
                )}
            </div>
            {description && (
                <p className="text-[11px] text-slate-600 -mt-1">{description}</p>
            )}
            <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 bg-white/[0.02] transition-all focus-within:bg-white/[0.04]",
                error ? "border-rose-500/40" : "border-white/10 focus-within:border-primary/40"
            )}>
                <span className="text-sm font-bold text-slate-500">₹</span>
                <input
                    type="number"
                    min={0}
                    step={1000}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-white text-lg font-bold focus:outline-none placeholder:text-slate-700 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
            </div>
            {error && (
                <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {error}
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ManualInputPage() {
    const router = useRouter();
    const { profile } = useStartupProfileStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // ── Form state ───────────────────────────────────────────────────────────
    const [revenue, setRevenue] = useState('');
    const [fixedCosts, setFixedCosts] = useState('');
    const [variableCosts, setVariableCosts] = useState('');
    const [cashBalance, setCashBalance] = useState('');
    const [growthRate, setGrowthRate] = useState('');

    // Pre-fill if editing existing profile
    useEffect(() => {
        if (profile) {
            setIsEditing(true);
            setRevenue(String(Number(profile.monthlyRevenue) || ''));
            setFixedCosts(String(Math.round(Number(profile.monthlyExpenses) * 0.7) || ''));
            setVariableCosts(String(Math.round(Number(profile.monthlyExpenses) * 0.3) || ''));
            setCashBalance(String(Number(profile.cashInBank) || ''));
        }
    }, [profile]);

    // ── Derived values ──────────────────────────────────────────────────────
    const numRevenue = Number(revenue) || 0;
    const numFixed = Number(fixedCosts) || 0;
    const numVariable = Number(variableCosts) || 0;
    const numCash = Number(cashBalance) || 0;
    const numGrowth = Number(growthRate) || 0;
    const totalCosts = numFixed + numVariable;
    const netBurn = Math.max(totalCosts - numRevenue, 0);
    const runway = netBurn > 0 ? numCash / netBurn : numRevenue > totalCosts ? Infinity : 0;

    // ── Validation ──────────────────────────────────────────────────────────
    const errors: Record<string, string> = {};
    if (revenue && Number(revenue) < 0) errors.revenue = 'Cannot be negative';
    if (fixedCosts && Number(fixedCosts) < 0) errors.fixedCosts = 'Cannot be negative';
    if (variableCosts && Number(variableCosts) < 0) errors.variableCosts = 'Cannot be negative';
    if (cashBalance && Number(cashBalance) < 0) errors.cashBalance = 'Cannot be negative';

    const canSubmit =
        cashBalance !== '' && Number(cashBalance) >= 0 &&
        fixedCosts !== '' && Number(fixedCosts) >= 0 &&
        Object.keys(errors).length === 0;

    // ── Smart Warnings (DO NOT BLOCK) ───────────────────────────────────────
    const warnings = useMemo<Warning[]>(() => {
        const w: Warning[] = [];
        if (numRevenue === 0 && numVariable > 0) {
            w.push({ id: 'rev_var', message: 'Variable costs without revenue — confirm this is correct.', type: 'warn' });
        }
        if (numCash > 0 && numCash < totalCosts) {
            w.push({ id: 'low_cash', message: `Cash covers less than 1 month of costs (${fmt(totalCosts)}/mo).`, type: 'warn' });
        }
        if (totalCosts > numCash * 2 && numCash > 0) {
            w.push({ id: 'high_cost', message: 'Total costs exceed 2× your cash balance. Please verify.', type: 'warn' });
        }
        if (numRevenue > totalCosts * 5 && totalCosts > 0) {
            w.push({ id: 'high_rev', message: 'Revenue seems unusually high relative to costs. Verify numbers.', type: 'info' });
        }
        return w;
    }, [numRevenue, numFixed, numVariable, numCash, totalCosts]);

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError('');

        try {
            await apiClient.post('/startup-profile', {
                companyName: profile?.companyName || 'My Company',
                stage: numRevenue > 0 ? 'SEED' : 'IDEA',
                monthlyRevenue: numRevenue,
                monthlyExpenses: totalCosts,
                cashInBank: numCash,
                teamSize: profile?.teamSize || 5,
                country: 'IN',
                industry: profile?.industry || 'Technology / SaaS',
                primaryGoal: runway < 6 ? 'SURVIVE' : numRevenue > 0 ? 'SCALE' : 'RAISE',
                dataInputMethod: 'MANUAL',
            });

            // Invalidate CFO state
            apiClient.post('/cfo-engine/state/invalidate').catch(() => {});
            router.push('/insight?source=manual');
        } catch (err: any) {
            setSubmitError(err?.response?.data?.message || 'Failed to save. Try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] relative overflow-hidden">
            {/* Ambient */}
            <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-amber-600/8 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/8 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex mb-6">
                        <Logo size="xl" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.1] mb-3">
                        {isEditing ? 'Update your financials' : 'Enter your financials'}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
                        Structured data only — no guessing. Your CFO needs real numbers to give real advice.
                    </p>
                    <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Confidence: Medium</span>
                    </div>
                </motion.header>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-6"
                >
                    {/* Financial Inputs */}
                    <div className="p-6 sm:p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <IndianRupee className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Monthly Financials</span>
                        </div>

                        <CurrencyInput
                            label="Monthly Revenue"
                            icon={TrendingUp}
                            value={revenue}
                            onChange={setRevenue}
                            error={errors.revenue}
                            description="Total monthly income (subscriptions, sales, services)"
                        />

                        <div className="h-px bg-white/5" />

                        <CurrencyInput
                            label="Monthly Fixed Costs"
                            icon={Building2}
                            value={fixedCosts}
                            onChange={setFixedCosts}
                            required
                            error={errors.fixedCosts}
                            description="Salaries, rent, SaaS tools, insurance"
                        />

                        <CurrencyInput
                            label="Monthly Variable Costs"
                            icon={Zap}
                            value={variableCosts}
                            onChange={setVariableCosts}
                            error={errors.variableCosts}
                            description="Marketing, cloud usage, commissions, freelancers"
                        />

                        <div className="h-px bg-white/5" />

                        <CurrencyInput
                            label="Current Cash Balance"
                            icon={Banknote}
                            value={cashBalance}
                            onChange={setCashBalance}
                            required
                            error={errors.cashBalance}
                            description="Total cash in all bank accounts right now"
                        />

                        <div className="h-px bg-white/5" />

                        {/* Growth Rate (Optional) */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Percent className="w-4 h-4 text-slate-500" />
                                <label className="text-sm font-bold text-slate-300">
                                    Monthly Growth Rate
                                    <span className="text-[10px] text-slate-600 font-normal ml-2">(optional)</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-white/10 bg-white/[0.02] focus-within:border-primary/40 transition-all">
                                <input
                                    type="number"
                                    min={-100}
                                    max={200}
                                    step={1}
                                    value={growthRate}
                                    onChange={(e) => setGrowthRate(e.target.value)}
                                    placeholder="0"
                                    className="flex-1 bg-transparent text-white text-lg font-bold focus:outline-none placeholder:text-slate-700 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm font-bold text-slate-500">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Summary */}
                    {(numCash > 0 || totalCosts > 0) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Preview</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Net Burn</p>
                                    <p className="text-lg font-black text-white tabular-nums">
                                        {netBurn > 0 ? fmt(netBurn) : '₹0'}
                                        <span className="text-[10px] text-slate-600 ml-1">/mo</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Runway</p>
                                    <p className={cn(
                                        "text-lg font-black tabular-nums",
                                        runway === Infinity ? "text-emerald-400" :
                                        runway < 3 ? "text-rose-400" :
                                        runway < 6 ? "text-amber-400" : "text-emerald-400"
                                    )}>
                                        {runway === Infinity ? '∞' :
                                         runway === 0 ? '—' :
                                         `${runway.toFixed(1)}`}
                                        <span className="text-[10px] text-slate-600 ml-1">
                                            {runway === Infinity ? 'profitable' : runway > 0 ? 'months' : ''}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Total Costs</p>
                                    <p className="text-lg font-black text-white tabular-nums">
                                        {totalCosts > 0 ? fmt(totalCosts) : '₹0'}
                                        <span className="text-[10px] text-slate-600 ml-1">/mo</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Warnings (DO NOT BLOCK) */}
                    <AnimatePresence>
                        {warnings.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                {warnings.map((w) => (
                                    <div
                                        key={w.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3.5 rounded-xl border text-sm",
                                            w.type === 'warn'
                                                ? "bg-amber-500/5 border-amber-500/15 text-amber-400"
                                                : "bg-sky-500/5 border-sky-500/15 text-sky-400"
                                        )}
                                    >
                                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="text-[12px] font-bold">{w.message}</span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <div className="pt-2 space-y-3">
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className={cn(
                                "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40 shadow-2xl",
                                "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                            )}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isEditing ? 'Update & Recompute' : 'Generate CFO Analysis'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        {!isEditing && (
                            <button
                                onClick={() => router.push('/get-started')}
                                className="w-full py-3 text-center text-[11px] text-slate-600 font-bold uppercase tracking-widest hover:text-slate-400 transition-colors"
                            >
                                ← Back to options
                            </button>
                        )}
                    </div>

                    {submitError && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-bold text-center"
                        >
                            {submitError}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
