'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet, Plus, Server, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IntegrationsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [importType, setImportType] = useState<string>('BANK_STATEMENT');
    const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState<string | null>(null);

    const [auditData, setAuditData] = useState<any>(null);
    const [connections, setConnections] = useState<any[]>([]);
    
    // Razorpay states
    const [rzpKeyId, setRzpKeyId] = useState('');
    const [rzpKeySecret, setRzpKeySecret] = useState('');
    const [syncingRzp, setSyncingRzp] = useState(false);

    React.useEffect(() => {
        const fetchConnections = async () => {
             const token = localStorage.getItem('token');
             try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/connections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setConnections(data);
                }
             } catch (e) { console.error('Failed to fetch connections', e); }
        };
        fetchConnections();
    }, []);

    const razorpayConn = connections.find(c => c.provider === 'RAZORPAY');
    const zohoConn = connections.find(c => c.provider === 'ZOHO');
    const quickbooksConn = connections.find(c => c.provider === 'QUICKBOOKS');

    const [syncingZoho, setSyncingZoho] = useState(false);
    const [syncingQb, setSyncingQb] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus('IDLE');
            setMessage(null);
            setAuditData(null);
        }
    };

    const handleOAuthConnect = async (provider: 'zoho' | 'quickbooks') => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/${provider}/auth`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.redirected) {
            window.location.href = res.url;
        }
    };

    const handleDisconnect = async (provider: string) => {
        if (!confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/${provider.toLowerCase()}/disconnect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setConnections(connections.filter(c => c.provider !== provider.toUpperCase()));
                setMessage(`${provider.toUpperCase()} disconnected.`);
                setAuditData(null);
                setStatus('SUCCESS');
            } else {
                setMessage(`Failed to disconnect ${provider}`);
                setStatus('ERROR');
            }
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleOauthSync = async (provider: 'zoho' | 'quickbooks') => {
        provider === 'zoho' ? setSyncingZoho(true) : setSyncingQb(true);
        setStatus('UPLOADING');
        setMessage(null);
        setAuditData(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/${provider}/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                if (data.partials) {
                    setStatus('ERROR');
                    setMessage(`Partially synced ${provider.toUpperCase()}. Some items failed.`);
                } else {
                    setStatus('SUCCESS');
                    setMessage(`Successfully synced ${provider.toUpperCase()}`);
                }
                setAuditData(data);
                // Refresh connections locally
                const updatedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/connections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (updatedRes.ok) setConnections(await updatedRes.json());
            } else {
                setStatus('ERROR');
                setMessage(data.message || `Failed to sync ${provider}`);
            }
        } catch (err: any) {
            setStatus('ERROR');
            setMessage('Network error during sync.');
        } finally {
            provider === 'zoho' ? setSyncingZoho(false) : setSyncingQb(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        
        setStatus('UPLOADING');
        setMessage(null);
        setAuditData(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/upload-csv`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            
            if (res.ok) {
                setStatus('SUCCESS');
                setMessage(data.message || 'Successfully processed file.');
                setAuditData(data);
                if (!connections.find(c => c.provider === 'CSV_MANUAL')) {
                    setConnections([...connections, { provider: 'CSV_MANUAL', status: 'ACTIVE' }]);
                }
            } else {
                setStatus('ERROR');
                setMessage(data.message || 'Failed to upload CSV. Please try again.');
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err: any) {
            setStatus('ERROR');
            setMessage('Network error. Ensure backend is running.');
        }
    };

    const handleRazorpaySync = async () => {
        if (!rzpKeyId || !rzpKeySecret) {
            setStatus('ERROR');
            setMessage('Please provide both Key ID and Key Secret.');
            return;
        }

        setSyncingRzp(true);
        setStatus('UPLOADING');
        setMessage(null);
        setAuditData(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/integrations/razorpay/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keyId: rzpKeyId, keySecret: rzpKeySecret })
            });

            const data = await res.json();
            
            if (res.ok) {
                setStatus('SUCCESS');
                setMessage(data.message || 'Successfully synced Razorpay payments.');
                setAuditData(data);
                if (!razorpayConn) {
                    setConnections([...connections, { provider: 'RAZORPAY', status: 'ACTIVE', lastSyncedAt: new Date().toISOString() }]);
                } else {
                    setConnections(connections.map(c => c.provider === 'RAZORPAY' ? { ...c, lastSyncedAt: new Date().toISOString() } : c));
                }
                setRzpKeySecret(''); // Clear secret
            } else {
                setStatus('ERROR');
                setMessage(data.message || 'Failed to sync Razorpay.');
            }
        } catch (err: any) {
            setStatus('ERROR');
            setMessage('Network error syncing Razorpay.');
        } finally {
            setSyncingRzp(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-12 pb-24 relative z-10 p-4 md:p-8">
                {/* Cinematic Background Elements */}
                <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none -z-10 overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full opacity-30" />
                    <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full opacity-20" />
                </div>

                {/* Page Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight text-editorial">
                        Intelligence <span className="text-gradient">Synapse</span>
                    </h2>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em] flex items-center gap-3">
                        Data Pipeline Status: <span className="text-emerald-400 font-black">Optimal</span> • {connections.length} Sources Active
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Manual & Direct Imports */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* CSV Import Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-10 rounded-[2.5rem] glass-premium border border-white/5 relative group overflow-hidden"
                        >
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-700">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white text-editorial tracking-tight">Statement Ingestion</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                        Deterministic Pipeline
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Ingestion Protocol</label>
                                    <div className="relative">
                                        <select 
                                            value={importType} 
                                            onChange={(e) => setImportType(e.target.value)}
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4.5 text-sm text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                                        >
                                            <option value="BANK_STATEMENT">🏦 Bank Ledger Analysis</option>
                                            <option value="REVENUE">📈 Revenue Stream Parse</option>
                                            <option value="EXPENSE">📉 Expense Ledger Parse</option>
                                        </select>
                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
                                    </div>
                                </div>

                                <div className="relative">
                                    <input 
                                        type="file" 
                                        id="csv-upload"
                                        className="hidden" 
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileChange}
                                    />
                                    <label 
                                        htmlFor="csv-upload"
                                        className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 hover:border-primary/20 rounded-[2rem] p-8 cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] transition-all group/upload relative overflow-hidden"
                                    >
                                        {file ? (
                                            <div className="flex items-center gap-3 relative z-10">
                                                <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                                                <span className="text-sm text-emerald-400 font-black truncate max-w-[180px]">{file.name}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Plus className="w-8 h-8 text-slate-700 group-hover/upload:text-primary transition-colors mb-3 relative z-10" />
                                                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest relative z-10">Select Data Object</span>
                                            </>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity" />
                                    </label>
                                </div>
                            </div>

                            {status === 'SUCCESS' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-8 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4 text-emerald-400 glass-premium"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-tight">{message || 'Intelligence ingestion successful.'}</span>
                                </motion.div>
                            )}

                            {status === 'ERROR' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-8 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-4 text-rose-400 glass-premium"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-tight">{message || 'Pipeline interruption detected.'}</span>
                                </motion.div>
                            )}

                            <button 
                                onClick={handleUpload}
                                disabled={!file || status === 'UPLOADING'}
                                className="w-full mt-10 p-5 rounded-2xl bg-white text-[#020617] font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-10 disabled:hover:scale-100 transition-all flex items-center justify-center gap-4"
                            >
                                {status === 'UPLOADING' ? <RefreshCw className="w-5 h-5 animate-spin text-primary" /> : <Database className="w-5 h-5" />}
                                Initiate Stream Processing
                            </button>
                        </motion.div>

                        {/* Audit Log / Preview */}
                        <AnimatePresence>
                            {auditData && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="p-10 rounded-[2.5rem] glass-premium border border-white/5 shadow-2xl"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="space-y-1">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Synapse Preview</h4>
                                            <p className="text-xs text-slate-400 font-medium italic">Found {auditData?.importedCount || 0} financial events processed.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                +{auditData?.totalRevenueImported?.toLocaleString()} IN
                                            </div>
                                            <div className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                                                -{auditData?.totalExpenseImported?.toLocaleString()} OUT
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {auditData.finalProfileMetrics && (
                                        <div className="mb-10 grid grid-cols-3 gap-4 p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 shadow-inner">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Run Rate</span>
                                                <p className="text-lg font-black text-white tabular-nums">₹{auditData.finalProfileMetrics.monthlyRevenue.toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Burn Rate</span>
                                                <p className="text-lg font-black text-white tabular-nums">₹{auditData.finalProfileMetrics.monthlyExpenses.toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cash Position</span>
                                                <p className="text-lg font-black text-emerald-400 tabular-nums">₹{auditData.finalProfileMetrics.cashInBank.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                                        {/* Row items would list here if data.results existed, otherwise we show summary */}
                                        <div className="text-center py-10 opacity-30 italic text-sm">
                                            Engine Synapse Complete. Dashboard Updated.
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column: Cloud Integrations */}
                    <div className="space-y-10">
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Direct Cloud Synapses</h4>
                        
                        {/* Razorpay Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className={cn(
                                "p-8 rounded-[2.5rem] glass-premium transition-all duration-700 relative overflow-hidden group/card shadow-2xl",
                                razorpayConn ? 'border-primary/30 shadow-[0_0_50px_-10px_rgba(99,102,241,0.15)]' : 'border-white/5'
                            )}
                        >
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center border border-white/5 shadow-inner group-hover/card:scale-110 transition-transform duration-500">
                                    <Server className="w-7 h-7 text-[#3395FF]" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-lg font-black text-white text-editorial uppercase tracking-widest leading-none">Razorpay</h5>
                                    {razorpayConn ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pipeline Active</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic mt-2">Awaiting Credentials</span>
                                    )}
                                </div>
                            </div>

                            {!razorpayConn ? (
                                <div className="space-y-4 mb-8">
                                    <input 
                                        type="text" 
                                        placeholder="API Gateway Identifier"
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                        value={rzpKeyId}
                                        onChange={(e) => setRzpKeyId(e.target.value)}
                                    />
                                    <input 
                                        type="password" 
                                        placeholder="Synapse Secret"
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:ring-1 focus:ring-primary/40 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                        value={rzpKeySecret}
                                        onChange={(e) => setRzpKeySecret(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="mb-8 space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Pipeline Data</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-[10px] font-bold">Latest Pulse</span>
                                        <span className="text-white text-[10px] font-black tabular-nums uppercase tracking-tighter">
                                            {razorpayConn.lastSyncedAt ? new Date(razorpayConn.lastSyncedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleRazorpaySync}
                                disabled={syncingRzp || (!razorpayConn && (!rzpKeyId || !rzpKeySecret))}
                                className={cn(
                                    "w-full py-4.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-primary/30",
                                    razorpayConn 
                                    ? "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/10" 
                                    : "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                                )}
                            >
                                {syncingRzp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                {syncingRzp ? 'Attuning Pipeline...' : (razorpayConn ? 'Trigger Synapse' : 'Activate Connection')}
                            </button>

                            {razorpayConn && (
                                <button 
                                    onClick={() => handleDisconnect('razorpay')}
                                    className="w-full mt-4 text-[9px] font-black text-rose-500/40 hover:text-rose-400 uppercase tracking-[0.4em] transition-all"
                                >
                                    Force Termination
                                </button>
                            )}
                        </motion.div>

                        {/* Zoho Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className={cn(
                                "p-8 rounded-[2.5rem] glass-premium transition-all duration-700 relative overflow-hidden group/card shadow-2xl",
                                zohoConn ? 'border-[#F44336]/30 shadow-[0_0_50px_-10px_rgba(244,67,54,0.15)]' : 'border-white/5'
                            )}
                        >
                            {/* Zoho UI */}
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-inner group-hover/card:scale-110 transition-transform duration-500">
                                    <Database className="w-7 h-7 text-[#F44336]" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-lg font-black text-white text-editorial uppercase tracking-widest leading-none">Zoho Books</h5>
                                    {zohoConn ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">OAuth Verified</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic mt-2">OAuth Intercepted</span>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={() => zohoConn ? handleOauthSync('zoho') : handleOAuthConnect('zoho')}
                                disabled={syncingZoho}
                                className={cn(
                                    "w-full py-4.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-[#F44336]/30",
                                    zohoConn 
                                    ? "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/10" 
                                    : "bg-[#F44336] text-white shadow-[#F44336]/20 hover:scale-[1.02] active:scale-[0.98]"
                                )}
                            >
                                {syncingZoho ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                {syncingZoho ? 'Streaming...' : (zohoConn ? 'Re-Sync Identity' : 'Authorize via Zoho')}
                            </button>

                            {zohoConn && (
                                <button 
                                    onClick={() => handleDisconnect('zoho')}
                                    className="w-full mt-4 text-[9px] font-black text-rose-500/40 hover:text-rose-400 uppercase tracking-[0.4em] transition-all"
                                >
                                    Force Termination
                                </button>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
