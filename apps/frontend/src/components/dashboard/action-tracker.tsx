'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, Clock, AlertTriangle, Plus, X, Loader2, TrendingUp, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface ActionItem {
    id: string;
    title: string;
    description?: string;
    assignee: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'DISMISSED';
    expectedImpact: number;
    actualImpact?: number;
    dueDate?: string;
    completedAt?: string;
    sourceInsight?: string;
}

interface CreateActionForm {
    title: string;
    description: string;
    assignee: string;
    expectedImpact: string;
    dueDate: string;
    sourceInsight?: string;
}

const ASSIGNEES = ['FOUNDER', 'OPS', 'ACCOUNTANT'];

export function ActionTracker() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [actualImpact, setActualImpact] = useState('');

    const [form, setForm] = useState<CreateActionForm>({
        title: '',
        description: '',
        assignee: 'FOUNDER',
        expectedImpact: '',
        dueDate: '',
    });

    // Fetch actions
    const { data: actions, isLoading } = useQuery({
        queryKey: ['actions', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/actions');
            return res.data as ActionItem[];
        },
        enabled: !!user?.organizationId,
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['actions-stats', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/actions/stats');
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    // Create action
    const createMutation = useMutation({
        mutationFn: async (data: CreateActionForm) => {
            const res = await apiClient.post('/actions', {
                ...data,
                expectedImpact: parseFloat(data.expectedImpact) || 0,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['actions'] });
            queryClient.invalidateQueries({ queryKey: ['actions-stats'] });
            setShowCreateModal(false);
            setForm({ title: '', description: '', assignee: 'FOUNDER', expectedImpact: '', dueDate: '' });
        }
    });

    // Update action status
    const updateMutation = useMutation({
        mutationFn: async ({ id, status, actualImpact }: { id: string; status: string; actualImpact?: number }) => {
            const res = await apiClient.patch(`/actions/${id}`, { status, actualImpact });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['actions'] });
            queryClient.invalidateQueries({ queryKey: ['actions-stats'] });
            setCompletingId(null);
            setActualImpact('');
        }
    });

    const openActions = actions?.filter(a => a.status === 'OPEN' || a.status === 'IN_PROGRESS') || [];
    const doneActions = actions?.filter(a => a.status === 'DONE').slice(0, 3) || [];

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    const handleComplete = (id: string) => {
        if (completingId === id) {
            updateMutation.mutate({
                id,
                status: 'DONE',
                actualImpact: parseFloat(actualImpact) || 0
            });
        } else {
            setCompletingId(id);
        }
    };

    return (
        <div className="glass-card rounded-3xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-white">Action Tracker</h2>
                    <p className="text-xs text-slate-500">Turn insights into tracked outcomes</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                >
                    <Plus className="w-4 h-4 text-primary" />
                </button>
            </div>

            {/* Impact Score */}
            {stats && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Monthly Impact</span>
                        <span className="text-xs text-slate-500">{stats.impactHitRate || 0}% hit rate</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-400">{formatCurrency(stats.actualImpact || 0)}</span>
                        <span className="text-sm text-slate-500">/ {formatCurrency(stats.expectedImpact || 0)} target</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(stats.impactHitRate || 0, 100)}%` }}
                        />
                    </div>

                    {/* Hit Rate History Mini Chart */}
                    <div className="mt-4 pt-4 border-t border-emerald-500/10">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Hit Rate Trend (Last 6 Months)</p>
                        <div className="flex items-end gap-1 h-8">
                            {[65, 72, 68, 75, 80, stats.impactHitRate || 78].map((rate, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-t transition-all ${i === 5 ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                    style={{ height: `${rate}%` }}
                                    title={`${['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][i]}: ${rate}%`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[8px] text-slate-600">Sep</span>
                            <span className="text-[8px] text-emerald-400">Feb</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Actions */}
            <div className="space-y-3 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Open Actions ({openActions.length})</p>
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : openActions.length > 0 ? (
                    openActions.map(action => (
                        <motion.div
                            key={action.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => handleComplete(action.id)}
                                    className="mt-0.5"
                                >
                                    {completingId === action.id ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-500 hover:text-primary transition-colors" />
                                    )}
                                </button>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">{action.title}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {action.assignee}
                                        </span>
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {formatCurrency(action.expectedImpact)}/mo
                                        </span>
                                        {action.dueDate && (
                                            <span className="text-amber-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(action.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>

                                    {/* Completing form */}
                                    <AnimatePresence>
                                        {completingId === action.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-3 overflow-hidden"
                                            >
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={actualImpact}
                                                        onChange={(e) => setActualImpact(e.target.value)}
                                                        placeholder="Actual savings (₹)"
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                                    />
                                                    <button
                                                        onClick={() => handleComplete(action.id)}
                                                        disabled={updateMutation.isPending}
                                                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                                                    >
                                                        {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Done'}
                                                    </button>
                                                    <button
                                                        onClick={() => setCompletingId(null)}
                                                        className="px-2 py-1.5 text-slate-400 hover:text-white"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No open actions. Create one!</p>
                )}
            </div>

            {/* Completed Actions */}
            {doneActions.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Recently Completed</p>
                    {doneActions.map(action => (
                        <div key={action.id} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm text-white line-through opacity-70">{action.title}</span>
                            </div>
                            <p className="text-xs text-emerald-400 mt-1 ml-6">
                                Saved {formatCurrency(action.actualImpact || 0)}/mo
                                {action.actualImpact && action.expectedImpact && (
                                    <span className="text-slate-500 ml-2">
                                        ({Math.round((action.actualImpact / action.expectedImpact) * 100)}% of target)
                                    </span>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-card rounded-3xl p-8 border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">New Action</h2>
                                    <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title *</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            placeholder="Review SaaS subscriptions..."
                                            required
                                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assignee</label>
                                            <select
                                                value={form.assignee}
                                                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 appearance-none"
                                            >
                                                {ASSIGNEES.map(a => (
                                                    <option key={a} value={a} className="bg-slate-900">{a}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expected Impact (₹)</label>
                                            <input
                                                type="number"
                                                value={form.expectedImpact}
                                                onChange={(e) => setForm({ ...form, expectedImpact: e.target.value })}
                                                placeholder="25000"
                                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Due Date</label>
                                        <input
                                            type="date"
                                            value={form.dueDate}
                                            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!form.title || createMutation.isPending}
                                            className="flex-1 py-3 bg-primary rounded-xl text-white font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
