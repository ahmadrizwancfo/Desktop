'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { BreakEvenCalculator } from '@/components/simulator/break-even-calculator';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Users, CreditCard, Megaphone, DollarSign,
    Save, RotateCcw, AlertTriangle, Lightbulb, Loader2, Zap, Shield,
    Clock, ArrowRight, Check, X, ChevronRight, BarChart3, Layers, BrainCircuit
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { decodeActionPayload, type ActionPayload } from '@/store/cfo-state-store';

interface SimulationResult {
    currentCash: number;
    monthlyRevenue: number;
    payrollCost: number;
    totalMonthlyBurn: number;
    netBurn: number;
    runway: number;
    runwayMonths: string;
    forecast: { month: string; baseline: number; optimistic: number; conservative: number }[];
    impacts: {
        headcount: { perUnit: number; runwayImpact: number };
        saasSpend: { perUnit: number; runwayImpact: number };
        marketing: { perUnit: number; runwayImpact: number };
        revenue: { perUnit: number; runwayImpact: number };
    };
    insights: { type: string; message: string }[];
}

interface PresetScenario {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    changes: Partial<SimulatorValues>;
    category: 'growth' | 'cut' | 'revenue' | 'strategic';
}

interface SimulatorValues {
    headcount: number;
    avgSalary: number;
    saasSpend: number;
    marketingSpend: number;
    otherExpenses: number;
    monthlyRevenue: number;
    currentCash: number;
}

interface SavedScenario {
    id: string;
    organizationId: string;
    name: string;
    headcount: number;
    monthlySalary: number;
    saasSpend: number;
    marketingSpend: number;
    monthlyRevenue: number;
    currentCash: number;
    projectedBurn: number;
    projectedRunway: number;
    createdAt: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
    {
        id: 'hire-2-engineers',
        name: 'Hire 2 Engineers',
        description: 'Add 2 engineers at avg salary',
        icon: <Users className="w-4 h-4" />,
        changes: { headcount: 2 }, // Will add to current
        category: 'growth',
    },
    {
        id: 'double-marketing',
        name: 'Double Ads',
        description: '2x marketing for growth',
        icon: <Megaphone className="w-4 h-4" />,
        changes: { marketingSpend: 2 }, // Multiplier
        category: 'growth',
    },
    {
        id: 'cut-saas-25',
        name: 'Cut SaaS 25%',
        description: 'Reduce tool subscriptions',
        icon: <CreditCard className="w-4 h-4" />,
        changes: { saasSpend: 0.75 }, // Multiplier
        category: 'cut',
    },
    {
        id: 'cut-marketing-50',
        name: 'Cut Marketing 50%',
        description: 'Reduce ad spend by half',
        icon: <Megaphone className="w-4 h-4" />,
        changes: { marketingSpend: 0.5 }, // Multiplier
        category: 'cut',
    },
    {
        id: 'price-increase-10',
        name: '+10% Pricing',
        description: 'Raise prices across board',
        icon: <DollarSign className="w-4 h-4" />,
        changes: { monthlyRevenue: 1.1 }, // Multiplier
        category: 'revenue',
    },
    {
        id: 'grow-revenue-20',
        name: '+20% MRR',
        description: 'New customer acquisition',
        icon: <TrendingUp className="w-4 h-4" />,
        changes: { monthlyRevenue: 1.2 }, // Multiplier
        category: 'revenue',
    },
    {
        id: 'survival-mode',
        name: 'Survival Mode',
        description: 'Cut all non-essential',
        icon: <Shield className="w-4 h-4" />,
        changes: { saasSpend: 0.5, marketingSpend: 0.25 }, // Multipliers
        category: 'strategic',
    },
    {
        id: 'raise-bridge',
        name: 'Raise ₹50L Bridge',
        description: 'Quick bridge funding',
        icon: <Zap className="w-4 h-4" />,
        changes: { currentCash: 5000000 }, // Add to current
        category: 'strategic',
    },
    // ── Startup-Specific Scenarios ──────────────────────
    {
        id: 'revenue-15-mom',
        name: 'Revenue +15% MoM',
        description: 'What if revenue grows 15% monthly?',
        icon: <TrendingUp className="w-4 h-4" />,
        changes: { monthlyRevenue: 1.15 },
        category: 'revenue',
    },
    {
        id: 'raise-5cr',
        name: 'Raise ₹5 Cr',
        description: 'Fundraise at Series A',
        icon: <DollarSign className="w-4 h-4" />,
        changes: { currentCash: 50000000 },
        category: 'strategic',
    },
    {
        id: 'cac-doubles',
        name: 'CAC Doubles',
        description: 'What if acquisition costs 2x?',
        icon: <Megaphone className="w-4 h-4" />,
        changes: { marketingSpend: 2 },
        category: 'growth',
    },
    {
        id: 'lose-top-client',
        name: 'Lose Top Client',
        description: 'Largest client churns (-30%)',
        icon: <AlertTriangle className="w-4 h-4" />,
        changes: { monthlyRevenue: 0.7 },
        category: 'cut',
    },
];

export default function SimulatorPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        }>
            <SimulatorContent />
        </Suspense>
    );
}

function SimulatorContent() {
    const user = useAuthStore((state) => state.user);
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'simulator' | 'breakeven'>('simulator');
    const [activeScenarioTab, setActiveScenarioTab] = useState<'presets' | 'saved'>('presets');
    const [loadedFromDashboard, setLoadedFromDashboard] = useState<string | null>(null);

    const { data: savedScenarios, refetch: refetchScenarios } = useQuery({
        queryKey: ['scenarios'],
        queryFn: async () => {
            const res = await apiClient.get('/simulator/scenarios');
            return res.data as SavedScenario[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/simulator/scenarios/${id}`);
        },
        onSuccess: () => refetchScenarios()
    });

    // Baseline values
    const [baseline, setBaseline] = useState<SimulatorValues>({
        headcount: 5,
        avgSalary: 100000,
        saasSpend: 50000,
        marketingSpend: 80000,
        otherExpenses: 50000,
        monthlyRevenue: 200000,
        currentCash: 2000000,
    });

    // Current values
    const [values, setValues] = useState<SimulatorValues>({ ...baseline });
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(null);
    const [scenarioName, setScenarioName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
    const [showComparison, setShowComparison] = useState(false);

    // Fetch baseline
    const { data: baselineData } = useQuery({
        queryKey: ['simulator-baseline', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/simulator/baseline');
            return res.data as SimulatorValues;
        },
        enabled: !!user?.organizationId,
    });

    useEffect(() => {
        if (baselineData) {
            setBaseline(baselineData);
            setValues(baselineData);
        }
    }, [baselineData]);

    // ── ACTION PAYLOAD: read from ?action= param (sent by Dashboard) ─────
    useEffect(() => {
        const actionParam = searchParams.get('action');
        if (!actionParam || !baselineData) return;

        const payload = decodeActionPayload(actionParam);
        if (!payload) return;

        const newValues = { ...baselineData };

        if (payload.type === 'simulate_cost_cut' && payload.preloadedScenario) {
            const ps = payload.preloadedScenario;
            if (ps.saasSpend !== undefined) newValues.saasSpend = ps.saasSpend;
            if (ps.marketingSpend !== undefined) newValues.marketingSpend = ps.marketingSpend;
            if (ps.targetReduction && !ps.saasSpend && !ps.marketingSpend) {
                // Apply generic cut: reduce marketing by 50%, SaaS by 30%
                newValues.marketingSpend = Math.round(newValues.marketingSpend * 0.5);
                newValues.saasSpend = Math.round(newValues.saasSpend * 0.7);
            }
            setLoadedFromDashboard('Cost Reduction — loaded from Dashboard recommendation');
        }

        if (payload.type === 'simulate_fundraise' && payload.preloadedScenario) {
            if (payload.preloadedScenario.currentCash) {
                newValues.currentCash = newValues.currentCash + payload.preloadedScenario.currentCash;
            }
            setLoadedFromDashboard('Fundraise Scenario — loaded from Dashboard recommendation');
        }

        if (payload.type === 'simulate_growth' && payload.preloadedScenario) {
            if (payload.preloadedScenario.monthlyRevenue) {
                newValues.monthlyRevenue = payload.preloadedScenario.monthlyRevenue;
            }
            setLoadedFromDashboard('Growth Scenario — loaded from Dashboard recommendation');
        }

        setValues(newValues);
    }, [searchParams, baselineData]);

    // Calculate mutation
    const calculateMutation = useMutation({
        mutationFn: async (data: SimulatorValues) => {
            const res = await apiClient.post('/simulator/calculate', data);
            return res.data as SimulationResult;
        },
        onSuccess: (data) => {
            setResult(data);
        }
    });

    // Calculate baseline for comparison
    const calculateBaselineMutation = useMutation({
        mutationFn: async (data: SimulatorValues) => {
            const res = await apiClient.post('/simulator/calculate', data);
            return res.data as SimulationResult;
        },
        onSuccess: (data) => {
            setBaselineResult(data);
        }
    });

    // Save scenario
    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post('/simulator/scenarios', {
                name: scenarioName,
                headcount: values.headcount,
                avgSalary: values.avgSalary,
                saasSpend: values.saasSpend,
                marketingSpend: values.marketingSpend,
                monthlyRevenue: values.monthlyRevenue,
                currentCash: values.currentCash,
            });
            return res.data;
        },
        onSuccess: () => {
            setShowSaveDialog(false);
            setScenarioName('');
            refetchScenarios();
            setActiveScenarioTab('saved');
        }
    });

    // Debounced calculation
    const calculate = useCallback((newValues: SimulatorValues) => {
        calculateMutation.mutate(newValues);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => calculate(values), 300);
        return () => clearTimeout(timer);
    }, [values, calculate]);

    // Initial calculations
    useEffect(() => {
        calculate(values);
        calculateBaselineMutation.mutate(baseline);
    }, []);

    const handleSliderChange = (key: keyof SimulatorValues, value: number) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const resetToBaseline = () => {
        setValues({ ...baseline });
        setActiveScenarios(new Set());
    };

    const applyScenario = (scenario: PresetScenario) => {
        const newActive = new Set(activeScenarios);

        if (newActive.has(scenario.id)) {
            // Remove scenario
            newActive.delete(scenario.id);
            setActiveScenarios(newActive);
            // Recalculate from baseline with remaining scenarios
            let newValues = { ...baseline };
            PRESET_SCENARIOS.filter(s => newActive.has(s.id)).forEach(s => {
                newValues = applyScenarioChanges(newValues, s);
            });
            setValues(newValues);
        } else {
            // Add scenario
            newActive.add(scenario.id);
            setActiveScenarios(newActive);
            setValues(prev => applyScenarioChanges(prev, scenario));
        }
    };

    const applyScenarioChanges = (current: SimulatorValues, scenario: PresetScenario): SimulatorValues => {
        const result = { ...current };

        for (const [key, value] of Object.entries(scenario.changes)) {
            const k = key as keyof SimulatorValues;
            if (k === 'headcount') {
                result.headcount = current.headcount + (value as number);
            } else if (k === 'currentCash') {
                result.currentCash = current.currentCash + (value as number);
            } else if (typeof value === 'number') {
                // Treat as multiplier
                result[k] = Math.round(current[k] * value);
            }
        }

        return result;
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
        return `₹${amount}`;
    };

    const getRiskLabel = (runway: number): { label: string; color: string; bgColor: string } => {
        if (runway < 6) return { label: 'DANGEROUS', color: 'text-rose-400', bgColor: 'bg-rose-500/20' };
        if (runway < 9) return { label: 'CAUTION', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
        if (runway < 12) return { label: 'SAFE', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
        return { label: 'HEALTHY', color: 'text-sky-400', bgColor: 'bg-sky-500/20' };
    };

    const getRunwayColor = (runway: number) => {
        if (runway < 6) return 'text-rose-500';
        if (runway < 12) return 'text-amber-500';
        return 'text-emerald-500';
    };

    const getRunwayBg = (runway: number) => {
        if (runway < 6) return 'bg-rose-500';
        if (runway < 12) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    // Cash projection for 6 months
    const getCashProjection = () => {
        const months = [];
        let cash = values.currentCash;
        const netBurn = result?.netBurn || 0;

        for (let i = 0; i <= 6; i++) {
            months.push({
                month: i === 0 ? 'Now' : `M${i}`,
                cash: Math.max(0, cash),
                baselineCash: Math.max(0, baseline.currentCash - (baselineResult?.netBurn || 0) * i),
            });
            cash -= netBurn;
        }
        return months;
    };

    const runwayDelta = (result?.runway || 0) - (baselineResult?.runway || 0);
    const riskInfo = getRiskLabel(result?.runway || 0);

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* ── LOADED FROM DASHBOARD BANNER ────────────────────────── */}
                {loadedFromDashboard && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/30"
                    >
                        <BrainCircuit className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white">{loadedFromDashboard}</p>
                            <p className="text-xs text-slate-400">Sliders have been adjusted based on your financial data. Tweak and explore.</p>
                        </div>
                        <button
                            onClick={() => { setLoadedFromDashboard(null); resetToBaseline(); }}
                            className="text-xs text-slate-500 hover:text-white transition-colors font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
                        >
                            Reset
                        </button>
                    </motion.div>
                )}
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
                                <Layers className="w-6 h-6 text-white" />
                            </div>
                            Startup Scenario Simulator
                        </h1>
                        <p className="text-slate-400 mt-2">Model scenarios, see risk impact, calculate break-even — what happens if?</p>
                    </div>

                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'simulator' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                            )}
                        >
                            Simulator
                        </button>
                        <button
                            onClick={() => setActiveTab('breakeven')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'breakeven' ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                            )}
                        >
                            Break-Even
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {activeTab === 'simulator' && (
                            <>
                                <button
                                    onClick={() => setShowComparison(!showComparison)}
                                    className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${showComparison
                                        ? 'bg-primary text-white'
                                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Compare
                                </button>
                                <button
                                    onClick={resetToBaseline}
                                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowSaveDialog(true)}
                                    className="px-4 py-2.5 bg-primary rounded-xl text-white font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    Save
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {activeTab === 'breakeven' ? (
                    <BreakEvenCalculator />
                ) : (
                    <>
                        {/* Scenario Manager */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scenarios</h2>
                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setActiveScenarioTab('presets')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                            activeScenarioTab === 'presets' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        Presets
                                    </button>
                                    <button
                                        onClick={() => setActiveScenarioTab('saved')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                            activeScenarioTab === 'saved' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        My Scenarios
                                    </button>
                                </div>
                            </div>

                            {activeScenarioTab === 'presets' ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                    {PRESET_SCENARIOS.map((scenario) => {
                                        const isActive = activeScenarios.has(scenario.id);
                                        const categoryColors = {
                                            growth: 'border-sky-500/30 hover:bg-sky-500/10',
                                            cut: 'border-emerald-500/30 hover:bg-emerald-500/10',
                                            revenue: 'border-amber-500/30 hover:bg-amber-500/10',
                                            strategic: 'border-purple-500/30 hover:bg-purple-500/10',
                                        };

                                        return (
                                            <motion.button
                                                key={scenario.id}
                                                onClick={() => applyScenario(scenario)}
                                                whileTap={{ scale: 0.95 }}
                                                className={`p-3 rounded-xl border transition-all text-left ${isActive
                                                    ? 'bg-primary/20 border-primary'
                                                    : `bg-white/5 ${categoryColors[scenario.category]}`
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'
                                                    }`}>
                                                    {scenario.icon}
                                                </div>
                                                <p className="text-xs font-bold text-white truncate">{scenario.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{scenario.description}</p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {savedScenarios?.map((scenario) => (
                                        <motion.div
                                            key={scenario.id}
                                            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group relative"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Are you sure you want to delete this scenario?')) {
                                                            deleteMutation.mutate(scenario.id);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <h3 className="font-bold text-white text-sm truncate">{scenario.name}</h3>
                                            <div className="flex justify-between items-end mt-2">
                                                <div>
                                                    <p className="text-[10px] text-slate-500">Runway</p>
                                                    <p className="text-xs font-bold text-white">{scenario.projectedRunway >= 999 ? 'Profit' : `${scenario.projectedRunway.toFixed(1)}mo`}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-500">{new Date(scenario.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setValues({
                                                        headcount: scenario.headcount,
                                                        avgSalary: scenario.monthlySalary,
                                                        saasSpend: scenario.saasSpend,
                                                        marketingSpend: scenario.marketingSpend,
                                                        otherExpenses: values.otherExpenses,
                                                        monthlyRevenue: scenario.monthlyRevenue,
                                                        currentCash: scenario.currentCash,
                                                    });
                                                    setActiveScenarios(new Set());
                                                }}
                                                className="w-full mt-3 py-1.5 bg-white/5 hover:bg-primary hover:text-white text-slate-400 text-xs font-bold rounded-lg transition-all"
                                            >
                                                Load Scenario
                                            </button>
                                        </motion.div>
                                    ))}
                                    {(!savedScenarios || savedScenarios.length === 0) && (
                                        <div className="col-span-full py-8 text-center text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
                                            No saved scenarios found. Save your current simulation to see it here.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Sliders Column */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="glass-card rounded-3xl p-8">
                                    <h2 className="text-lg font-bold text-white mb-6">Fine-tune Variables</h2>

                                    <div className="space-y-8">
                                        {/* Headcount Slider */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-sky-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">Team Size</p>
                                                        <p className="text-xs text-slate-500">@ {formatCurrency(values.avgSalary)}/mo per person</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-white">{values.headcount}</span>
                                                    <span className="text-slate-500 ml-1">people</span>
                                                    {values.headcount !== baseline.headcount && (
                                                        <span className={`ml-2 text-sm font-bold ${values.headcount > baseline.headcount ? 'text-sky-400' : 'text-emerald-400'}`}>
                                                            ({values.headcount > baseline.headcount ? '+' : ''}{values.headcount - baseline.headcount})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="50"
                                                value={values.headcount}
                                                onChange={(e) => handleSliderChange('headcount', parseInt(e.target.value))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                            />
                                        </div>

                                        {/* SaaS Slider */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                                        <CreditCard className="w-5 h-5 text-purple-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">SaaS & Tools</p>
                                                        <p className="text-xs text-slate-500">Monthly subscriptions</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-white">{formatCurrency(values.saasSpend)}</span>
                                                    {values.saasSpend !== baseline.saasSpend && (
                                                        <span className={`ml-2 text-sm font-bold ${values.saasSpend > baseline.saasSpend ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            ({values.saasSpend < baseline.saasSpend ? '-' : '+'}{formatCurrency(Math.abs(values.saasSpend - baseline.saasSpend))})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="500000"
                                                step="5000"
                                                value={values.saasSpend}
                                                onChange={(e) => handleSliderChange('saasSpend', parseInt(e.target.value))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>

                                        {/* Marketing Slider */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                                        <Megaphone className="w-5 h-5 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">Marketing</p>
                                                        <p className="text-xs text-slate-500">Ads, content, events</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-white">{formatCurrency(values.marketingSpend)}</span>
                                                    {values.marketingSpend !== baseline.marketingSpend && (
                                                        <span className={`ml-2 text-sm font-bold ${values.marketingSpend > baseline.marketingSpend ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                            ({values.marketingSpend < baseline.marketingSpend ? '-' : '+'}{formatCurrency(Math.abs(values.marketingSpend - baseline.marketingSpend))})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1000000"
                                                step="10000"
                                                value={values.marketingSpend}
                                                onChange={(e) => handleSliderChange('marketingSpend', parseInt(e.target.value))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                            />
                                        </div>

                                        {/* Revenue Slider */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">Monthly Revenue</p>
                                                        <p className="text-xs text-slate-500">MRR projection</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-white">{formatCurrency(values.monthlyRevenue)}</span>
                                                    {values.monthlyRevenue !== baseline.monthlyRevenue && (
                                                        <span className={`ml-2 text-sm font-bold ${values.monthlyRevenue > baseline.monthlyRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            ({values.monthlyRevenue > baseline.monthlyRevenue ? '+' : ''}{formatCurrency(values.monthlyRevenue - baseline.monthlyRevenue)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5000000"
                                                step="25000"
                                                value={values.monthlyRevenue}
                                                onChange={(e) => handleSliderChange('monthlyRevenue', parseInt(e.target.value))}
                                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 12-Month Forecast Graph with Confidence Bands */}
                                <div className="glass-card rounded-3xl p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">12-Month Cash Forecast</h3>
                                    <div className="h-48 flex items-end gap-2 relative">
                                        {result?.forecast?.map((point, i) => {
                                            const maxCash = Math.max(values.currentCash * 1.5, baseline.currentCash * 1.5); // Add buffer
                                            const height = Math.min((point.optimistic / maxCash) * 100, 100);
                                            const baseHeight = Math.min((point.baseline / maxCash) * 100, 100);
                                            const consHeight = Math.min((point.conservative / maxCash) * 100, 100);

                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 p-2 bg-slate-900 border border-white/10 rounded-lg text-xs whitespace-nowrap shadow-xl">
                                                        <p className="text-emerald-400">Optimistic: {formatCurrency(point.optimistic)}</p>
                                                        <p className="text-slate-300">Baseline: {formatCurrency(point.baseline)}</p>
                                                        <p className="text-rose-400">Conservative: {formatCurrency(point.conservative)}</p>
                                                    </div>

                                                    <div className="w-full h-full flex items-end justify-center relative">
                                                        {/* Range (Band) */}
                                                        <div
                                                            className="absolute w-full bg-white/5 rounded-t-sm"
                                                            style={{
                                                                height: `${height}%`,
                                                                bottom: 0
                                                            }}
                                                        />

                                                        {/* Baseline point (line approximation) */}
                                                        <div
                                                            className="absolute w-1.5 bg-primary rounded-full z-10"
                                                            style={{
                                                                height: '4px',
                                                                bottom: `${baseHeight}%`
                                                            }}
                                                        />

                                                        {/* Conservative point */}
                                                        <div
                                                            className="absolute w-full bg-rose-500/10 rounded-t-sm"
                                                            style={{
                                                                height: `${consHeight}%`,
                                                                bottom: 0
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] text-slate-500">{point.month}</span>
                                                </div>
                                            );
                                        })}

                                        {!result?.forecast && (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                                                Loading forecast...
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-4 justify-center mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                            <span className="text-xs text-slate-400">Baseline</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-white/20" />
                                            <span className="text-xs text-slate-400">Range (Optimistic - Conservative)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insights */}
                                {result?.insights && result.insights.length > 0 && (
                                    <div className="glass-card rounded-3xl p-6 border-amber-500/20 border">
                                        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                            <Lightbulb className="w-4 h-4" />
                                            AI Insights
                                        </h3>
                                        <div className="space-y-3">
                                            {result.insights.map((insight, i) => (
                                                <div
                                                    key={i}
                                                    className={`p-4 rounded-xl flex items-start gap-3 ${insight.type === 'critical' ? 'bg-rose-500/10 border border-rose-500/20' :
                                                        insight.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                                                            'bg-sky-500/10 border border-sky-500/20'
                                                        }`}
                                                >
                                                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${insight.type === 'critical' ? 'text-rose-500' :
                                                        insight.type === 'warning' ? 'text-amber-500' : 'text-sky-500'
                                                        }`} />
                                                    <p className="text-sm text-white">{insight.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Results Column */}
                            <div className="space-y-6">
                                {/* Main Runway Card with Risk Label */}
                                <motion.div
                                    className="glass-card rounded-3xl p-8 relative overflow-hidden"
                                    initial={{ scale: 1 }}
                                    animate={{ scale: calculateMutation.isPending ? 0.98 : 1 }}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl" />

                                    {/* Risk Label */}
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${riskInfo.bgColor} mb-4`}>
                                        {riskInfo.label === 'DANGEROUS' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                                        {riskInfo.label === 'CAUTION' && <Clock className="w-4 h-4 text-amber-400" />}
                                        {riskInfo.label === 'SAFE' && <Shield className="w-4 h-4 text-emerald-400" />}
                                        {riskInfo.label === 'HEALTHY' && <Check className="w-4 h-4 text-sky-400" />}
                                        <span className={`text-xs font-black uppercase ${riskInfo.color}`}>{riskInfo.label}</span>
                                    </div>

                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Projected Runway</p>

                                    <div className="mt-2 mb-4 flex items-baseline gap-3">
                                        <span className={`text-5xl font-black ${getRunwayColor(result?.runway || 0)}`}>
                                            {result?.runwayMonths || '---'}
                                        </span>
                                        {runwayDelta !== 0 && (
                                            <span className={`text-lg font-bold flex items-center gap-1 ${runwayDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {runwayDelta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {runwayDelta > 0 ? '+' : ''}{runwayDelta.toFixed(1)}mo
                                            </span>
                                        )}
                                    </div>

                                    {/* Runway Bar */}
                                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-6">
                                        <motion.div
                                            className={`h-full ${getRunwayBg(result?.runway || 0)} rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((result?.runway || 0) / 24 * 100, 100)}%` }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Net Burn</p>
                                            <p className="text-xl font-bold text-white">{formatCurrency(result?.netBurn || 0)}</p>
                                            {(result?.netBurn || 0) !== (baselineResult?.netBurn || 0) && (
                                                <p className={`text-xs font-bold ${(result?.netBurn || 0) < (baselineResult?.netBurn || 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {(result?.netBurn || 0) < (baselineResult?.netBurn || 0) ? '-' : '+'}
                                                    {formatCurrency(Math.abs((result?.netBurn || 0) - (baselineResult?.netBurn || 0)))}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase">Cash</p>
                                            <p className="text-xl font-bold text-white">{formatCurrency(values.currentCash)}</p>
                                        </div>
                                    </div>

                                    {calculateMutation.isPending && (
                                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                </motion.div>

                                {/* Burn Breakdown */}
                                <div className="glass-card rounded-3xl p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Burn Breakdown</h3>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Payroll', value: result?.payrollCost || 0, color: 'bg-sky-500' },
                                            { label: 'SaaS', value: values.saasSpend, color: 'bg-purple-500' },
                                            { label: 'Marketing', value: values.marketingSpend, color: 'bg-rose-500' },
                                            { label: 'Other', value: values.otherExpenses, color: 'bg-slate-500' },
                                        ].map((item, i) => {
                                            const total = result?.totalMonthlyBurn || 1;
                                            const percent = Math.round((item.value / total) * 100);
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-400">{item.label}</span>
                                                        <span className="text-white font-bold">{formatCurrency(item.value)} ({percent}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Startup Metrics — Valuation, Hiring, Profit */}
                                <div className="glass-card rounded-3xl p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Startup Metrics</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Implied Valuation</p>
                                                <p className="text-[10px] text-slate-600">10x ARR (SaaS standard)</p>
                                            </div>
                                            <p className="text-lg font-bold text-primary">
                                                {formatCurrency((values.monthlyRevenue * 12) * 10)}
                                            </p>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Hiring Capacity</p>
                                                <p className="text-[10px] text-slate-600">Affordable hires at current avg salary</p>
                                            </div>
                                            <p className="text-lg font-bold text-sky-400">
                                                {values.avgSalary > 0 ? Math.floor((result?.netBurn || 0) < 0 ? Math.abs(result?.netBurn || 0) / values.avgSalary : 0) : 0}
                                                <span className="text-xs text-slate-500 ml-1">people</span>
                                            </p>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase">Months to Profit</p>
                                                <p className="text-[10px] text-slate-600">When revenue {'>'} expenses</p>
                                            </div>
                                            {(() => {
                                                const netBurn = result?.netBurn || 0;
                                                if (netBurn <= 0) return <p className="text-lg font-bold text-emerald-400">Profitable ✓</p>;
                                                const revGap = netBurn;
                                                // Assume 10% MoM growth to close gap
                                                const growthRate = 0.10;
                                                let months = 0;
                                                let rev = values.monthlyRevenue;
                                                const totalExpenses = result?.totalMonthlyBurn || values.monthlyRevenue + netBurn;
                                                while (rev < totalExpenses && months < 60) {
                                                    rev *= (1 + growthRate);
                                                    months++;
                                                }
                                                return (
                                                    <p className={`text-lg font-bold ${months < 12 ? 'text-emerald-400' : months < 24 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {months >= 60 ? '60+' : months}
                                                        <span className="text-xs text-slate-500 ml-1">months</span>
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Scenarios */}
                                {activeScenarios.size > 0 && (
                                    <div className="glass-card rounded-3xl p-6">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Active Scenarios</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(activeScenarios).map(id => {
                                                const scenario = PRESET_SCENARIOS.find(s => s.id === id);
                                                if (!scenario) return null;
                                                return (
                                                    <span
                                                        key={id}
                                                        className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center gap-2"
                                                    >
                                                        {scenario.name}
                                                        <button onClick={() => applyScenario(scenario)} className="hover:text-white">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Save Dialog */}
            <AnimatePresence>
                {showSaveDialog && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card rounded-3xl p-8 w-full max-w-md"
                        >
                            <h2 className="text-xl font-bold text-white mb-4">Save Scenario</h2>
                            <input
                                type="text"
                                value={scenarioName}
                                onChange={(e) => setScenarioName(e.target.value)}
                                placeholder="e.g., Aggressive Growth, Survival Mode..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 mb-6"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSaveDialog(false)}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!scenarioName || saveMutation.isPending}
                                    className="flex-1 py-3 bg-primary rounded-xl text-white font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
