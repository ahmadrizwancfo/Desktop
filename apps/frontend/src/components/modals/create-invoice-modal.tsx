'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, User, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        clientName: '',
        clientEmail: '',
        amount: '',
        tax: '',
        dueDate: '',
        description: '',
    });

    const [error, setError] = useState('');

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiClient.post('/invoices', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            onClose();
            setFormData({
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                clientName: '',
                clientEmail: '',
                amount: '',
                tax: '',
                dueDate: '',
                description: '',
            });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create invoice');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.clientName || !formData.amount || !formData.dueDate) {
            setError('Please fill in all required fields');
            return;
        }

        createMutation.mutate({
            invoiceNumber: formData.invoiceNumber,
            amount: parseFloat(formData.amount),
            tax: formData.tax ? parseFloat(formData.tax) : parseFloat(formData.amount) * 0.18,
            dueDate: new Date(formData.dueDate).toISOString(),
            organizationId: user?.organizationId,
            status: 'DRAFT',
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Create Invoice</h2>
                                        <p className="text-sm text-slate-400">Generate a new invoice</p>
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice #</label>
                                        <input
                                            type="text"
                                            name="invoiceNumber"
                                            value={formData.invoiceNumber}
                                            onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 px-4 text-sm text-white outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Date *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="date"
                                                name="dueDate"
                                                value={formData.dueDate}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            name="clientName"
                                            value={formData.clientName}
                                            onChange={handleChange}
                                            placeholder="Acme Corp Pvt Ltd"
                                            required
                                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount (₹) *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="number"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder="50000"
                                                required
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GST (18% auto)</label>
                                        <input
                                            type="number"
                                            name="tax"
                                            value={formData.tax || (formData.amount ? (parseFloat(formData.amount) * 0.18).toFixed(0) : '')}
                                            onChange={handleChange}
                                            placeholder="Auto-calculated"
                                            className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 px-4 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Services rendered for Q1 2026..."
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl py-3 px-4 text-sm text-white outline-none resize-none"
                                    />
                                </div>

                                {/* Total */}
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Total Amount</span>
                                    <span className="text-2xl font-bold text-primary">
                                        ₹{formData.amount ? (parseFloat(formData.amount) + (formData.tax ? parseFloat(formData.tax) : parseFloat(formData.amount) * 0.18)).toLocaleString('en-IN') : '0'}
                                    </span>
                                </div>

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
                                        className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Invoice'
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
