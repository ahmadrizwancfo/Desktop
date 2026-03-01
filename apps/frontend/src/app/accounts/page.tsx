'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
    Wallet,
    Plus,
    ArrowRight,
    ShieldCheck,
    Building2,
    Loader2,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccountsPage() {
    const user = useAuthStore((state) => state.user);
    const [isLoading, setIsLoading] = useState(false);
    const [consentHandle, setConsentHandle] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<any[]>([]);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            // 1. Initiate Consent
            const res = await apiClient.post('/integrations/banking/consent', {
                userId: user?.id,
                mobile: '9999999999' // Mock mobile number
            });

            setConsentHandle(res.data.consentHandle);

            // 2. Fetch Accounts (Simulating Redirect Simulation)
            setTimeout(async () => {
                const accRes = await apiClient.get('/integrations/banking/accounts', {
                    params: { consentHandle: res.data.consentHandle }
                });
                setAccounts(accRes.data);
                setIsLoading(false);
            }, 1000);

        } catch (error) {
            console.error('Banking connection failed', error);
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Bank Accounts</h1>
                        <p className="text-slate-400 mt-1">Manage your connected bank accounts and liquidity.</p>
                    </div>
                    {accounts.length === 0 && (
                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Connect Bank Account
                                </>
                            )}
                        </button>
                    )}
                </header>

                {/* Account Aggregator Info */}
                <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl shrink-0">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Powered by Account Aggregator</h3>
                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                            We use the AA framework (Sahamati) to securely fetch your banking data.
                            Your data is encrypted and we only have read-access.
                            <br />
                            <span className="text-indigo-400 text-xs mt-2 inline-block font-bold">Supported: HDFC, SBI, ICICI, Axis + 20 others</span>
                        </p>
                    </div>
                </div>

                {/* Connected Accounts List */}
                {accounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {accounts.map((acc) => (
                            <div key={acc.id} className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Building2 className="w-24 h-24 text-white" />
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <Building2 className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        Connected
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white">{acc.bankName}</h3>
                                    <p className="text-slate-500 text-sm font-medium tracking-wider mt-1">{acc.accountNumber}</p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Available Balance</p>
                                        <p className="text-2xl font-black text-white">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: acc.currency }).format(acc.balance)}
                                        </p>
                                    </div>
                                    <button className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && (
                        <div className="text-center py-20 glass-card rounded-3xl border-dashed border-white/10">
                            <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white">No accounts connected</h3>
                            <p className="text-slate-400 mt-2 max-w-sm mx-auto">
                                Connect your primary bank account to enable automated cash flow tracking and runway analysis.
                            </p>
                        </div>
                    )
                )}
            </div>
        </DashboardLayout>
    );
}
