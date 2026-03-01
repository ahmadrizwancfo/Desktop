'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useQuery } from '@tanstack/react-query';
import { complianceService } from '@/services/compliance-service';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    Info,
    Calendar,
    ArrowRight,
    RefreshCw,
    ExternalLink,
    Wrench,
    UserPlus,
    Download,
    X,
    Mail,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ComplianceTask {
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    category: string;
    dueDate?: string;
}

// CTA Action Modal
function ActionModal({
    isOpen,
    onClose,
    task,
    action
}: {
    isOpen: boolean;
    onClose: () => void;
    task: ComplianceTask | null;
    action: 'fix' | 'assign' | 'download' | null;
}) {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    if (!isOpen || !task || !action) return null;

    const handleAssign = async () => {
        setSending(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));
        setSending(false);
        onClose();
    };

    const handleDownload = () => {
        // Simulate document download
        const link = document.createElement('a');
        link.href = '#';
        link.download = `${task.title.replace(/\s+/g, '_')}_docs.pdf`;
        // In real implementation, this would be a proper file URL
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                    >
                        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        action === 'fix' && "bg-emerald-500/20",
                                        action === 'assign' && "bg-blue-500/20",
                                        action === 'download' && "bg-purple-500/20"
                                    )}>
                                        {action === 'fix' && <Wrench className="w-5 h-5 text-emerald-500" />}
                                        {action === 'assign' && <UserPlus className="w-5 h-5 text-blue-500" />}
                                        {action === 'download' && <Download className="w-5 h-5 text-purple-500" />}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            {action === 'fix' && 'Fix Now'}
                                            {action === 'assign' && 'Assign to CA'}
                                            {action === 'download' && 'Download Documents'}
                                        </h2>
                                        <p className="text-xs text-slate-500">{task.title}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6">
                                {action === 'fix' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-300">
                                            This will redirect you to the official portal to complete this filing.
                                        </p>
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <p className="text-xs text-amber-400">
                                                ⚠️ Ensure you have all required documents ready before proceeding.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => window.open('https://www.gst.gov.in/', '_blank')}
                                            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open GST Portal
                                        </button>
                                    </div>
                                )}

                                {action === 'assign' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-2 block">CA Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="ca@firm.com"
                                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            We'll send the task details and relevant documents to your CA.
                                        </p>
                                        <button
                                            onClick={handleAssign}
                                            disabled={!email || sending}
                                            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                                        >
                                            {sending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            {sending ? 'Sending...' : 'Send to CA'}
                                        </button>
                                    </div>
                                )}

                                {action === 'download' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {['GSTR-1 Summary', 'GSTR-3B Form', 'ITC Report', 'Challan'].map((doc) => (
                                                <button
                                                    key={doc}
                                                    onClick={handleDownload}
                                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
                                                >
                                                    <FileText className="w-5 h-5 text-purple-400 mb-2" />
                                                    <p className="text-xs text-white font-medium">{doc}</p>
                                                    <p className="text-[10px] text-slate-500">PDF</p>
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleDownload}
                                            className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download All
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default function CompliancePage() {
    const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);
    const [modalAction, setModalAction] = useState<'fix' | 'assign' | 'download' | null>(null);

    const { data: status, isLoading, isError } = useQuery({
        queryKey: ['compliance-status'],
        queryFn: complianceService.getStatus,
        retry: 1
    });

    const openActionModal = (task: ComplianceTask, action: 'fix' | 'assign' | 'download') => {
        setSelectedTask(task);
        setModalAction(action);
    };

    const closeActionModal = () => {
        setSelectedTask(null);
        setModalAction(null);
    };

    const { data: gstData, isLoading: isGstLoading, refetch: refetchGst } = useQuery({
        queryKey: ['gst-returns'],
        queryFn: async () => {
            const res = await apiClient.get('/integrations/gst/returns', {
                params: { gstin: '29ABCDE1234F1Z5', period: '2024-12' }
            });
            return res.data;
        }
    });

    if (isLoading) return (
        <DashboardLayout>
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    );

    if (isError) return (
        <DashboardLayout>
            <div className="p-8 glass-card rounded-3xl border-rose-500/20 text-center">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white">Failed to load compliance data</h2>
                <p className="text-slate-400 mt-2">Please ensure your backend is running and try again.</p>
            </div>
        </DashboardLayout>
    );

    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col gap-8">
                    <header>
                        <h1 className="text-3xl font-bold text-white">Compliance Roadmap</h1>
                        <p className="text-slate-400 mt-1">Real-time statutory health check for your organization.</p>
                    </header>

                    {/* Mandatory Disclaimer for Sandbox/Integration */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Sandbox Mode Active</h4>
                            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
                                GST data is currently sourced from sandbox environment or mock providers. Final filing must be completed via authorized GST portals or registered professionals. Do not use this data for actual statutory filings.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Main Content Area */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Health Score Card */}
                                <div className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-primary" />
                                    <div className="w-28 h-28 rounded-full border-8 border-emerald-500/10 flex items-center justify-center relative mb-6">
                                        <div className="text-3xl font-black text-white">{status?.score ?? 0}%</div>
                                        {status?.score && (
                                            <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent animate-spin-slow" />
                                        )}
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Health Score</h3>
                                </div>

                                {/* Next Action */}
                                <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border-primary/20 bg-primary/5">
                                    <div className="p-3 bg-primary/20 rounded-2xl w-fit">
                                        <Calendar className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Upcoming Filing</p>
                                        <p className="text-xl font-bold text-white">{gstData?.gstr3b?.dueDate ? new Date(gstData.gstr3b.dueDate).toLocaleDateString() : 'Loading...'}</p>
                                        <p className="text-xs text-slate-400 mt-1">GSTR-3B (Dec)</p>
                                    </div>
                                </div>

                                {/* Status Indicator */}
                                <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border-emerald-500/20 bg-emerald-500/5">
                                    <div className="p-3 bg-emerald-500/20 rounded-2xl w-fit">
                                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Risk Assessment</p>
                                        <p className="text-xl font-bold text-emerald-500 capitalize">{status?.summary?.riskLevel || 'Low'}</p>
                                        <p className="text-xs text-slate-400 mt-1">No major flags</p>
                                    </div>
                                </div>
                            </div>

                            {/* GST Live Data (Sandbox) */}
                            <div className="glass-card rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                                            <ExternalLink className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">GST Portal Sync (Sandbox)</h3>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">GSTIN: {gstData?.gstin || '...'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => refetchGst()}
                                        disabled={isGstLoading}
                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isGstLoading && "animate-spin")} />
                                    </button>
                                </div>

                                {isGstLoading ? (
                                    <div className="p-12 flex justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                                        {/* GSTR-1 Status */}
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="font-bold text-white text-sm">GSTR-1 (Outward)</h4>
                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter",
                                                    gstData?.gstr1?.status === 'FILED' ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                                                )}>
                                                    {gstData?.gstr1?.status || 'UNKNOWN'}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Invoices</span>
                                                    <span className="text-white font-medium">{gstData?.gstr1?.totalInvoices}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Total Value</span>
                                                    <span className="text-white font-medium">₹{new Intl.NumberFormat('en-IN').format(gstData?.gstr1?.totalValue || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Filed On</span>
                                                    <span className="text-white font-medium">{gstData?.gstr1?.filedDate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* GSTR-3B Status */}
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="font-bold text-white text-sm">GSTR-3B (Summary)</h4>
                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter",
                                                    gstData?.gstr3b?.status === 'FILED' ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                                                )}>
                                                    {gstData?.gstr3b?.status || 'PENDING'}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Tax Payable</span>
                                                    <span className="text-white font-medium">₹{new Intl.NumberFormat('en-IN').format(gstData?.gstr3b?.outwardTax || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Input Credit (ITC)</span>
                                                    <span className="text-emerald-500 font-medium">- ₹{new Intl.NumberFormat('en-IN').format(gstData?.gstr3b?.inputTaxCredit || 0)}</span>
                                                </div>
                                                <div className="pt-2 border-t border-white/5 flex justify-between text-sm">
                                                    <span className="text-slate-300 font-bold">Net Payable</span>
                                                    <span className="text-white font-bold">₹{new Intl.NumberFormat('en-IN').format(gstData?.gstr3b?.netPayable || 0)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PF & ESIC Tracking Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* PF (Provident Fund) Card */}
                                <div className="glass-card rounded-3xl overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-blue-500/5 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                                <ShieldCheck className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm">Provident Fund (PF)</h3>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">EPFO Compliance</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter bg-emerald-500/20 text-emerald-500">
                                            FILED
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Employees Covered</span>
                                            <span className="text-white font-medium">12</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Monthly Contribution</span>
                                            <span className="text-white font-medium">₹72,000</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Due Date</span>
                                            <span className="text-white font-medium">15th Feb 2026</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => window.open('https://unifiedportal-mem.epfindia.gov.in/', '_blank')}
                                                className="flex-1 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                EPFO Portal
                                            </button>
                                            <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">
                                                <Download className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ESIC Card */}
                                <div className="glass-card rounded-3xl overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-purple-500/5 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-xl">
                                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm">ESI Contribution</h3>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">ESIC Compliance</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter bg-amber-500/20 text-amber-500">
                                            DUE SOON
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Employees Covered</span>
                                            <span className="text-white font-medium">8</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Monthly Contribution</span>
                                            <span className="text-white font-medium">₹18,400</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Due Date</span>
                                            <span className="text-amber-400 font-medium">15th Feb 2026</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => window.open('https://www.esic.in/', '_blank')}
                                                className="flex-1 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                ESIC Portal
                                            </button>
                                            <button className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">
                                                <Download className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Task List */}
                            <div className="glass-card rounded-3xl overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                    <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        Active Compliance Tasks
                                    </h3>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {status?.tasks && status.tasks.length > 0 ? (
                                        status.tasks.map((task: any) => (
                                            <div key={task.id} className="p-6 hover:bg-white/5 transition-colors group">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                                            task.priority === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20" : "bg-white/5 border-white/10"
                                                        )}>
                                                            {task.priority === 'CRITICAL' ? (
                                                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                                                            ) : (
                                                                <FileText className="w-6 h-6 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-white text-sm">{task.title}</h4>
                                                                <span className={cn(
                                                                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                                    task.priority === 'CRITICAL' ? "bg-rose-500 text-white" : "bg-sky-500/10 text-sky-500"
                                                                )}>
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-0.5">{task.description || `Statutory requirement for ${task.category}`}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CTA Action Buttons */}
                                                <div className="flex items-center gap-2 ml-16">
                                                    <button
                                                        onClick={() => openActionModal(task as ComplianceTask, 'fix')}
                                                        className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        <Wrench className="w-3 h-3" />
                                                        Fix Now
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(task as ComplianceTask, 'assign')}
                                                        className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        <UserPlus className="w-3 h-3" />
                                                        Assign to CA
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(task as ComplianceTask, 'download')}
                                                        className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Download Docs
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center text-slate-500">
                                            No tasks found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Area - Insights/Tips */}
                        <div className="space-y-6">
                            <div className="glass-card rounded-3xl p-6 border-emerald-500/20 bg-emerald-500/5">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Statutory Status</h3>
                                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span className="text-xs text-slate-300">All filings up to date.</span>
                                </div>
                            </div>

                            <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                    <Info className="w-4 h-4 text-primary" />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Compliance Tip</h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    Professional fees above ₹30k require 10% TDS deduction. Our AI has auto-flagged 2 such upcoming payments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {/* Action Modal */}
            <ActionModal
                isOpen={!!selectedTask && !!modalAction}
                onClose={closeActionModal}
                task={selectedTask}
                action={modalAction}
            />
        </>
    );
}
