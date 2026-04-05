'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
    Building2,
    ArrowRight,
    ArrowLeft,
    TrendingUp,
    Loader2,
    Globe,
    Briefcase,
    RefreshCw,
    Flame,
    Clock,
    AlertTriangle,
    Zap,
    Shield,
    DollarSign,
    TrendingDown,
    Scissors,
    Sparkles,
    Activity,
    Lock,
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

// ─── Estimation Engine ───────────────────────────────────────────────────────

interface Estimates {
    revenueRange: [number, number];
    expenseRange: [number, number];
    cashRange: [number, number];
    teamRange: [number, number];
}

function getDefaultEstimates(stage: string, goal: string): Estimates {
    const stageDefaults: Record<string, Estimates> = {
        IDEA: {
            revenueRange: [0, 50000],
            expenseRange: [100000, 300000],
            cashRange: [500000, 2000000],
            teamRange: [1, 3],
        },
        PRE_SEED: {
            revenueRange: [50000, 200000],
            expenseRange: [200000, 500000],
            cashRange: [1500000, 5000000],
            teamRange: [2, 8],
        },
        SEED: {
            revenueRange: [200000, 800000],
            expenseRange: [400000, 1000000],
            cashRange: [3000000, 15000000],
            teamRange: [5, 20],
        },
        GROWTH: {
            revenueRange: [1000000, 5000000],
            expenseRange: [1500000, 4000000],
            cashRange: [10000000, 50000000],
            teamRange: [15, 80],
        },
        SME: {
            revenueRange: [2000000, 10000000],
            expenseRange: [1800000, 8000000],
            cashRange: [5000000, 30000000],
            teamRange: [20, 200],
        },
    };

    return stageDefaults[stage] || stageDefaults.SEED;
}

function getRecommendation(revenue: number, expenses: number, runway: number, goal: string, cash: number): { text: string; severity: 'critical' | 'warning' | 'positive' } {
    const netBurn = expenses - revenue;
    const cutPct = 15;
    const savedFromCut = expenses * (cutPct / 100);
    const newBurn = Math.max(0, netBurn - savedFromCut);
    const newRunway = newBurn > 0 ? cash / newBurn : 999;
    const runwayGain = Math.max(0, newRunway - runway);

    if (runway < 3) {
        return {
            text: `You're burning ${formatINR(netBurn)}/mo more than you earn. At this rate, cash runs out in ${runway.toFixed(1)} months. Cut expenses by 30% (${formatINR(expenses * 0.3)}/mo) to survive past ${(cash / Math.max(1, netBurn - expenses * 0.3)).toFixed(0)} months.`,
            severity: 'critical',
        };
    }
    if (runway < 6) {
        return {
            text: `Net burn of ${formatINR(netBurn)}/mo leaves ${runway.toFixed(1)} months of runway. Reduce discretionary spend by ${cutPct}% (save ${formatINR(savedFromCut)}/mo) to extend runway to ~${newRunway.toFixed(1)} months (+${runwayGain.toFixed(1)} mo).`,
            severity: 'warning',
        };
    }
    if (expenses > revenue * 2) {
        return {
            text: `Expenses (${formatINR(expenses)}) are ${(expenses / Math.max(1, revenue)).toFixed(1)}× revenue. Each ₹1 earned costs ₹${(expenses / Math.max(1, revenue)).toFixed(1)} to generate. Reduce CAC or renegotiate vendor contracts to close the gap by ${formatINR(netBurn)}/mo.`,
            severity: 'warning',
        };
    }
    if (expenses > revenue) {
        if (goal === 'PROFIT') {
            const monthsToProfit = revenue > 0 ? Math.ceil(netBurn / (revenue * 0.1)) : 99;
            return {
                text: `You're ${formatINR(netBurn)}/mo from profitability. Growing revenue 10%/mo closes the gap in ~${monthsToProfit} months. Alternatively, cut your 2-3 lowest-ROI line items.`,
                severity: 'warning',
            };
        }
        return {
            text: `Burn exceeds revenue by ${formatINR(netBurn)}/mo. With ${formatINR(cash)} in the bank, you have ${runway.toFixed(1)} months. A ${cutPct}% expense cut adds ~${runwayGain.toFixed(1)} months of buffer.`,
            severity: 'warning',
        };
    }
    if (goal === 'RAISE') {
        const surplus = revenue - expenses;
        return {
            text: `Strong fundraising position: ${formatINR(surplus)}/mo surplus with ${runway >= 999 ? '∞' : runway.toFixed(0) + '-month'} runway. Investors see capital efficiency — use this leverage to negotiate better terms.`,
            severity: 'positive',
        };
    }
    const surplus = revenue - expenses;
    return {
        text: `Revenue covers expenses with ${formatINR(surplus)}/mo surplus. Consider allocating 60% to growth and 40% to reserves. Your financial position supports calculated risk-taking.`,
        severity: 'positive',
    };
}

function getRiskLabel(revenue: number, expenses: number, runway: number): { text: string; color: string; pct: number } {
    if (runway < 3) return { text: 'Cash runway critically low', color: 'text-rose-400', pct: 15 };
    if (runway < 6) return { text: 'Runway below safe threshold', color: 'text-amber-400', pct: 35 };
    if (expenses > revenue * 1.5) return { text: 'Burn rate outpacing revenue', color: 'text-amber-400', pct: 45 };
    if (expenses > revenue) return { text: 'Operating at a net loss', color: 'text-yellow-400', pct: 60 };
    if (runway < 12) return { text: 'Moderate — monitor monthly', color: 'text-emerald-400', pct: 75 };
    return { text: 'No critical risks detected', color: 'text-emerald-400', pct: 92 };
}

function formatINR(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${Math.round(n)}`;
}


// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, format = 'inr' }: { value: number; format?: 'inr' | 'months' | 'raw' }) {
    const motionVal = useMotionValue(0);
    const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
    const [display, setDisplay] = useState('');

    useEffect(() => {
        motionVal.set(value);
    }, [value, motionVal]);

    useEffect(() => {
        const unsubscribe = spring.on('change', (v) => {
            if (format === 'inr') setDisplay(formatINR(v));
            else if (format === 'months') setDisplay(`${Math.max(0, v).toFixed(1)}`);
            else setDisplay(Math.round(v).toString());
        });
        return unsubscribe;
    }, [spring, format]);

    return <span className="tabular-nums">{display}</span>;
}

// ─── Slider Component ────────────────────────────────────────────────────────

function FinanceSlider({
    label,
    value,
    onChange,
    min,
    max,
    step = 10000,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    icon: React.ElementType;
    color: string;
}) {
    const pct = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</span>
                </div>
                <span className={cn('text-sm font-black tabular-nums', color)}>
                    {formatINR(value)}<span className="text-slate-600 font-medium">/mo</span>
                </span>
            </div>
            <div className="relative h-10 flex items-center group">
                {/* Track */}
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                        className={cn('h-full rounded-full', color === 'text-emerald-400' ? 'bg-emerald-500/40' : 'bg-amber-500/40')}
                        style={{ width: `${pct}%` }}
                        layout
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                </div>
                {/* Native range for accessibility */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
                {/* Custom thumb */}
                <motion.div
                    className={cn(
                        'absolute w-5 h-5 rounded-full border-2 shadow-lg pointer-events-none z-20',
                        color === 'text-emerald-400'
                            ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/30'
                            : 'bg-amber-500 border-amber-400 shadow-amber-500/30',
                    )}
                    style={{ left: `calc(${pct}% - 10px)` }}
                    layout
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            </div>
            {/* Range markers */}
            <div className="flex justify-between text-[9px] text-slate-700 tabular-nums px-0.5">
                <span>{formatINR(min)}</span>
                <span>{formatINR(max)}</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const setProfile = useStartupProfileStore((state) => state.setProfile);

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasInteracted, setHasInteracted] = useState(false);

    const [formData, setFormData] = useState({
        companyName: '',
        country: 'IN',
        industry: '',
        stage: 'SEED',
        teamSize: '5',
        monthlyRevenue: '',
        monthlyExpenses: '',
        primaryGoal: '',
        cashInBank: '',
    });

    // Slider state for the estimated dashboard (Step 2)
    const [sliderRevenue, setSliderRevenue] = useState(0);
    const [sliderExpenses, setSliderExpenses] = useState(0);
    const [sliderCash, setSliderCash] = useState(0);

    // Initialize slider values when entering step 2
    useEffect(() => {
        if (step === 2) {
            const estimates = getDefaultEstimates(formData.stage, formData.primaryGoal);
            // Start at the midpoint of estimated ranges
            if (!hasInteracted) {
                setSliderRevenue(Math.round((estimates.revenueRange[0] + estimates.revenueRange[1]) / 2));
                setSliderExpenses(Math.round((estimates.expenseRange[0] + estimates.expenseRange[1]) / 2));
                setSliderCash(Math.round((estimates.cashRange[0] + estimates.cashRange[1]) / 2));
            }
        }
    }, [step, formData.stage, formData.primaryGoal, hasInteracted]);

    const update = (key: string, value: string) =>
        setFormData((prev) => ({ ...prev, [key]: value }));

    // ─── Derived metrics (Step 2 dashboard) ──────────────────────────────────
    const metrics = useMemo(() => {
        const netBurn = Math.max(0, sliderExpenses - sliderRevenue);
        const runway = netBurn > 0 ? sliderCash / netBurn : 999;
        const risk = getRiskLabel(sliderRevenue, sliderExpenses, runway);
        const recommendation = getRecommendation(sliderRevenue, sliderExpenses, runway, formData.primaryGoal, sliderCash);

        // What-if: 15% expense cut
        const cutExpenses = sliderExpenses * 0.85;
        const cutBurn = Math.max(0, cutExpenses - sliderRevenue);
        const cutRunway = cutBurn > 0 ? sliderCash / cutBurn : 999;
        const cutRunwayDelta = Math.max(0, cutRunway - runway);

        // What-if: 20% revenue increase
        const boostRevenue = sliderRevenue * 1.2;
        const boostBurn = Math.max(0, sliderExpenses - boostRevenue);
        const boostRunway = boostBurn > 0 ? sliderCash / boostBurn : 999;
        const breakEvenGap = Math.max(0, sliderExpenses - sliderRevenue);
        const monthsToBreakEven = boostRevenue > sliderRevenue && breakEvenGap > 0
            ? Math.ceil(breakEvenGap / ((boostRevenue - sliderRevenue) * 0.5)) // conservative estimate
            : null;

        return {
            netBurn, runway, risk, recommendation,
            whatIf: {
                cutRunway: Math.min(cutRunway, 999),
                cutRunwayDelta: Math.min(cutRunwayDelta, 999),
                cutSaved: sliderExpenses * 0.15,
                boostRunway: Math.min(boostRunway, 999),
                monthsToBreakEven,
                boostRevenueAmt: sliderRevenue * 0.2,
            }
        };
    }, [sliderRevenue, sliderExpenses, sliderCash, formData.primaryGoal]);

    const estimates = useMemo(() => getDefaultEstimates(formData.stage, formData.primaryGoal), [formData.stage, formData.primaryGoal]);

    const canNext = () => {
        if (step === 1) return formData.companyName.trim() && formData.industry && formData.country && formData.stage && formData.primaryGoal;
        if (step === 2) return true; // Always passable — zero friction
        return false;
    };

    const handleSliderChange = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => (v: number) => {
        setter(v);
        if (!hasInteracted) setHasInteracted(true);
    }, [hasInteracted]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
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

            const profileRes = await apiClient.post('/startup-profile', {
                companyName: formData.companyName,
                stage: formData.stage,
                monthlyRevenue: sliderRevenue,
                monthlyExpenses: sliderExpenses,
                cashInBank: sliderCash,
                teamSize: Number(formData.teamSize) || 5,
                country: formData.country,
                industry: formData.industry,
                primaryGoal: formData.primaryGoal,
                organizationId: orgId,
            });

            setProfile(profileRes.data);
            apiClient.post('/cfo-engine/run').catch(() => { });
            router.push('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Step config ─────────────────────────────────────────────────────────
    const totalSteps = 2;
    const stepTitles = ['Your Business', 'Your AI CFO'];
    const stepSubtitles = [
        'Tell us about your company and goals',
        'Your estimated financial intelligence — live',
    ];
    const stepIcons = [Building2, Zap];
    const stepColors = ['text-primary', 'text-emerald-400'];
    const stepBgColors = ['bg-primary/10', 'bg-emerald-500/10'];
    const StepIcon = stepIcons[step - 1];

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-1000">
            {/* Cinematic Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full opacity-30 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 blur-[100px] rounded-full opacity-20 pointer-events-none" />
            {step === 2 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-[20%] right-[15%] w-[400px] h-[400px] bg-emerald-500/3 blur-[100px] rounded-full pointer-events-none"
                />
            )}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />

            <div className={cn('w-full relative z-10 transition-all duration-700', step === 2 ? 'max-w-4xl' : 'max-w-2xl')}>
                {/* Logo & Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 sm:mb-12"
                >
                    <div className="inline-flex items-center gap-4 mb-6 group">
                        <div className="w-12 h-12 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp className="text-primary w-6 h-6" />
                        </div>
                        <span className="text-3xl font-black text-white tracking-tighter text-editorial">Founder<span className="text-gradient">CFO</span></span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight text-editorial mb-3">
                        {step === 1 ? (
                            <>Calibrating <span className="text-gradient">Intelligence</span></>
                        ) : (
                            <>Your AI CFO, <span className="text-gradient">Live</span></>
                        )}
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium uppercase tracking-[0.2em]">
                        {step === 1
                            ? 'Your AI CFO requires operational context to generate deterministic decisions.'
                            : 'Adjust the sliders to see your financial intelligence update in real time.'}
                    </p>
                </motion.div>

                {/* Progress */}
                <div className="flex gap-3 mb-8 sm:mb-12 px-2">
                    {[1, 2].map((s) => (
                        <div
                            key={s}
                            className={cn(
                                'h-1 flex-1 rounded-full transition-all duration-1000 relative overflow-hidden',
                                s <= step ? 'bg-primary/20' : 'bg-white/5',
                            )}
                        >
                            {s <= step && (
                                <motion.div
                                    className="absolute inset-0 bg-primary shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: 0 }}
                                    transition={{ duration: 0.8, ease: 'circOut' }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="glass-premium p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: 'circOut' }}
                            className="space-y-8 sm:space-y-10"
                        >
                            {/* Step Header */}
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className={cn('w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-colors duration-700', stepBgColors[step - 1])}>
                                    <StepIcon className={cn('w-6 h-6 sm:w-8 sm:h-8', stepColors[step - 1])} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="text-xl sm:text-2xl font-black text-white text-editorial tracking-tight">{stepTitles[step - 1]}</h2>
                                        <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Step {step} / {totalSteps}</span>
                                    </div>
                                    <p className="text-slate-500 text-xs sm:text-sm font-medium">{stepSubtitles[step - 1]}</p>
                                </div>
                            </div>

                            {/* ── Step 1: Company + Stage + Goal (All-in-one) ── */}
                            {step === 1 && (
                                <div className="space-y-8">
                                    {/* Company Name */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Company Name</label>
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={(e) => update('companyName', e.target.value)}
                                            placeholder="e.g. Hyperion Systems"
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                        />
                                    </div>

                                    {/* Country + Industry */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                                <Globe className="w-3.5 h-3.5" /> Country
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.country}
                                                    onChange={(e) => update('country', e.target.value)}
                                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                                                >
                                                    {countries.map((c) => (
                                                        <option key={c.value} value={c.value} className="bg-[#020617]">{c.label}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                                <Briefcase className="w-3.5 h-3.5" /> Industry
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={formData.industry}
                                                    onChange={(e) => update('industry', e.target.value)}
                                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                                                >
                                                    <option value="" className="bg-[#020617]">Select Industry</option>
                                                    {industries.map((i) => (
                                                        <option key={i} value={i} className="bg-[#020617]">{i}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stage */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Stage</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                            {stages.map((s) => (
                                                <button
                                                    key={s.value}
                                                    onClick={() => update('stage', s.value)}
                                                    className={cn(
                                                        'p-3 sm:p-4 rounded-xl text-left transition-all duration-300 relative overflow-hidden',
                                                        formData.stage === s.value
                                                            ? 'bg-primary/10 border border-primary/30'
                                                            : 'bg-white/[0.01] border border-white/5 hover:bg-white/[0.03]'
                                                    )}
                                                >
                                                    <span className={cn('text-xs font-black tracking-tight block', formData.stage === s.value ? 'text-primary' : 'text-white')}>{s.label}</span>
                                                    <span className="text-[9px] font-medium text-slate-600 leading-tight block mt-0.5">{s.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Goal */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Primary Goal</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {goals.map((g) => (
                                                <button
                                                    key={g.value}
                                                    onClick={() => update('primaryGoal', g.value)}
                                                    className={cn(
                                                        'p-4 sm:p-5 rounded-xl text-left transition-all duration-300 flex items-center gap-4 border',
                                                        formData.primaryGoal === g.value
                                                            ? 'bg-violet-500/10 border-violet-500/30'
                                                            : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                                                    )}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-lg shrink-0">
                                                        {g.icon}
                                                    </div>
                                                    <div>
                                                        <p className={cn('text-sm font-black tracking-tight', formData.primaryGoal === g.value ? 'text-violet-400' : 'text-white')}>{g.label}</p>
                                                        <p className="text-[10px] font-medium text-slate-500">{g.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: AI CFO DASHBOARD ── */}
                            {step === 2 && (
                                <div className="space-y-5 sm:space-y-6">
                                    {/* ─── Personalization Context ─── */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 }}
                                        className="flex items-center justify-between flex-wrap gap-2"
                                    >
                                        <p className="text-[11px] text-slate-400">
                                            Analyzing a <span className="text-white font-bold">{stages.find(s => s.value === formData.stage)?.label || formData.stage}</span>-stage <span className="text-white font-bold">{formData.industry || 'startup'}</span> focused on <span className="text-primary font-bold">{goals.find(g => g.value === formData.primaryGoal)?.label || 'growth'}</span>
                                        </p>
                                        <div className="flex items-center gap-3 text-[9px] text-slate-600">
                                            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> Live</span>
                                            <span>Confidence: <span className="text-slate-400 font-bold">Medium</span> (estimated)</span>
                                        </div>
                                    </motion.div>

                                    {/* ─── Metric Cards Row ─── */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {/* Runway with Gauge */}
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                            className="p-4 sm:p-5 rounded-2xl bg-white/[0.015] border border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-2 mb-3">
                                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Runway</span>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-black text-white text-editorial">
                                                {metrics.runway >= 999 ? <span className="text-emerald-400">∞</span> : <><AnimatedNumber value={metrics.runway} format="months" /><span className="text-sm font-medium text-slate-500 ml-1">mo</span></>}
                                            </div>
                                            {/* Visual Gauge */}
                                            <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <motion.div
                                                    className={cn('h-full rounded-full', metrics.risk.pct < 30 ? 'bg-rose-500' : metrics.risk.pct < 60 ? 'bg-amber-500' : 'bg-emerald-500')}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${metrics.risk.pct}%` }}
                                                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                                />
                                            </div>
                                            <div className={cn('text-[9px] font-bold mt-1', metrics.runway < 6 ? 'text-amber-400' : 'text-emerald-400/60')}>
                                                {metrics.runway >= 999 ? 'Cash positive' : metrics.runway < 6 ? 'Below safe zone' : 'Healthy'}
                                            </div>
                                        </motion.div>

                                        {/* Net Burn */}
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                            className="p-4 sm:p-5 rounded-2xl bg-white/[0.015] border border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-2 mb-3">
                                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Net Burn</span>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-black text-white text-editorial"><AnimatedNumber value={metrics.netBurn} format="inr" /></div>
                                            <div className="text-[9px] font-bold text-slate-600 mt-1.5">per month</div>
                                        </motion.div>

                                        {/* Risk Gauge */}
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                            className="p-4 sm:p-5 rounded-2xl bg-white/[0.015] border border-white/5 relative overflow-hidden group">
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertTriangle className={cn('w-3.5 h-3.5', metrics.risk.color)} />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Risk Level</span>
                                            </div>
                                            {/* Circular gauge indicator */}
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 shrink-0">
                                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                                        <motion.circle
                                                            cx="18" cy="18" r="14" fill="none"
                                                            stroke={metrics.risk.pct < 30 ? '#f43f5e' : metrics.risk.pct < 60 ? '#f59e0b' : '#10b981'}
                                                            strokeWidth="4" strokeLinecap="round"
                                                            strokeDasharray={`${metrics.risk.pct * 0.88} 88`}
                                                            initial={{ strokeDasharray: '0 88' }}
                                                            animate={{ strokeDasharray: `${metrics.risk.pct * 0.88} 88` }}
                                                            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{metrics.risk.pct}</span>
                                                </div>
                                                <p className={cn('text-[11px] font-bold leading-snug', metrics.risk.color)}>{metrics.risk.text}</p>
                                            </div>
                                        </motion.div>

                                        {/* CFO Says */}
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                            className={cn('p-4 sm:p-5 rounded-2xl border relative overflow-hidden group',
                                                metrics.recommendation.severity === 'critical' ? 'bg-rose-500/[0.03] border-rose-500/10'
                                                    : metrics.recommendation.severity === 'warning' ? 'bg-amber-500/[0.03] border-amber-500/10'
                                                        : 'bg-emerald-500/[0.03] border-emerald-500/10')}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className={cn('w-3.5 h-3.5',
                                                    metrics.recommendation.severity === 'critical' ? 'text-rose-400'
                                                        : metrics.recommendation.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400')} />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CFO Analysis</span>
                                            </div>
                                            <p className="text-[11px] sm:text-xs font-medium text-slate-300 leading-relaxed">{metrics.recommendation.text}</p>
                                        </motion.div>
                                    </div>

                                    {/* ─── What-If Scenarios ─── */}
                                    {metrics.netBurn > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                                            className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 flex items-start gap-3">
                                                <Scissors className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest mb-1">If you cut expenses 15%</p>
                                                    <p className="text-sm text-slate-300">
                                                        Save <span className="text-emerald-400 font-bold">{formatINR(metrics.whatIf.cutSaved)}/mo</span> → runway becomes <span className="text-white font-bold">{metrics.whatIf.cutRunway >= 999 ? '∞' : metrics.whatIf.cutRunway.toFixed(1)} months</span>
                                                        {metrics.whatIf.cutRunwayDelta > 0.1 && <span className="text-emerald-400 font-bold"> (+{metrics.whatIf.cutRunwayDelta.toFixed(1)} mo)</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-primary/[0.03] border border-primary/10 flex items-start gap-3">
                                                <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1">If revenue grows 20%</p>
                                                    <p className="text-sm text-slate-300">
                                                        Extra <span className="text-primary font-bold">{formatINR(metrics.whatIf.boostRevenueAmt)}/mo</span> → runway becomes <span className="text-white font-bold">{metrics.whatIf.boostRunway >= 999 ? '∞ (profitable!)' : metrics.whatIf.boostRunway.toFixed(1) + ' months'}</span>
                                                        {metrics.whatIf.monthsToBreakEven && <span className="text-primary/80 text-[11px]"> · Break-even in ~{metrics.whatIf.monthsToBreakEven} mo</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ─── Interactive Sliders ─── */}
                                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                                        className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tune Your Numbers</p>
                                            {!hasInteracted && (
                                                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                                                    className="text-[9px] font-bold text-primary uppercase tracking-widest">← Drag to explore</motion.span>
                                            )}
                                        </div>
                                        <FinanceSlider label="Monthly Revenue" value={sliderRevenue} onChange={handleSliderChange(setSliderRevenue)}
                                            min={0} max={estimates.expenseRange[1] * 3} step={10000} icon={TrendingUp} color="text-emerald-400" />
                                        <FinanceSlider label="Monthly Expenses" value={sliderExpenses} onChange={handleSliderChange(setSliderExpenses)}
                                            min={50000} max={estimates.expenseRange[1] * 2} step={10000} icon={TrendingDown} color="text-amber-400" />
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cash in Bank</span>
                                                </div>
                                                <span className="text-sm font-black text-primary tabular-nums">{formatINR(sliderCash)}</span>
                                            </div>
                                            <FinanceSlider label="" value={sliderCash} onChange={handleSliderChange(setSliderCash)}
                                                min={0} max={estimates.cashRange[1] * 2} step={100000} icon={DollarSign} color="text-primary" />
                                        </div>
                                    </motion.div>

                                    {/* ─── Quick Actions ─── */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                                        className="flex flex-wrap gap-2">
                                        {metrics.netBurn > 0 && (
                                            <button onClick={handleSubmit} disabled={isLoading}
                                                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center gap-2">
                                                <Scissors className="w-3 h-3" /> Fix my burn
                                            </button>
                                        )}
                                        {(formData.primaryGoal === 'RAISE' || metrics.runway < 12) && (
                                            <button onClick={handleSubmit} disabled={isLoading}
                                                className="px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-widest hover:bg-violet-500/20 transition-all flex items-center gap-2">
                                                <Sparkles className="w-3 h-3" /> Plan fundraising
                                            </button>
                                        )}
                                        <button onClick={handleSubmit} disabled={isLoading}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3" /> Improve runway
                                        </button>
                                    </motion.div>

                                    {/* ─── Disclaimer + Meta ─── */}
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                                        className="flex items-start gap-3 p-4 rounded-xl bg-primary/[0.03] border border-primary/10">
                                        <Shield className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Estimated based on similar {formData.stage.replace('_', '-').toLowerCase()}-stage {formData.industry?.toLowerCase() || ''} startups.
                                            <span className="text-primary/80 font-semibold"> Connect your real data for precise insights.</span>
                                        </p>
                                    </motion.div>
                                </div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest text-center"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 sm:mt-12 pt-8 sm:pt-10 border-t border-white/5">
                        <div className="flex-1">
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="flex items-center gap-3 px-4 sm:px-6 py-3 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    Previous
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex justify-end gap-3">
                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!canNext()}
                                    className="px-8 sm:px-10 py-4 rounded-2xl bg-white text-[#020617] font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] flex items-center gap-3 sm:gap-4 shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)] hover:scale-[1.05] active:scale-[0.95] disabled:opacity-10 disabled:hover:scale-100 transition-all"
                                >
                                    See My CFO
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <>
                                    {/* Secondary CTA */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="px-4 sm:px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all hidden sm:flex items-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        Continue with estimates
                                    </button>
                                    {/* Primary CTA */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                        className="px-6 sm:px-10 py-4 rounded-2xl bg-primary text-white font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-3 sm:gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50 transition-all"
                                    >
                                        {isLoading ? (
                                            <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" />
                                                Unlock your real CFO
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
