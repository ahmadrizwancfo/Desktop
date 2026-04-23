'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Building, Calendar, DollarSign, Loader2, Tag } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EXPENSE_CATEGORIES = [
    'Professional Fees',
    'Rent',
    'SaaS Subscriptions',
    'Marketing & Advertising',
    'Salary & Wages',
    'Contractor',
    'Utilities',
    'Travel & Conveyance',
    'Office Supplies',
    'Legal',
    'Auditor',
    'Bank Charges',
    'Other'
];

export function CreateExpenseModal({ isOpen, onClose }: CreateExpenseModalProps) {
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        vendor: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        tdsApplicable: false,
    });

    const [error, setError] = useState('');

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiClient.post('/expenses', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
            onClose();
            setFormData({
                vendor: '',
                category: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                tdsApplicable: false,
            });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create expense');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.vendor || !formData.amount || !formData.category) {
            setError('Please fill in all required fields');
            return;
        }

        // Calculate TDS if applicable (10% for professional fees, 2% for contractors, etc.)
        let tdsAmount = 0;
        const amount = parseFloat(formData.amount);
        if (formData.tdsApplicable) {
            if (['Professional Fees', 'Legal', 'Auditor'].includes(formData.category)) {
                tdsAmount = amount * 0.10; // 10% TDS for professional services
            } else if (formData.category === 'Contractor') {
                tdsAmount = amount * 0.02; // 2% TDS for contractors
            } else if (formData.category === 'Rent') {
                tdsAmount = amount * 0.10; // 10% TDS for rent
            }
        }

        createMutation.mutate({
            amount,
            category: formData.category,
            description: formData.description,
            vendor: formData.vendor,
            date: formData.date,
            status: 'PENDING',
            tdsApplicable: formData.tdsApplicable,
            tdsAmount,
            gstAmount: amount * 0.18, // 18% GST
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                        <Receipt className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Add Expense</h2>
                                        <p className="text-sm text-slate-400">Record a new business expense</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendor / Payee *</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            name="vendor"
                                            value={formData.vendor}
                                            onChange={handleChange}
                                            placeholder="AWS, WeWork, Infosys..."
                                            required
                                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category *</label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-900">Select category</option>
                                                {EXPENSE_CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount (₹) *</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="25000"
                                            required
                                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Monthly cloud hosting bill..."
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 px-4 text-sm text-white outline-none resize-none"
                                    />
                                </div>

                                {/* TDS Checkbox */}
                                <label className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="tdsApplicable"
                                        checked={formData.tdsApplicable}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-amber-400">TDS Applicable</span>
                                        <p className="text-xs text-slate-500 mt-0.5">Check if TDS should be deducted at source</p>
                                    </div>
                                </label>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Adding...
                                            </>
                                        ) : (
                                            'Add Expense'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
