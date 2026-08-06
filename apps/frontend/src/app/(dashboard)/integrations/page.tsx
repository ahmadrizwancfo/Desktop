'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Upload,
    CheckCircle2,
    Shield,
    FileText,
    Building2,
    BarChart3,
    Calculator,
    Zap,
    Lock,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// REAL CFO UPGRADE EXPERIENCE
//
// This is a conversion engine, not a setup screen.
// ═══════════════════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'PREVIEW' | 'SUCCESS'>('IDLE');
    const [connectionMessage, setConnectionMessage] = useState('');

    const [file, setFile] = useState<File | null>(null);

    const { data: connectionsData, refetch: refetchConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiClient.get('/integrations/connections');
            return res.data;
        }
    });

    const razorpayConn = connectionsData?.integrations?.find((conn: any) => conn.type === 'razorpay');

    const syncMutation = useMutation({
        mutationFn: async (provider: string) => {
            const res = await apiClient.post(`/integrations/${provider.toLowerCase()}/sync-now`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Sync triggered successfully! Refreshing connections...');
            refetchConnections();
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        },
        onError: () => {
            toast.error('Sync failed. Please verify credentials or try again later.');
        }
    });

    const disconnectMutation = useMutation({
        mutationFn: async (provider: string) => {
            const res = await apiClient.post(`/integrations/${provider.toLowerCase()}/disconnect`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Disconnected successfully!');
            refetchConnections();
            queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        },
        onError: () => {
            toast.error('Failed to disconnect.');
        }
    });

    const handleConnectIntegration = async (provider: string) => {
        if (provider === 'Zoho Books') {
            try {
                const res = await apiClient.get('/integrations/zoho/auth');
                if (res.data?.url) {
                    window.location.href = res.data.url;
                }
            } catch (err) {
                console.error('Failed to get Zoho auth URL', err);
                toast.error('Zoho connection failed. Please try again.');
            }
            return;
        }

        if (provider === 'QuickBooks') {
            try {
                const res = await apiClient.get('/integrations/quickbooks/auth');
                if (res.data?.url) {
                    window.location.href = res.data.url;
                }
            } catch (err) {
                console.error('Failed to get QuickBooks auth URL', err);
                toast.error('QuickBooks connection failed. Please try again.');
            }
            return;
        }

        if (provider === 'Razorpay') {
            const keyId = prompt('Enter your Razorpay Key ID:');
            const keySecret = prompt('Enter your Razorpay Key Secret:');
            if (keyId && keySecret) {
                setStatus('CONNECTING');
                setConnectionMessage(`Connecting to ${provider}...`);
                try {
                    await apiClient.post('/integrations/razorpay/sync', { keyId, keySecret });
                    await refetchConnections();
                    await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                    setStatus('SUCCESS');
                    setConnectionMessage('Razorpay connected successfully!');
                    setTimeout(() => {
                        setStatus('IDLE');
                    }, 1500);
                } catch (err) {
                    console.error('Failed to sync Razorpay', err);
                    toast.error('Invalid Razorpay keys or sync failed.');
                    setStatus('IDLE');
                }
            }
            return;
        }

        if (provider === 'Bank Account') {
            toast.info('Bank Account aggregator is unconfigured. Please upload a Bank Statement CSV instead.');
            return;
        }
    };

    const [previewData, setPreviewData] = useState<any>(null);
    const [briefData, setBriefData] = useState<any>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Reset input so the same file can be re-uploaded if needed
        e.target.value = '';

        setFile(selectedFile);
        setStatus('CONNECTING');
        setConnectionMessage(`Reviewing ${selectedFile.name}... No data has been saved yet.`);

        const isXml = selectedFile.name.toLowerCase().endsWith('.xml');
        const endpoint = isXml ? '/integrations/tally/upload-xml?preview=true' : '/integrations/upload-csv?preview=true';

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (!isXml) formData.append('importType', 'BANK_STATEMENT');

            // Step 1: Pre-flight preview scan (no DB write)
            const res = await apiClient.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const result = res.data;
            setPreviewData(result);
            setStatus('PREVIEW');
            setConnectionMessage(isXml 
                ? `FounderCFO successfully understood your Tally company "${result.companyName || 'Tally Company'}". Please inspect the preview before importing.` 
                : 'We have finished reviewing your file. Please inspect the preview before importing.');
        } catch (err: any) {
            console.error('Pre-flight scan failed', err);
            toast.error(err?.response?.data?.message || 'We couldn\'t fully understand this export. Please verify the file format.');
            setStatus('IDLE');
        }
    };

    const handleConfirmImport = async () => {
        if (!file) return;

        setStatus('CONNECTING');
        setConnectionMessage(`Executing canonical import for ${file.name}...`);

        const isXml = file.name.toLowerCase().endsWith('.xml');
        const endpoint = isXml ? '/integrations/tally/upload-xml' : '/integrations/upload-csv';

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (!isXml) formData.append('importType', 'BANK_STATEMENT');

            const res = await apiClient.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const result = res.data;
            setBriefData(result);
            setStatus('SUCCESS');
            setConnectionMessage('Tally Import Complete! AI CFO Executive Brief ready.');
            toast.success(`Import Complete! Imported ${result?.importedCount || 0} vouchers/transactions.`);

            // Refresh org financial context
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['cfo-state'] }),
                refetchConnections(),
            ]);
        } catch (err: any) {
            console.error('Import failed', err);
            toast.error(err?.response?.data?.message || 'Import failed. Please try again.');
            setStatus('IDLE');
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto pb-24 relative p-4 md:p-8 pt-12">
                {/* Visual backdrop */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none -z-10">
                    <div className="absolute top-10 left-1/4 w-[300px] h-[300px] bg-primary/10 blur-[120px] rounded-full" />
                    <div className="absolute top-20 right-1/4 w-[250px] h-[250px] bg-emerald-500/10 blur-[100px] rounded-full" />
                </div>

                {/* 1. Context Header */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
                        Let’s replace your estimates with <br className="hidden md:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">real numbers</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium">
                        You’re currently seeing projections. Connect your data to make them accurate.
                    </p>
                </motion.header>

                <AnimatePresence mode="wait">
                    {status === 'IDLE' ? (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-12"
                        >
                            {/* Security & Privacy Trust Badges */}
                            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-400" />
                                    <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Bank-Grade Data Protection</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                                    <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-400" /> 256-Bit AES Encryption</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> DPDP Act Compliant</span>
                                    <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Read-Only Data Feeds</span>
                                    <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-indigo-400" /> Zero Data Selling</span>
                                </div>
                            </div>

                            {/* 2. Current vs Future State Lockup */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left: Estimated */}
                                <div className="p-6 md:p-8 rounded-[2rem] bg-amber-500/[0.02] border border-amber-500/10 relative overflow-hidden group">
                                    <h3 className="text-[11px] font-black text-amber-500/70 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                        Your CFO (Estimated)
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-2 border-b border-white/5 disabled opacity-60">
                                            <span className="text-sm font-bold text-slate-400">Runway</span>
                                            <span className="text-sm font-black text-amber-400/80">4–6 months</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-white/5 opacity-60">
                                            <span className="text-sm font-bold text-slate-400">Confidence</span>
                                            <span className="text-sm font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">Low</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 opacity-60">
                                            <span className="text-sm font-bold text-slate-400">Based on</span>
                                            <span className="text-sm font-medium text-slate-500">Manual inputs</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Real */}
                                <div className="p-6 md:p-8 rounded-[2rem] bg-emerald-500/[0.04] border border-emerald-500/20 relative shadow-[0_0_40px_-15px_rgba(16,185,129,0.15)] overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
                                    
                                    <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                                        Your CFO (Real)
                                    </h3>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex items-center justify-between py-2 border-b border-emerald-500/10">
                                            <span className="text-sm font-bold text-white">Runway</span>
                                            <span className="text-sm font-black text-emerald-400">Exact, updated daily</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-emerald-500/10">
                                            <span className="text-sm font-bold text-white">Burn</span>
                                            <span className="text-sm font-black text-emerald-400">Auto-detected</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-emerald-500/10">
                                            <span className="text-sm font-bold text-white">Risks</span>
                                            <span className="text-sm font-black text-rose-400">Live alerts</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2">
                                            <span className="text-sm font-bold text-white">Actions</span>
                                            <span className="text-sm font-black text-primary">Personalized weekly</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Connection Options */}
                            <div className="space-y-6">
                                <h2 className="text-lg font-black text-white text-center">Connect your financial sources</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Bank */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 shrink-0">
                                            <Building2 className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-2">Bank Account</h3>
                                        <p className="text-sm font-medium text-slate-400 mb-6 flex-1">Track real cash flow and runway</p>
                                        <button 
                                            onClick={() => handleConnectIntegration('Bank Account')}
                                            className="w-full py-3.5 rounded-xl bg-white text-[#0a0f1e] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Connect Bank
                                        </button>
                                    </div>

                                    {/* Razorpay */}
                                    <div className={cn(
                                        "p-6 rounded-2xl bg-white/[0.02] border transition-all group flex flex-col h-full",
                                        razorpayConn?.status === 'connected' 
                                            ? "border-emerald-500/20 bg-emerald-500/[0.01]" 
                                            : "border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                    )}>
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                <img src="https://www.vectorlogo.zone/logos/razorpay/razorpay-icon.svg" alt="Razorpay" className="w-8 h-8 object-contain" />
                                            </div>
                                            {razorpayConn?.status === 'connected' ? (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Connected
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                    Disconnected
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-black text-white mb-1">Razorpay</h3>
                                        <p className="text-xs font-medium text-slate-400 flex-1">Automatically track revenue and transaction history</p>

                                        {razorpayConn?.status === 'connected' && (
                                            <div className="my-4 py-3 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-left">
                                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                                    <span>Transactions imported</span>
                                                    <span className="text-white">{razorpayConn.transactionCount || 0}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                                    <span>Sync Status</span>
                                                    <span className="text-sky-400 font-black uppercase tracking-wider">{razorpayConn.syncStatus || 'idle'}</span>
                                                </div>
                                                <div className="text-[9px] text-slate-500 mt-1">
                                                    Last Synced: {razorpayConn.lastSyncedAt ? new Date(razorpayConn.lastSyncedAt).toLocaleString('en-IN') : 'Never'}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-auto">
                                            {razorpayConn?.status === 'connected' ? (
                                                <>
                                                    <button 
                                                        onClick={() => syncMutation.mutate('Razorpay')}
                                                        disabled={syncMutation.isPending || razorpayConn.syncStatus === 'syncing'}
                                                        className="flex-1 py-3.5 rounded-xl bg-white text-[#0a0f1e] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <RefreshCw className={cn("w-3.5 h-3.5", (syncMutation.isPending || razorpayConn.syncStatus === 'syncing') && "animate-spin")} />
                                                        {razorpayConn.syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to disconnect Razorpay?')) {
                                                                disconnectMutation.mutate('Razorpay');
                                                            }
                                                        }}
                                                        disabled={disconnectMutation.isPending}
                                                        className="px-3.5 py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-[11px] uppercase tracking-widest border border-rose-500/20 transition-all"
                                                        title="Disconnect"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleConnectIntegration('Razorpay')}
                                                    className="w-full py-3.5 rounded-xl bg-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/15 transition-all"
                                                >
                                                    Connect Razorpay
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Zoho Books */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-5 shrink-0 overflow-hidden p-1.5">
                                            <img src="https://www.vectorlogo.zone/logos/zoho/zoho-icon.svg" alt="Zoho" className="w-full h-full object-contain" />
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-2">Zoho Books</h3>
                                        <p className="text-sm font-medium text-slate-400 mb-6 flex-1">Import your financial history</p>
                                        <button 
                                            onClick={() => handleConnectIntegration('Zoho Books')}
                                            className="w-full py-3.5 rounded-xl bg-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/15 transition-all"
                                        >
                                            Connect Zoho
                                        </button>
                                    </div>

                                    {/* QuickBooks - Coming Soon */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-all group flex flex-col h-full opacity-60">
                                        <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center mb-5 shrink-0 overflow-hidden">
                                            <img src="https://www.vectorlogo.zone/logos/intuit_quickbooks/intuit_quickbooks-icon.svg" alt="QuickBooks" className="w-9 h-9 object-contain grayscale" />
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-black text-white">QuickBooks</h3>
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-slate-500 uppercase">Soon</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 mb-6 flex-1">Enterprise grade accounting sync</p>
                                        <button 
                                            disabled
                                            className="w-full py-3.5 rounded-xl bg-white/5 text-slate-600 font-black text-[11px] uppercase tracking-widest cursor-not-allowed"
                                        >
                                            Locked
                                        </button>
                                    </div>

                                    {/* Stripe - Coming Soon */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-all group flex flex-col h-full opacity-60">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 shrink-0 overflow-hidden">
                                            <img src="https://api.iconify.design/logos:stripe-icon.svg" alt="Stripe" className="w-7 h-7 object-contain grayscale" />
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-black text-white">Stripe</h3>
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-slate-500 uppercase">Soon</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 mb-6 flex-1">Global revenue & subscriptions</p>
                                        <button 
                                            disabled
                                            className="w-full py-3.5 rounded-xl bg-white/5 text-slate-600 font-black text-[11px] uppercase tracking-widest cursor-not-allowed"
                                        >
                                            Locked
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Alternative Low-Friction Path */}
                            <div className="pt-6 border-t border-white/5 flex flex-col items-center">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Or get started instantly</p>
                                
                                <div className="relative overflow-hidden w-full max-w-sm">
                                    <input 
                                        type="file" 
                                        id="csv-upload"
                                        className="hidden" 
                                        accept=".csv,.xlsx,.xls,.xml"
                                        onChange={handleUpload}
                                    />
                                    <label 
                                        htmlFor="csv-upload"
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/30 cursor-pointer transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                                            <Upload className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">Upload Bank Statement</h4>
                                            <p className="text-xs text-slate-500">Get insights in under 60 seconds</p>
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-white/5 text-[10px] font-black text-white uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-colors">
                                            Upload File
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* 6. Trust & Safety Layer */}
                            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-8 text-[11px] font-medium text-slate-500">
                                <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Read-only access</span>
                                <span className="hidden md:inline text-slate-700">•</span>
                                <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Your data is encrypted</span>
                                <span className="hidden md:inline text-slate-700">•</span>
                                <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Used by startup founders</span>
                            </div>

                        </motion.div>

                    ) : status === 'PREVIEW' && previewData ? (

                        /* 5. Trusted Pre-Commit Inspection Card */
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-2xl mx-auto mt-12 bg-[#0a0f1e]/90 border border-indigo-500/30 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden text-left"
                        >
                            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">{previewData.fileName || 'Bank Statement File'}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{connectionMessage}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                                    Pre-Commit Preview
                                </span>
                            </div>

                            {/* Inspection Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Rows Detected</span>
                                    <span className="text-lg font-black text-white tabular-nums">{previewData.importedCount || 0}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Duplicates Skipped</span>
                                    <span className="text-lg font-black text-amber-400 tabular-nums">{previewData.duplicateCount || 0}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Revenue Detected</span>
                                    <span className="text-lg font-black text-emerald-400 tabular-nums">₹{(previewData.totalRevenueImported || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Expenses Detected</span>
                                    <span className="text-lg font-black text-rose-400 tabular-nums">₹{(previewData.totalExpenseImported || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Impact Reassurance Box */}
                            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-8 space-y-2">
                                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
                                    <Shield className="w-4 h-4" />
                                    Estimated Business Impact
                                </div>
                                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                                    Net Cashflow Impact: <span className="text-white font-bold">₹{(previewData.estimatedCashImpact || 0).toLocaleString('en-IN')}</span> • Projected Runway Extension: <span className="text-emerald-400 font-bold">+{previewData.estimatedRunwayImpactMonths || 0} Months</span>.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-4 pt-2">
                                <button
                                    onClick={handleConfirmImport}
                                    className="flex-1 py-4 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4 fill-current" />
                                    Confirm &amp; Execute Import
                                </button>
                                <button
                                    onClick={() => setStatus('IDLE')}
                                    className="px-6 py-4 bg-white/5 border border-white/10 text-slate-300 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>

                    ) : (

                        /* 6. Interactive AI CFO Executive Debrief */
                        <motion.div
                            key="brief"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl mx-auto mt-12 bg-[#0a0f1e]/95 border border-emerald-500/30 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden text-left"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">AI CFO Debrief</h3>
                                        <p className="text-xs text-slate-400 font-semibold">Verified truth from imported financial dataset</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    Confidence: {briefData?.postImportDebrief?.confidenceScore || 90}%
                                </span>
                            </div>

                            {/* Viewport 1: Dynamic Opening & Dominant Truth */}
                            <div className="space-y-6 mb-8">
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">CFO Executive Summary</h4>
                                    <p className="text-base font-bold text-white leading-relaxed">
                                        "{briefData?.postImportDebrief?.openingSentence || briefData?.message || 'I have finished reviewing your financial activity.'}"
                                    </p>
                                </div>

                                {/* Headline Verified Truth Card */}
                                {briefData?.postImportDebrief?.dominantTruth && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block mb-1">Liquid Cash Balance</span>
                                            <span className="text-2xl font-black text-white tabular-nums">₹{(briefData.postImportDebrief.dominantTruth.cashInBank || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-1">Verified Runway</span>
                                            <span className="text-2xl font-black text-emerald-300 tabular-nums">
                                                {briefData.postImportDebrief.dominantTruth.actualRunway} Months
                                            </span>
                                            {briefData.postImportDebrief.dominantTruth.deltaRunway && briefData.postImportDebrief.dominantTruth.deltaRunway > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-400 block mt-1">
                                                    (+{briefData.postImportDebrief.dominantTruth.deltaRunway}M vs estimate)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Today's #1 Priority Decision */}
                                {briefData?.postImportDebrief?.todayPriority && (
                                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Today's #1 Priority Action</span>
                                        <p className="text-sm font-bold text-white leading-relaxed mb-3">
                                            {briefData.postImportDebrief.todayPriority.action}
                                        </p>
                                        <button
                                            onClick={() => router.push('/action-center')}
                                            className="px-4 py-2.5 bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                                        >
                                            <Zap className="w-3.5 h-3.5 fill-current" />
                                            Review Action Plan
                                        </button>
                                    </div>
                                )}

                                {/* Progressive Disclosure: Discoveries */}
                                {briefData?.postImportDebrief?.topDiscoveries?.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Key Findings &amp; Discoveries</h4>
                                        <div className="space-y-2">
                                            {briefData.postImportDebrief.topDiscoveries.map((disc: any, idx: number) => (
                                                <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-200">{disc.title}</span>
                                                    {disc.metric && <span className="font-black text-primary tabular-nums">{disc.metric}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Conversational Continuation */}
                                <div className="pt-4 border-t border-white/10">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">What would you like to understand next?</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(briefData?.postImportDebrief?.suggestedQuestions || [
                                            "Why did my runway calculation change?",
                                            "Where can I free up cash fastest?",
                                            "What statutory GST or TDS payments are due next?"
                                        ]).map((q: string, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => router.push(`/ai-cfo?q=${encodeURIComponent(q)}`)}
                                                className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 text-xs font-semibold text-slate-300 hover:text-white transition-all text-left"
                                            >
                                                "{q}"
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Final Navigation Bar */}
                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="flex-1 py-3.5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                >
                                    View Dashboard
                                </button>
                                <button
                                    onClick={() => setStatus('IDLE')}
                                    className="px-5 py-3.5 bg-white/5 border border-white/10 text-slate-400 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
