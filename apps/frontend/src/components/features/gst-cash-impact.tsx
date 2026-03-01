'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GSTCashImpact() {
    const [monthlySales, setMonthlySales] = React.useState(100000);
    const [monthlyPurchases, setMonthlyPurchases] = React.useState(100000);

    const gstRate = 0.18;
    const salesWithGST = monthlySales * (1 + gstRate);
    const gstCollected = monthlySales * gstRate;
    const gstPaid = monthlyPurchases * gstRate;
    const netGSTPayable = gstCollected - gstPaid;

    return (
        <section className="p-8 rounded-3xl bg-[#0f172a] border border-white/5 relative overflow-hidden mt-8">
            <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        GST Cash Flow Visualizer
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Understanding why you have cash but also have to pay GST.</p>
                </div>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 block">Monthly Sales (₹)</label>
                    <input
                        type="number"
                        value={monthlySales}
                        onChange={(e) => setMonthlySales(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <label className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 block">Monthly Purchases (₹)</label>
                    <input
                        type="number"
                        value={monthlyPurchases}
                        onChange={(e) => setMonthlyPurchases(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {/* Scenario 1: Collecting GST */}
                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <h3 className="font-bold text-emerald-400 mb-4 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" /> Usage of Cash Collected
                    </h3>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs text-center p-1">
                            Invoice {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(salesWithGST)}
                        </div>
                        <div className="flex-1 h-1 bg-gradient-to-r from-slate-700 to-slate-700 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-[#0f172a] px-2 text-[10px] text-slate-500">Split</div>
                        </div>
                        <div className="w-16 h-16 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs text-center p-1">
                            Yours {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(monthlySales)}
                        </div>
                        <div className="w-16 h-16 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-xs text-center p-1">
                            Govt's {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(gstCollected)}
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                        <span className="font-bold text-white">Danger:</span> Founders often spend the "Govt's {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(gstCollected)}" on burn, thinking it's their cash. When the 20th of the month comes, they panic.
                    </p>
                </div>

                {/* Scenario 2: Input Credit */}
                <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <h3 className="font-bold text-indigo-400 mb-4 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Input Credit Trap
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Purchase Bill Paid:</span>
                            <span className="text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlyPurchases * (1 + gstRate))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Expense Recognised:</span>
                            <span className="text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlyPurchases)}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-amber-400">Cash Locked (ITC):</span>
                            <span className="text-amber-400">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gstPaid)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-white/5">
                            <span className={netGSTPayable >= 0 ? "text-rose-400" : "text-emerald-400"}>Net GST {netGSTPayable >= 0 ? 'Payable' : 'Refund'}:</span>
                            <span className={netGSTPayable >= 0 ? "text-rose-400" : "text-emerald-400"}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(netGSTPayable))}</span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                        You paid {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(monthlyPurchases * (1 + gstRate))} cash, but only {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(monthlyPurchases)} counts as expense on EBITDA. The {new Intl.NumberFormat('en-IN', { notation: 'compact', style: 'currency', currency: 'INR' }).format(gstPaid)} is asset (ITC) sitting with Govt until you have output liability to offset it against.
                        <br /><span className="font-bold text-white">Result: Less Cash than P&L suggests.</span>
                    </p>
                </div>
            </div>
        </section>
    );
}
