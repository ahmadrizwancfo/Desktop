'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
            window.location.href = 'http://localhost:3001/api/integrations/zoho/auth';
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
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Bank */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 shrink-0">
                                            <Building2 className="w-6 h-6 text-primary" />
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
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-[#3395FF]/10 flex items-center justify-center mb-5 shrink-0">
                                            <BarChart3 className="w-6 h-6 text-[#3395FF]" />
                                        </div>
                                        <h3 className="text-lg font-black text-white mb-2">Razorpay</h3>
                                        <p className="text-sm font-medium text-slate-400 mb-6 flex-1">Automatically track revenue</p>
                                        <button 
                                            onClick={() => handleMockConnect('Razorpay')}
                                            className="w-full py-3.5 rounded-xl bg-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/15 transition-all"
                                        >
                                            Connect Razorpay
                                        </button>
                                    </div>

                                    {/* Zoho Books */}
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-[#F44336]/10 flex items-center justify-center mb-5 shrink-0">
                                            <Calculator className="w-6 h-6 text-[#F44336]" />
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
