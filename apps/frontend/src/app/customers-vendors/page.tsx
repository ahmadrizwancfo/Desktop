'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateContactModal } from '@/components/modals/create-contact-modal';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
    Plus,
    Search,
    Building2,
    User,
    Phone,
    Mail,
    FileText,
    Loader2,
    Users,
    TrendingUp,
    TrendingDown,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function CustomersVendorsPage() {
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMER' | 'VENDOR'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Fetch REAL contacts from backend
    const { data: contacts, isLoading, isError } = useQuery({
        queryKey: ['contacts', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/contacts');
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    const contactList = contacts || [];

    const filteredContacts = contactList.filter((contact: any) => {
        const matchesTab = activeTab === 'ALL' || contact.type === activeTab;
        const matchesSearch = contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const stats = {
        totalCustomers: contactList.filter((c: any) => c.type === 'CUSTOMER').length,
        totalVendors: contactList.filter((c: any) => c.type === 'VENDOR').length,
    };

    return (
        <DashboardLayout>
            <CreateContactModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Customers & Vendors</h2>
                        <p className="text-slate-400 mt-1">Manage your business relationships.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Contact
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="glass-card rounded-2xl p-5 border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <Users className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customers</p>
                        </div>
                        <p className="text-3xl font-black text-white">{stats.totalCustomers}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5 border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-500/20 rounded-xl">
                                <Building2 className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendors</p>
                        </div>
                        <p className="text-3xl font-black text-white">{stats.totalVendors}</p>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2">
                        {(['ALL', 'CUSTOMER', 'VENDOR'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                    activeTab === tab
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                                )}
                            >
                                {tab === 'ALL' ? 'All Contacts' : tab === 'CUSTOMER' ? 'Customers' : 'Vendors'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-auto md:min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search contacts..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : isError ? (
                    <div className="glass-card rounded-3xl py-16 text-center border-rose-500/20">
                        <Database className="w-16 h-16 text-rose-500/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Could not load contacts</h3>
                        <p className="text-slate-400 text-sm mb-6">Ensure your backend is running and try again.</p>
                    </div>
                ) : filteredContacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContacts.map((contact: any, i: number) => (
                            <motion.div
                                key={contact.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-card rounded-3xl p-6 group hover:border-primary/20 transition-all relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                                        contact.type === 'CUSTOMER' ? "bg-emerald-500/10" : "bg-amber-500/10"
                                    )}>
                                        {contact.type === 'CUSTOMER' ? (
                                            <User className="w-6 h-6 text-emerald-500" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-amber-500" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter",
                                        contact.type === 'CUSTOMER' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {contact.type}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1">{contact.name}</h3>
                                {contact.gstin && (
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">GSTIN: {contact.gstin}</p>
                                )}

                                <div className="space-y-2 mb-4">
                                    {contact.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{contact.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-3xl py-20 text-center">
                        <Users className="w-16 h-16 text-slate-500/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No Contacts Yet</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                            Add your first customer or vendor. Contact data will be used to track receivables and payables.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Contact
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
