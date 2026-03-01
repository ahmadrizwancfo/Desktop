'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Send,
    MessageCircle,
    Mail,
    Smartphone,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const reminderTypeConfig = {
    UPCOMING: { color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: Clock },
    DUE_TODAY: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
    OVERDUE: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle },
    CRITICAL: { color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-600/20', icon: AlertTriangle },
};

export function InvoiceReminders() {
    const queryClient = useQueryClient();

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['invoice-reminders'],
        queryFn: async () => {
            const res = await apiClient.get('/invoices/reminders');
            return res.data;
        },
    });

    const sendReminderMutation = useMutation({
        mutationFn: async ({ invoiceId, channel }: { invoiceId: string; channel: string }) => {
            const res = await apiClient.post(`/invoices/${invoiceId}/send-reminder`, { channel });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoice-reminders'] });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!reminders || reminders.length === 0) {
        return (
            <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400">All invoices are current!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reminders.map((reminder: any, i: number) => {
                const config = reminderTypeConfig[reminder.reminderType as keyof typeof reminderTypeConfig];
                const Icon = config?.icon || Clock;

                return (
                    <motion.div
                        key={reminder.invoiceId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                            "p-4 rounded-2xl border",
                            config?.bg,
                            config?.border
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className={cn("p-2 rounded-xl", config?.bg)}>
                                    <Icon className={cn("w-4 h-4", config?.color)} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">
                                            #{reminder.invoiceNumber}
                                        </span>
                                        <span className={cn(
                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                            config?.bg, config?.color
                                        )}>
                                            {reminder.reminderType.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{reminder.clientName}</p>
                                    <p className={cn("text-xs mt-1", config?.color)}>{reminder.message}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-white">
                                    ₹{reminder.amount.toLocaleString('en-IN')}
                                </p>
                                <div className="flex gap-1 mt-2">
                                    <button
                                        onClick={() => sendReminderMutation.mutate({
                                            invoiceId: reminder.invoiceId,
                                            channel: 'EMAIL'
                                        })}
                                        disabled={sendReminderMutation.isPending}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                        title="Send Email"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                        href={reminder.whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all"
                                        title="Send via WhatsApp"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

export function InvoiceAgingChart() {
    const { data: aging, isLoading } = useQuery({
        queryKey: ['invoice-aging'],
        queryFn: async () => {
            const res = await apiClient.get('/invoices/aging');
            return res.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    const buckets = [
        { key: 'current', label: 'Current', color: 'bg-emerald-500' },
        { key: 'days1to30', label: '1-30 Days', color: 'bg-amber-500' },
        { key: 'days31to60', label: '31-60 Days', color: 'bg-orange-500' },
        { key: 'days61to90', label: '61-90 Days', color: 'bg-rose-500' },
        { key: 'over90', label: '90+ Days', color: 'bg-rose-700' },
    ];

    const maxAmount = Math.max(...buckets.map(b => aging?.aging?.[b.key]?.amount || 0), 1);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Receivables Aging</h4>
                <span className="text-lg font-black text-white">
                    ₹{((aging?.totalOutstanding || 0) / 1000).toFixed(0)}K
                </span>
            </div>

            <div className="space-y-3">
                {buckets.map((bucket) => {
                    const data = aging?.aging?.[bucket.key] || { count: 0, amount: 0 };
                    const width = (data.amount / maxAmount) * 100;

                    return (
                        <div key={bucket.key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">{bucket.label}</span>
                                <span className="text-white font-bold">
                                    ₹{(data.amount / 1000).toFixed(0)}K ({data.count})
                                </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all", bucket.color)}
                                    style={{ width: `${Math.max(width, data.amount > 0 ? 5 : 0)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between text-xs">
                <span className="text-slate-500">Avg Days Outstanding</span>
                <span className="text-white font-bold">{aging?.averageDaysOutstanding || 0} days</span>
            </div>
        </div>
    );
}
