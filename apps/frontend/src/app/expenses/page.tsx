'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateExpenseModal } from '@/components/modals/create-expense-modal';
import { ExpenseBreakdown } from '@/components/dashboard/expense-breakdown';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Receipt, TrendingDown, Filter, Download, Plus, Search, Loader2, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { DecisionBadge } from '@/components/ui/decision-badge';

export default function ExpensesPage() {
    const user = useAuthStore((state) => state.user);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(true);

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

    // Filter expenses by search term
    const filteredExpenses = expenses?.filter((expense: any) => {
        const vendor = (expense.metadata as any)?.vendor || '';
        const description = expense.description || '';
        const category = expense.category || '';
        const searchLower = searchTerm.toLowerCase();
        return vendor.toLowerCase().includes(searchLower) ||
            description.toLowerCase().includes(searchLower) ||
            category.toLowerCase().includes(searchLower);
    }) || [];

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)}L`;
        }
        return `₹${(amount / 1000).toFixed(1)}K`;
    };

    const pendingCount = expenses?.filter((e: any) => (e.metadata as any)?.status === 'PENDING').length || 0;

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
                        { label: 'This Month', value: stats?.thisMonth ? formatCurrency(stats.thisMonth) : '₹0', change: '+12%', negative: true },
                        { label: 'Pending Review', value: stats?.pendingReview ? formatCurrency(stats.pendingReview) : '₹0', change: `${pendingCount} items`, neutral: true },
                        { label: 'Top Category', value: stats?.topCategory || 'SaaS', change: `${stats?.topCategoryPercent || 35}%`, neutral: true },
                        { label: 'TDS Deductible', value: stats?.tdsLiability ? formatCurrency(stats.tdsLiability) : '₹0', change: 'Due Feb 7', negative: true },
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
                                <Filter className="w-4 h-4" />
                                Filter
                            </button>
                            <button className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>

                        {/* Expenses Table */}
                        <div className="glass-card rounded-3xl overflow-hidden">
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
                                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <Receipt className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <span className="font-bold text-white">{metadata.vendor || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-400">{expense.category}</td>
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
                                                                    <button className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Verify">
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

                    {/* Right: Breakdown + Insights */}
                    <div className="space-y-6">
                        {/* Expense Breakdown */}
                        <ExpenseBreakdown />

                        {/* AI Insights */}
                        <div className="glass-card rounded-3xl p-6 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <Lightbulb className="w-5 h-5 text-primary" />
                                </div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest">AI Insights</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        💡 <strong>SaaS Optimization:</strong> Your subscriptions increased 23% this quarter. Review Figma and Notion seats.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        🔍 <strong>TDS Alert:</strong> ₹15K TDS to be filed by Feb 7th for contractor payments.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-xs text-slate-300">
                                        📊 <strong>Trend:</strong> Travel expenses up 125% - tag as one-time if for client visits.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

