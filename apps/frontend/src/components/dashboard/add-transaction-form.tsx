'use client';

import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

interface AddTransactionFormProps {
    bankAccountId?: string;
    onSuccess?: () => void;
}

export function AddTransactionForm({ bankAccountId, onSuccess }: AddTransactionFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        amount: '',
        type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0], // Today's date
    });

    const categories = {
        INCOME: ['Sales', 'Investment', 'Interest', 'Refund', 'Other Income'],
        EXPENSE: ['Salary', 'Rent', 'Utilities', 'Marketing', 'Software', 'Server', 'Travel', 'Other'],
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // If no bankAccountId provided, we need to fetch one
            let targetBankAccountId = bankAccountId;

            if (!targetBankAccountId) {
                // Get first bank account for the user's org
                const accounts = await apiClient.get('/bank-accounts');
                if (accounts.data?.length > 0) {
                    targetBankAccountId = accounts.data[0].id;
                } else {
                    throw new Error('No bank account found. Please add a bank account first.');
                }
            }

            await apiClient.post('/transactions', {
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
                description: formData.description,
                date: new Date(formData.date).toISOString(),
                bankAccountId: targetBankAccountId,
            });

            // Reset form
            setFormData({
                amount: '',
                type: 'EXPENSE',
                category: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
            });
            setIsOpen(false);

            // Refresh dashboard data
            queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
            onSuccess?.();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to add transaction');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-primary font-bold"
            >
                <Plus className="w-5 h-5" />
                Add Transaction
            </button>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-6 border border-primary/20">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Add Transaction</h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Type Toggle */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'INCOME', category: '' })}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${formData.type === 'INCOME'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Income
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: '' })}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${formData.type === 'EXPENSE'
                                ? 'bg-red-500 text-white'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        Expense
                    </button>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                    <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Category</label>
                    <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    >
                        <option value="" className="bg-slate-900">Select category</option>
                        {categories[formData.type].map((cat) => (
                            <option key={cat} value={cat} className="bg-slate-900">
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                </div>

                {/* Description (optional) */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., AWS Monthly Bill"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Add {formData.type === 'INCOME' ? 'Income' : 'Expense'}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
