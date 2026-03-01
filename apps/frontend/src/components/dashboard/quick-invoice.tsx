'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, Send, Loader2, Check, IndianRupee } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface QuickInvoiceForm {
    customerName: string;
    amount: string;
    description: string;
    dueInDays: string;
}

export function QuickInvoice() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState<QuickInvoiceForm>({
        customerName: '',
        amount: '',
        description: '',
        dueInDays: '30',
    });

    const createMutation = useMutation({
        mutationFn: async (data: QuickInvoiceForm) => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + parseInt(data.dueInDays));

            const res = await apiClient.post('/invoices', {
                customerName: data.customerName,
                amount: parseFloat(data.amount),
                description: data.description,
                dueDate: dueDate.toISOString(),
                status: 'DRAFT',
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
                setForm({ customerName: '', amount: '', description: '', dueInDays: '30' });
            }, 1500);
        }
    });

    const formatCurrency = (amount: string) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return '';
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
        if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
        return `₹${num}`;
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/20 hover:border-primary/40 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                        <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-white">Quick Invoice</p>
                        <p className="text-[10px] text-slate-500">Create in 30 seconds</p>
                    </div>
                </div>
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                        >
                            <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                                {/* Success overlay */}
                                <AnimatePresence>
                                    {success && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center z-10"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                                    <Check className="w-8 h-8 text-emerald-400" />
                                                </div>
                                                <p className="text-lg font-bold text-white">Invoice Created!</p>
                                                <p className="text-sm text-slate-400">{formatCurrency(form.amount)} to {form.customerName}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Quick Invoice</h2>
                                            <p className="text-xs text-slate-500">Send in seconds</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                                    {/* Customer Name */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Customer / Company *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.customerName}
                                            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                                            placeholder="Acme Corp"
                                            required
                                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Amount (₹) *
                                        </label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="number"
                                                value={form.amount}
                                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                                placeholder="50000"
                                                required
                                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                            />
                                            {form.amount && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-primary font-bold">
                                                    {formatCurrency(form.amount)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="Professional services - January 2026"
                                            className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                                        />
                                    </div>

                                    {/* Due Date */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            Payment Due
                                        </label>
                                        <div className="flex gap-2 mt-1">
                                            {['7', '15', '30', '45'].map((days) => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, dueInDays: days })}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.dueInDays === days
                                                            ? 'bg-primary text-white'
                                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {days} days
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    {form.customerName && form.amount && (
                                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                            <p className="text-xs text-slate-400">
                                                Invoice <span className="text-white font-bold">{formatCurrency(form.amount)}</span> to{' '}
                                                <span className="text-white font-bold">{form.customerName}</span>, due in{' '}
                                                <span className="text-primary font-bold">{form.dueInDays} days</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!form.customerName || !form.amount || createMutation.isPending}
                                            className="flex-1 py-3 bg-primary rounded-xl text-white font-bold hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {createMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Create Invoice
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
