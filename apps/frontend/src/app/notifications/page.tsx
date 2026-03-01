'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    Info,
    Clock,
    Check,
    Trash2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const typeConfig = {
    SUCCESS: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    WARNING: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ERROR: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    INFO: { icon: Info, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    REMINDER: { icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
};

export default function NotificationsPage() {
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications');
            return res.data;
        },
    });

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const deleteNotification = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/notifications/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllRead = useMutation({
        mutationFn: async () => {
            await apiClient.post('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Notifications</h1>
                        <p className="text-slate-400 mt-1">Stay updated with your financial alerts.</p>
                    </div>
                    {notifications?.length > 0 && (
                        <button
                            onClick={() => markAllRead.mutate()}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Mark all read
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : notifications?.length === 0 ? (
                    <div className="text-center py-12 glass-card rounded-3xl">
                        <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white">All caught up!</h3>
                        <p className="text-slate-400 mt-1">You have no new notifications.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {notifications?.map((notif: any) => {
                                const config = typeConfig[notif.type as keyof typeof typeConfig] || typeConfig.INFO;
                                const Icon = config.icon;

                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all group relative overflow-hidden",
                                            notif.read
                                                ? "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"
                                                : "glass-card border-primary/20 bg-primary/[0.02]"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", config.bg, config.color)}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h4 className={cn("font-bold text-sm", notif.read ? "text-slate-300" : "text-white")}>
                                                            {notif.title}
                                                        </h4>
                                                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                                                        {new Date(notif.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notif.read && (
                                                    <button
                                                        onClick={() => markAsRead.mutate(notif.id)}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteNotification.mutate(notif.id)}
                                                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
