'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building2, Phone, Mail, FileText, Plus, Loader2, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface CreateContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ContactForm {
    name: string;
    type: 'CUSTOMER' | 'VENDOR';
    email: string;
    phone: string;
    gstin: string;
    address: string;
}

export function CreateContactModal({ isOpen, onClose }: CreateContactModalProps) {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [showSuccess, setShowSuccess] = useState(false);

    const [form, setForm] = useState<ContactForm>({
        name: '',
        type: 'CUSTOMER',
        email: '',
        phone: '',
        gstin: '',
        address: '',
    });

        mutationFn: async (data: ContactForm) => {
            const res = await apiClient.post('/contacts', data);
            return res.data;
        },
        onSuccess: () => {
            setShowSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                setForm({
                    name: '',
                    type: 'CUSTOMER',
                    email: '',
                    phone: '',
                    gstin: '',
                    address: '',
                });
            }, 1500);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(form);
    };

    const isValidGstin = (gstin: string) => {
        if (!gstin) return true; // Optional field
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                            {/* Success State */}
                            {showSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-12 text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
                                    >
                                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-white mb-2">Contact Added!</h3>
                                    <p className="text-slate-400 text-sm">
                                        {form.name} has been added to your {form.type.toLowerCase()}s.
                                    </p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl">
                                                <Plus className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">Add Contact</h2>
                                                <p className="text-xs text-slate-500">Customer or Vendor</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                        {/* Type Toggle */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, type: 'CUSTOMER' })}
                                                className={`flex-1 p-4 rounded-xl border transition-all flex items-center gap-3 ${form.type === 'CUSTOMER'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <User className="w-5 h-5" />
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Customer</p>
                                                    <p className="text-[10px] opacity-60">Revenue source</p>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, type: 'VENDOR' })}
                                                className={`flex-1 p-4 rounded-xl border transition-all flex items-center gap-3 ${form.type === 'VENDOR'
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <Building2 className="w-5 h-5" />
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Vendor</p>
                                                    <p className="text-[10px] opacity-60">Expense source</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-2 block">Business / Contact Name *</label>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                placeholder="Acme Technologies Pvt Ltd"
                                                required
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                                            />
                                        </div>

                                        {/* Email & Phone */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-400 mb-2 block">Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="email"
                                                        value={form.email}
                                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                        placeholder="accounts@acme.in"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 mb-2 block">Phone</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="tel"
                                                        value={form.phone}
                                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                        placeholder="+91 98765 43210"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* GSTIN */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-2 block">GSTIN (Optional)</label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="text"
                                                    value={form.gstin}
                                                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                                                    placeholder="29ABCDE1234F1Z5"
                                                    maxLength={15}
                                                    className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none ${isValidGstin(form.gstin) ? 'border-white/10 focus:border-primary/50' : 'border-rose-500/50'
                                                        }`}
                                                />
                                            </div>
                                            {form.gstin && !isValidGstin(form.gstin) && (
                                                <p className="text-xs text-rose-400 mt-1">Invalid GSTIN format</p>
                                            )}
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="text-xs text-slate-400 mb-2 block">Address (Optional)</label>
                                            <textarea
                                                value={form.address}
                                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                                placeholder="Full business address..."
                                                rows={2}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 resize-none"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={createMutation.isPending || !form.name || Boolean(form.gstin && !isValidGstin(form.gstin))}
                                            className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                                        >
                                            {createMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4" />
                                                    Add {form.type === 'CUSTOMER' ? 'Customer' : 'Vendor'}
                                                </>
                                            )}
                                        </button>

                                        {createMutation.isError && (
                                            <p className="text-xs text-rose-400 text-center">
                                                Failed to add contact. Please try again.
                                            </p>
                                        )}
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
