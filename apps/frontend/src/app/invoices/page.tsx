'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { InvoiceReminders, InvoiceAgingChart } from '@/components/dashboard/invoice-reminders';
import { CreateInvoiceModal } from '@/components/modals/create-invoice-modal';
import {
    Plus,
    Search,
    FileText,
    Send,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
    MessageCircle,
    Bell,
    Trash2,
    CheckCircle,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    PAID: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    PENDING: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
    OVERDUE: { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle },
    DRAFT: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: FileText },
    SENT: { color: 'text-sky-500', bg: 'bg-sky-500/10', icon: Send },
};

export default function InvoicesPage() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/invoices');
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    // Mark as Paid mutation
    const markPaid = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/invoices/${id}`, { status: 'PAID' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        },
    });

    // Delete invoice mutation
    const deleteInvoice = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/invoices/${id}`);
        },
        onSuccess: () => {
            setDeleteConfirmId(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        },
    });

    // Send Reminder mutation
    const sendReminder = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.post(`/invoices/${id}/send-reminder`, { channel: 'EMAIL' });
        },
    });

    const filteredInvoices = (invoices || []).filter((inv: any) => {
        const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
        const matchesSearch = !searchQuery ||
            inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: invoices?.length || 0,
        paid: invoices?.filter((i: any) => i.status === 'PAID').length || 0,
        pending: invoices?.filter((i: any) => i.status === 'PENDING').length || 0,
        overdue: invoices?.filter((i: any) => i.status === 'OVERDUE').length || 0,
    };

    return (
        <DashboardLayout>
            <CreateInvoiceModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmId(null)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50"
                        >
                            <div className="glass-card rounded-3xl border border-white/10 p-6 text-center">
                                <div className="w-14 h-14 mx-auto bg-rose-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="w-7 h-7 text-rose-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Delete Invoice?</h3>
                                <p className="text-sm text-slate-400 mb-6">This action cannot be undone. The invoice will be permanently removed.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteInvoice.mutate(deleteConfirmId)}
                                        disabled={deleteInvoice.isPending}
                                        className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {deleteInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Invoices</h2>
                        <p className="text-slate-400 mt-1">Create, send, and track your invoices.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Invoice
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Invoices', value: stats.total, color: 'text-white' },
                        { label: 'Paid', value: stats.paid, color: 'text-emerald-500' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-500' },
                        { label: 'Overdue', value: stats.overdue, color: 'text-rose-500' },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            <p className={cn("text-3xl font-black mt-2", stat.color)}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Filters & Search */}
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search invoices..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                {['ALL', 'PAID', 'PENDING', 'OVERDUE', 'DRAFT'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                            filterStatus === status
                                                ? "bg-primary text-white"
                                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Invoices Table */}
                        <div className="glass-card rounded-3xl overflow-hidden">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                </div>
                            ) : filteredInvoices.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4">Invoice</th>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Due Date</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInvoices.map((invoice: any, i: number) => {
                                            const statusInfo = statusConfig[invoice.status] || statusConfig.DRAFT;
                                            const StatusIcon = statusInfo.icon;

                                            return (
                                                <motion.tr
                                                    key={invoice.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <FileText className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <span className="font-bold text-white">{invoice.invoiceNumber}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">{invoice.clientName || 'Client'}</td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                                        {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase", statusInfo.bg, statusInfo.color)}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {invoice.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-white">
                                                        ₹{Number(invoice.amount).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {/* Mark as Paid (only for non-paid invoices) */}
                                                            {invoice.status !== 'PAID' && (
                                                                <button
                                                                    onClick={() => markPaid.mutate(invoice.id)}
                                                                    disabled={markPaid.isPending}
                                                                    className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-500 transition-all"
                                                                    title="Mark as Paid"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {/* Send Reminder (only for pending/overdue) */}
                                                            {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                                                                <button
                                                                    onClick={() => sendReminder.mutate(invoice.id)}
                                                                    disabled={sendReminder.isPending}
                                                                    className="p-2 hover:bg-sky-500/10 rounded-lg text-slate-400 hover:text-sky-500 transition-all"
                                                                    title="Send Reminder"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {/* Delete */}
                                                            <button
                                                                onClick={() => setDeleteConfirmId(invoice.id)}
                                                                className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                                                                title="Delete Invoice"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-20 text-center">
                                    <FileText className="w-16 h-16 text-slate-500/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">No Invoices Found</h3>
                                    <p className="text-slate-400 text-sm mb-6">Create your first invoice to get started.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Invoice
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Reminders & Aging */}
                    <div className="space-y-6">
                        <div className="glass-card rounded-3xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Bell className="w-4 h-4 text-amber-500" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Payment Reminders</h3>
                            </div>
                            <InvoiceReminders />
                        </div>

                        <div className="glass-card rounded-3xl p-6">
                            <InvoiceAgingChart />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
