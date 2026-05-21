'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
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

    const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'SUCCESS'>('IDLE');
    const [connectionMessage, setConnectionMessage] = useState('');
    const [progressStep, setProgressStep] = useState(0);

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

    // Mock progress steps for the "alive" feeling
    const progressMessages = [
        "Connecting securely...",
        "Importing history...",
        "Analyzing transactions...",
        "Recalculating runway..."
    ];

    useEffect(() => {
        if (status === 'CONNECTING') {
            let step = 0;
            const interval = setInterval(() => {
                step += 1;
                if (step < progressMessages.length) {
                    setProgressStep(step);
                } else {
                    clearInterval(interval);
                    setStatus('SUCCESS');
                    setConnectionMessage('Your real CFO is ready.');
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 2000);
                }
            }, 1200);
            return () => clearInterval(interval);
        }
    }, [status, router]);

    const handleMockConnect = async (provider: string) => {
        if (provider === 'Zoho Books') {
            try {
                const res = await apiClient.get('/integrations/zoho/auth');
                if (res.data?.url) {
                    window.location.href = res.data.url;
                }
            } catch (err) {
                console.error('Failed to get Zoho auth URL', err);
                alert('Connection failed. Please try again.');
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
                alert('Connection failed. Please try again.');
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
                } catch (err) {
                    console.error('Failed to sync Razorpay', err);
                    alert("Invalid Razorpay keys or sync failed.");
                    setStatus('IDLE');
                    return;
                }
            }
            return;
        }

        if (provider === 'Bank Account') {
            alert('Bank Account aggregator is not fully configured yet. Upload a Bank Statement CSV instead.');
            return;
        }

        setStatus('CONNECTING');
        setConnectionMessage(`Connecting to ${provider}...`);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus('CONNECTING');
            setConnectionMessage(`Processing ${e.target.files[0].name}...`);

            try {
                // We use standard fetch or apiClient to upload
                const formData = new FormData();
                formData.append('file', e.target.files[0]);
                formData.append('importType', 'BANK_STATEMENT');
                
                await apiClient.post('/integrations/upload-csv', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
            } catch (err) {
                console.error('Upload failed', err);
                alert('Upload failed.');
                setStatus('IDLE');
                return;
            }
        }
    };

    return (
        <DashboardLayout>
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
                                            onClick={() => handleMockConnect('Bank Account')}
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
                                                    onClick={() => handleMockConnect('Razorpay')}
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
                                            onClick={() => handleMockConnect('Zoho Books')}
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
                                        accept=".csv,.xlsx,.xls"
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

                    ) : (

                        /* 5. Real-Time Feedback State */
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md mx-auto mt-12 bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
                        >
                            {status === 'SUCCESS' && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-emerald-500/10 animate-pulse"
                                />
                            )}
                            
                            <div className="relative z-10">
                                <div className={cn(
                                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors duration-500",
                                    status === 'SUCCESS' ? "bg-emerald-500/20" : "bg-primary/20"
                                )}>
                                    {status === 'SUCCESS' ? (
                                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    ) : (
                                        <Zap className="w-10 h-10 text-primary animate-pulse" />
                                    )}
                                </div>

                                <h2 className={cn(
                                    "text-2xl font-black mb-2 transition-colors",
                                    status === 'SUCCESS' ? "text-emerald-400" : "text-white"
                                )}>
                                    {status === 'SUCCESS' ? "Connection Successful" : connectionMessage}
                                </h2>

                                <div className="mt-8 space-y-3">
                                    {progressMessages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: i <= progressStep ? 1 : 0.3, x: 0 }}
                                            className="flex items-center gap-3 text-sm font-medium"
                                        >
                                            {i < progressStep ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            ) : i === progressStep && status !== 'SUCCESS' ? (
                                                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                                            )}
                                            <span className={cn(
                                                i < progressStep ? "text-slate-300" :
                                                i === progressStep ? "text-white font-bold" : "text-slate-600"
                                            )}>
                                                {msg}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
