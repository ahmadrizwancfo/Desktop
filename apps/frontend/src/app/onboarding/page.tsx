'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Users,
    Wallet,
    Target,
    ArrowRight,
    ArrowLeft,
    TrendingUp,
    Loader2,
    Globe,
    Briefcase,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const stages = [
    { value: 'IDEA', label: 'Idea', desc: 'Pre-revenue, still validating' },
    { value: 'PRE_SEED', label: 'Pre-Seed', desc: '< $500K raised, early users' },
    { value: 'SEED', label: 'Seed', desc: 'Product live, some revenue' },
    { value: 'GROWTH', label: 'Growth', desc: 'Scaling fast, Series A/B' },
    { value: 'SME', label: 'SME', desc: 'Established business' },
];

const goals = [
    { value: 'RAISE', label: 'Raise Capital', icon: '🚀', desc: 'Seeking investors' },
    { value: 'SURVIVE', label: 'Extend Runway', icon: '⏳', desc: 'Manage burn rate' },
    { value: 'PROFIT', label: 'Reach Profit', icon: '💰', desc: 'Achieve sustainability' },
    { value: 'SCALE', label: 'Scale Fast', icon: '📈', desc: 'Grow aggressively' },
];

const industries = [
    'Technology / SaaS', 'E-commerce', 'FinTech', 'Healthcare',
    'EdTech', 'Manufacturing', 'D2C / Consumer', 'Services / Agency', 'Other',
];

const countries = [
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'US', label: '🇺🇸 United States' },
    { value: 'GB', label: '🇬🇧 United Kingdom' },
    { value: 'SG', label: '🇸🇬 Singapore' },
    { value: 'AE', label: '🇦🇪 UAE' },
    { value: 'OTHER', label: '🌍 Other' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const setProfile = useStartupProfileStore((state) => state.setProfile);

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        country: 'IN',
        industry: '',
        stage: '',
        teamSize: '',
        monthlyRevenue: '',
        monthlyExpenses: '',
        cashInBank: '',
        primaryGoal: '',
    });

    const update = (key: string, value: string) =>
        setFormData((prev) => ({ ...prev, [key]: value }));

    const canNext = () => {
        if (step === 1) return formData.companyName.trim() && formData.industry && formData.country;
        if (step === 2) return formData.stage && formData.teamSize;
        if (step === 3) return formData.monthlyExpenses && formData.cashInBank;
        if (step === 4) return !!formData.primaryGoal;
        return false;
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Create org if user doesn't have one
            let orgId = (user as any)?.organizationId;
            if (!orgId) {
                const orgRes = await apiClient.post('/organizations', {
                    name: formData.companyName,
                    industry: formData.industry,
                    country: formData.country,
                });
                orgId = orgRes.data.id;
                if (user?.id) {
                    await apiClient.post(`/organizations/${orgId}/users/${user.id}`);
                }
            }

            // 2. Save startup profile
            const profileRes = await apiClient.post('/startup-profile', {
                companyName: formData.companyName,
                stage: formData.stage,
                monthlyRevenue: Number(formData.monthlyRevenue) || 0,
                monthlyExpenses: Number(formData.monthlyExpenses) || 0,
                cashInBank: Number(formData.cashInBank) || 0,
                teamSize: Number(formData.teamSize) || 1,
                country: formData.country,
                industry: formData.industry,
                primaryGoal: formData.primaryGoal,
                organizationId: orgId,
            });

            setProfile(profileRes.data);

            // 3. Trigger CFO engine in background (fire-and-forget)
            apiClient.post('/cfo-engine/run').catch(() => { });

            router.push('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const stepIcons = [Building2, Users, Wallet, Target];
    const stepColors = ['text-primary', 'text-emerald-500', 'text-amber-500', 'text-violet-500'];
    const stepBgColors = ['bg-primary/10', 'bg-emerald-500/10', 'bg-amber-500/10', 'bg-violet-500/10'];
    const stepTitles = ['Company Details', 'Team & Stage', 'Financials', 'Primary Goal'];
    const stepSubtitles = [
        'Tell us about your business',
        'Where are you in your journey?',
        'Key financial snapshot',
        'What matters most right now?',
    ];

    const StepIcon = stepIcons[step - 1];

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-2xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <TrendingUp className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">FounderCFO</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Set up your CFO context</h1>
                    <p className="text-slate-400 mt-2">Your AI CFO needs this to generate real decisions — not generic advice.</p>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={cn(
                                'h-1 flex-1 rounded-full transition-all duration-500',
                                s <= step ? 'bg-primary' : 'bg-white/10',
                            )}
                        />
                    ))}
                </div>

                <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Step Header */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={cn('p-3 rounded-2xl', stepBgColors[step - 1])}>
                                    <StepIcon className={cn('w-6 h-6', stepColors[step - 1])} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{stepTitles[step - 1]}</h2>
                                    <p className="text-sm text-slate-400">{stepSubtitles[step - 1]}</p>
                                </div>
                                <span className="ml-auto text-xs text-slate-500 font-mono">{step} / 4</span>
                            </div>

                            {/* ── Step 1: Company Details ── */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company Name *</label>
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={(e) => update('companyName', e.target.value)}
                                            placeholder="Acme Technologies Pvt Ltd"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                <Globe className="w-3 h-3" /> Country *
                                            </label>
                                            <select
                                                value={formData.country}
                                                onChange={(e) => update('country', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                            >
                                                {countries.map((c) => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" /> Industry *
                                            </label>
                                            <select
                                                value={formData.industry}
                                                onChange={(e) => update('industry', e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                            >
                                                <option value="">Select industry</option>
                                                {industries.map((i) => (
                                                    <option key={i} value={i}>{i}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Stage & Team ── */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Startup Stage *</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {stages.map((s) => (
                                                <button
                                                    key={s.value}
                                                    onClick={() => update('stage', s.value)}
                                                    className={cn(
                                                        'p-3 rounded-xl text-left transition-all flex items-center gap-3',
                                                        formData.stage === s.value
                                                            ? 'bg-primary/20 border border-primary/60 text-white'
                                                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10',
                                                    )}
                                                >
                                                    <span className={cn('font-bold text-sm min-w-[72px]', formData.stage === s.value ? 'text-primary' : '')}>{s.label}</span>
                                                    <span className="text-xs text-slate-400">{s.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Team Size (people) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.teamSize}
                                            onChange={(e) => update('teamSize', e.target.value)}
                                            placeholder="e.g. 8"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Financials ── */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                                        💡 Estimates are fine. This helps your AI CFO calibrate decisions — not auditing.
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Revenue</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.monthlyRevenue}
                                                    onChange={(e) => update('monthlyRevenue', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-7 pr-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Expenses *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formData.monthlyExpenses}
                                                    onChange={(e) => update('monthlyExpenses', e.target.value)}
                                                    placeholder="500000"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-7 pr-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cash in Bank *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.cashInBank}
                                                onChange={(e) => update('cashInBank', e.target.value)}
                                                placeholder="5000000"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-7 pr-4 text-sm text-white outline-none focus:border-primary/60 transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500">Total cash across all bank accounts right now</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 4: Primary Goal ── */}
                            {step === 4 && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-400">This determines which metrics your AI CFO prioritizes.</p>
                                    {goals.map((g) => (
                                        <button
                                            key={g.value}
                                            onClick={() => update('primaryGoal', g.value)}
                                            className={cn(
                                                'w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 border',
                                                formData.primaryGoal === g.value
                                                    ? 'bg-violet-500/20 border-violet-500/60'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10',
                                            )}
                                        >
                                            <span className="text-2xl">{g.icon}</span>
                                            <div>
                                                <p className={cn('font-bold text-sm', formData.primaryGoal === g.value ? 'text-violet-300' : 'text-white')}>{g.label}</p>
                                                <p className="text-xs text-slate-400">{g.desc}</p>
                                            </div>
                                            {g.value === 'RAISE' && (
                                                <span className="ml-auto text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                                                    Investor metrics enabled
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canNext()}
                                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !canNext()}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your CFO...</>
                                ) : (
                                    <>Launch Dashboard <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
