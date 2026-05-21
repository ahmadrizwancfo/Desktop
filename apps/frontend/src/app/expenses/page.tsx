'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateExpenseModal } from '@/components/modals/create-expense-modal';
import { ExpenseBreakdown } from '@/components/dashboard/expense-breakdown';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useCFOState, formatCurrency } from '@/store/cfo-state-store';
import { Receipt, TrendingDown, Filter, Download, Plus, Search, Loader2, CheckCircle2, XCircle, Lightbulb, AlertTriangle, TrendingUp, Zap, Pencil, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DecisionBadge } from '@/components/ui/decision-badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FinancialDisclaimer } from '@/components/ui/financial-disclaimer';

const INDIAN_CATEGORIES = [
    'Salary & Payroll', 'TDS Deducted', 'GST Paid', 'Marketing & Ads',
    'Rent & Utilities', 'Vendor Payments', 'Travel', 'Software & Tools',
    'Professional Fees', 'Founder Draw', 'Tax Payments', 'Others', 'Uncategorized'
];

type FilterTab = 'all' | 'needs_review' | 'uncategorized' | 'high_value';

function ExpensesContent() {
    const user = useAuthStore((state) => state.user);
    const searchParams = useSearchParams();
    const initialFilter = searchParams.get('filter');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(true);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [editNotesValue, setEditNotesValue] = useState('');
    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
    const [sessionFixes, setSessionFixes] = useState(0);

    const queryClient = useQueryClient();

    // Trigger filterTab change when params change
    useEffect(() => {
        if (initialFilter === 'needs-review') {
            setFilterTab('needs_review');
        }
    }, [initialFilter]);

    // THE ONE SOURCE: CFOState
    const { data: cfoState } = useCFOState();

    // Fetch expenses from API
    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/expenses');
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    // Fetch stats from API
    const { data: stats } = useQuery({
        queryKey: ['expenses-stats', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/expenses/stats');
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    // Mutation: force sync
    const forceSyncMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.post('/cfo-engine/sync/force');
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-stats'] });
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
            toast.success('CFO state successfully recalculated!');
            setSessionFixes(0); // Reset
        },
        onError: () => {
            toast.error('Sync failed. Try again.');
        }
    });

    // Mutation: inline category/notes edit
    const updateExpenseMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
            const res = await apiClient.patch(`/expenses/${id}`, data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-stats'] });
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
            toast.success('Transaction updated. Refreshing analysis...');
            setEditingCategoryId(null);
            setEditingNotesId(null);
            
            // Set temporary highlight
            setHighlightedRowId(variables.id);
            setTimeout(() => setHighlightedRowId(null), 2500);

            // Increment session fixes if verifying or categorizing
            if (variables.data?.metadata?.status === 'VERIFIED' || variables.data?.status === 'VERIFIED') {
                setSessionFixes(prev => {
                    const newVal = prev + 1;
                    if (newVal >= 3) {
                        toast.success('Outstanding! You have verified 3+ items. Let\'s sync your new CFO State!', {
                            action: {
                                label: 'Re-calculate CFO',
                                onClick: () => forceSyncMutation.mutate()
                            },
                            duration: 8000
                        });
                    }
                    return newVal;
                });
            }
        },
        onError: () => {
            toast.error('Failed to update. Try again.');
        }
    });

    // Filter expenses by search term + filter tab
    const filteredExpenses = expenses?.filter((expense: any) => {
        const vendor = (expense.metadata as any)?.vendor || '';
        const description = expense.description || '';
        const category = expense.category || '';
        const status = (expense.metadata as any)?.status || 'PENDING';
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = vendor.toLowerCase().includes(searchLower) ||
            description.toLowerCase().includes(searchLower) ||
            category.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        switch (filterTab) {
            case 'needs_review': return status === 'PENDING';
            case 'uncategorized': return !category || category === 'Uncategorized' || category === 'Others';
            case 'high_value': return Number(expense.amount) >= 50000;
            default: return true;
        }
    }) || [];

    const localFormatCurrency = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)}L`;
        }
        return `₹${(amount / 1000).toFixed(1)}K`;
    };

    const pendingCount = expenses?.filter((e: any) => (e.metadata as any)?.status === 'PENDING').length || 0;

    // Brain insights: real data from CFOState
    const brainInsights = cfoState?.insights?.filter(i =>
        i.type === 'DIAGNOSTIC' || i.type === 'ACTION'
    ).slice(0, 4) || [];

    // Category breakdown with runway impact from CFOState
    const categoryImpacts = cfoState?.categoryBreakdown?.slice(0, 5) || [];

    return (
        <DashboardLayout>
            <CreateExpenseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

            <div className="flex flex-col gap-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Expenses</h1>
                        <p className="text-slate-400 mt-1">Track, categorize, and verify your business expenses</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-3 bg-primary hover:bg-indigo-600 text-white font-bold rounded-2xl flex items-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Expense
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'This Month', value: stats?.thisMonth ? localFormatCurrency(stats.thisMonth) : '₹0', change: '+12%', negative: true },
                        { label: 'Pending Review', value: stats?.pendingReview ? localFormatCurrency(stats.pendingReview) : '₹0', change: `${pendingCount} items`, neutral: true },
                        { label: 'Top Category', value: stats?.topCategory || 'SaaS', change: `${stats?.topCategoryPercent || 35}%`, neutral: true },
                        { label: 'TDS Deductible', value: stats?.tdsLiability ? localFormatCurrency(stats.tdsLiability) : '₹0', change: 'Due Feb 7', negative: true },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card rounded-2xl p-5"
                        >
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{stat.label}</p>
                            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                            <p className={`text-xs mt-1 ${stat.negative ? 'text-rose-400' : stat.neutral ? 'text-slate-400' : 'text-emerald-400'}`}>
                                {stat.change}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Expense Table */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filters & Search */}
                        <div className="flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search expenses..."
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                />
                            </div>
                            <button className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2">
                            {[
                                { key: 'all' as FilterTab, label: 'All', count: expenses?.length || 0 },
                                { key: 'needs_review' as FilterTab, label: 'Needs Review', count: expenses?.filter((e: any) => (e.metadata as any)?.status === 'PENDING').length || 0 },
                                { key: 'uncategorized' as FilterTab, label: 'Uncategorized', count: expenses?.filter((e: any) => !e.category || e.category === 'Uncategorized' || e.category === 'Others').length || 0 },
                                { key: 'high_value' as FilterTab, label: 'High Value (>₹50K)', count: expenses?.filter((e: any) => Number(e.amount) >= 50000).length || 0 },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilterTab(tab.key)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        filterTab === tab.key
                                            ? "bg-primary/20 text-primary border border-primary/30"
                                            : "bg-white/5 text-slate-500 border border-white/10 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {tab.label}
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-md",
                                        filterTab === tab.key ? "bg-primary/30" : "bg-white/5"
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Expenses Table */}
                        <div className="glass-card rounded-3xl overflow-x-auto custom-scrollbar">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                </div>
                            ) : filteredExpenses.length > 0 ? (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Vendor</th>
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Category</th>
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Notes</th>
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Amount</th>
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Date</th>
                                            <th className="text-left p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Status</th>
                                            <th className="text-right p-4 text-xs text-slate-500 uppercase tracking-widest font-bold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredExpenses.map((expense: any, i: number) => {
                                            const metadata = expense.metadata as any || {};
                                            const status = metadata.status || 'PENDING';

                                            return (
                                                <motion.tr
                                                    key={expense.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={cn(
                                                        "border-b border-white/5 hover:bg-white/5 transition-colors",
                                                        highlightedRowId === expense.id && "bg-emerald-500/10 border-emerald-500/30 animate-pulse"
                                                    )}
                                                >
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <Receipt className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <span className="font-bold text-white">{metadata.vendor || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {editingCategoryId === expense.id ? (
                                                            <select
                                                                defaultValue={expense.category || 'Uncategorized'}
                                                                onChange={(e) => {
                                                                    updateExpenseMutation.mutate({ id: expense.id, data: { category: e.target.value } });
                                                                }}
                                                                onBlur={() => setEditingCategoryId(null)}
                                                                autoFocus
                                                                className="bg-slate-800 border border-primary/30 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                                                            >
                                                                {INDIAN_CATEGORIES.map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingCategoryId(expense.id)}
                                                                className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors group"
                                                            >
                                                                {expense.category || 'Uncategorized'}
                                                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {editingNotesId === expense.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={editNotesValue}
                                                                    onChange={(e) => setEditNotesValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            updateExpenseMutation.mutate({ id: expense.id, data: { notes: editNotesValue } });
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                    className="bg-slate-800 border border-primary/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary min-w-[120px]"
                                                                />
                                                                <button
                                                                    onClick={() => updateExpenseMutation.mutate({ id: expense.id, data: { notes: editNotesValue } })}
                                                                    className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingNotesId(expense.id);
                                                                    setEditNotesValue(metadata.notes || expense.description || '');
                                                                }}
                                                                className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors group text-left max-w-[150px] truncate"
                                                            >
                                                                <span className="truncate">{metadata.notes || expense.description || <span className="text-slate-600 italic">Add note...</span>}</span>
                                                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-bold text-white">₹{Number(expense.amount).toLocaleString('en-IN')}</td>
                                                    <td className="p-4 text-slate-400">{new Date(expense.date).toLocaleDateString('en-IN')}</td>
                                                    <td className="p-4">
                                                        <DecisionBadge
                                                            decision={status === 'VERIFIED' ? 'yes' : 'pending'}
                                                            label={status}
                                                            size="sm"
                                                        />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {status === 'PENDING' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => updateExpenseMutation.mutate({ id: expense.id, data: { metadata: { ...metadata, status: 'VERIFIED' } } })}
                                                                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                                        title="Verify"
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors" title="Reject">
                                                                        <XCircle className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-20 text-center">
                                    <Receipt className="w-16 h-16 text-slate-500/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">No Expenses Found</h3>
                                    <p className="text-slate-400 text-sm mb-6">Add your first expense to get started.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Expense
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Breakdown + REAL Brain Insights */}
                    <div className="space-y-6">
                        {/* Expense Breakdown */}
                        <ExpenseBreakdown />

                        {/* ── Category Runway Impact (from CFOState) ───────── */}
                        {categoryImpacts.length > 0 && (
                            <div className="glass-card rounded-3xl p-6 border-rose-500/10 bg-rose-500/[0.03]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-rose-500/20 rounded-xl">
                                        <Zap className="w-5 h-5 text-rose-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Runway Impact</h4>
                                </div>
                                <div className="space-y-2">
                                    {categoryImpacts.map((cat) => (
                                        <div key={cat.category} className="p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-white">{cat.category}</span>
                                                <span className="text-xs font-bold text-slate-400">{formatCurrency(cat.amount)}/mo</span>
                                            </div>
                                            {cat.runwayImpactDays > 0 && (
                                                <p className="text-[10px] text-emerald-400 font-bold">
                                                    Cutting 30% = +{cat.runwayImpactDays} days runway
                                                    {cat.cutPotential > 0 && <span className="text-slate-500 font-medium"> (saves {formatCurrency(cat.cutPotential)}/mo)</span>}
                                                </p>
                                            )}
                                            {cat.trend === 'up' && cat.changePercent && (
                                                <p className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                                                    <TrendingUp className="w-2.5 h-2.5" /> +{cat.changePercent}% vs last month
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── REAL AI Insights (from CFOState.insights) ────── */}
                        <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <Lightbulb className="w-5 h-5 text-primary" />
                                </div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest">AI Insights</h4>
                            </div>
                            <div className="space-y-3">
                                {brainInsights.length > 0 ? (
                                    brainInsights.map((insight, i) => (
                                        <div key={i} className={cn(
                                            "p-3 rounded-xl border",
                                            insight.severity === 'critical' ? "bg-rose-500/10 border-rose-500/20" :
                                            insight.severity === 'high' ? "bg-amber-500/10 border-amber-500/20" :
                                            "bg-white/5 border-white/5"
                                        )}>
                                            <div className="flex items-start gap-2">
                                                {insight.severity === 'critical' || insight.severity === 'high' ? (
                                                    <AlertTriangle className={cn("w-3 h-3 mt-0.5 flex-shrink-0",
                                                        insight.severity === 'critical' ? "text-rose-400" : "text-amber-400"
                                                    )} />
                                                ) : (
                                                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                                                )}
                                                <div>
                                                    <p className="text-xs font-bold text-white">{insight.title}</p>
                                                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{insight.body}</p>
                                                    {insight.metric && (
                                                        <span className="text-[10px] font-bold text-primary mt-1 inline-block">{insight.metric}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                        <p className="text-xs text-slate-300">
                                            💡 Connect more data sources to unlock AI-powered expense insights.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Professional CA Disclaimer */}
                <FinancialDisclaimer />
            </div>
        </DashboardLayout>
    );
}

export default function ExpensesPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary animate-pulse" />
                </div>
            </DashboardLayout>
        }>
            <ExpensesContent />
        </Suspense>
    );
}

