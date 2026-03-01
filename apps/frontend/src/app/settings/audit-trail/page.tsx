'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    FileEdit,
    UserCircle,
    Clock,
    Filter,
    Search,
    ChevronDown,
    Calendar,
    Database,
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLogEntry {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: any;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

// Mock data when API is unavailable
const mockAuditLogs: AuditLogEntry[] = [
    {
        id: '1',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'INV-2024-001',
        details: { amount: 125000, customer: 'Acme Technologies' },
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: { id: '1', name: 'Nishant Mahapatro', email: 'nishant@foundercfo.in' }
    },
    {
        id: '2',
        action: 'UPDATE',
        entity: 'Expense',
        entityId: 'EXP-2024-045',
        details: { field: 'status', oldValue: 'PENDING', newValue: 'APPROVED' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        user: { id: '2', name: 'Finance Team', email: 'finance@foundercfo.in' }
    },
    {
        id: '3',
        action: 'DELETE',
        entity: 'Transaction',
        entityId: 'TXN-2024-089',
        details: { reason: 'Duplicate entry', amount: 5000 },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        user: { id: '1', name: 'Nishant Mahapatro', email: 'nishant@foundercfo.in' }
    },
    {
        id: '4',
        action: 'CREATE',
        entity: 'Customer',
        entityId: 'CUST-2024-012',
        details: { name: 'CloudServe India', gstin: '29ABCDE1234F1Z5' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        user: { id: '1', name: 'Nishant Mahapatro', email: 'nishant@foundercfo.in' }
    },
    {
        id: '5',
        action: 'UPDATE',
        entity: 'Organization',
        entityId: 'ORG-001',
        details: { field: 'bankAccount', change: 'Added HDFC account' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        user: { id: '1', name: 'Nishant Mahapatro', email: 'nishant@foundercfo.in' }
    },
    {
        id: '6',
        action: 'COMPLIANCE',
        entity: 'ComplianceItem',
        entityId: 'COMP-GST-DEC',
        details: { type: 'GSTR-3B', status: 'Filed', period: 'Dec 2024' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        user: { id: '2', name: 'Finance Team', email: 'finance@foundercfo.in' }
    }
];

const actionConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    CREATE: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Created' },
    UPDATE: { icon: FileEdit, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Updated' },
    DELETE: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Deleted' },
    COMPLIANCE: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Compliance' },
};

const entityConfig: Record<string, { color: string }> = {
    Invoice: { color: 'text-emerald-400' },
    Expense: { color: 'text-rose-400' },
    Transaction: { color: 'text-blue-400' },
    Customer: { color: 'text-amber-400' },
    Organization: { color: 'text-purple-400' },
    ComplianceItem: { color: 'text-indigo-400' },
};

export default function AuditTrailPage() {
    const [selectedEntity, setSelectedEntity] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Try to fetch from API, fallback to mock
    const { data: auditLogs, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: async () => {
            try {
                const res = await apiClient.get('/audit-logs');
                return res.data;
            } catch {
                return mockAuditLogs;
            }
        },
        staleTime: 30000
    });

    const logs = auditLogs || mockAuditLogs;

    // Filter logs
    const filteredLogs = logs.filter((log: AuditLogEntry) => {
        const matchesEntity = selectedEntity === 'all' || log.entity === selectedEntity;
        const matchesAction = selectedAction === 'all' || log.action === selectedAction;
        const matchesSearch = searchQuery === '' ||
            log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.entity.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesEntity && matchesAction && matchesSearch;
    });

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const uniqueEntities = Array.from(new Set(logs.map((l: AuditLogEntry) => l.entity))) as string[];

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Audit Trail</h1>
                        <p className="text-slate-400 mt-1">Complete history of every change in your financial data.</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-500 font-bold">Data Integrity Protected</span>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary/20 rounded-xl">
                                <History className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{logs.length}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Total Changes</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{logs.filter((l: AuditLogEntry) => l.action === 'CREATE').length}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Created</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <FileEdit className="w-5 h-5 text-blue-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{logs.filter((l: AuditLogEntry) => l.action === 'UPDATE').length}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Updated</p>
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-rose-500/20 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-rose-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{logs.filter((l: AuditLogEntry) => l.action === 'DELETE').length}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Deleted</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by entity ID, user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <select
                        value={selectedEntity}
                        onChange={(e) => setSelectedEntity(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50"
                    >
                        <option value="all">All Entities</option>
                        {uniqueEntities.map(entity => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50"
                    >
                        <option value="all">All Actions</option>
                        <option value="CREATE">Created</option>
                        <option value="UPDATE">Updated</option>
                        <option value="DELETE">Deleted</option>
                        <option value="COMPLIANCE">Compliance</option>
                    </select>
                </div>

                {/* Timeline */}
                <div className="glass-card rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold text-white text-sm uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Activity Timeline
                        </h3>
                    </div>

                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No audit logs match your filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredLogs.map((log: AuditLogEntry, index: number) => {
                                const config = actionConfig[log.action] || actionConfig.UPDATE;
                                const Icon = config.icon;
                                const entityColor = entityConfig[log.entity]?.color || 'text-slate-400';

                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-6 hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-3 rounded-2xl", config.bg)}>
                                                <Icon className={cn("w-5 h-5", config.color)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn("font-bold text-sm", config.color)}>
                                                        {config.label}
                                                    </span>
                                                    <span className={cn("font-bold text-sm", entityColor)}>
                                                        {log.entity}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {log.entityId}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <UserCircle className="w-3 h-3" />
                                                    <span>{log.user.name}</span>
                                                    <span>•</span>
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTimeAgo(log.createdAt)}</span>
                                                </div>
                                                {log.details && (
                                                    <div className="mt-2 p-2 rounded-lg bg-white/5 text-xs text-slate-400 font-mono overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="hidden group-hover:flex items-center gap-2">
                                                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
