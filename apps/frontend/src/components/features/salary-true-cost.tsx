'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Info, Plus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SalaryTrueCost() {
    const [ctc, setCtc] = useState(1200000); // 12 LPA default

    // Assumptions for India
    const stats = {
        monthlyCTC: ctc / 12,
        employerPF: (ctc / 12) * 0.4 * 0.12, // Assuming Basic is 40% of CTC
        gratuity: (ctc / 12) * 0.4 * 0.0481,
        insurance: 500, // Fixed monthly estimate per employee
        softwareLicenses: 3500, // GSuite, Slack, Jira avg
        laptopDepreciation: 2500, // Mac/Windows amortized
    };

    const totalTrueCost = stats.monthlyCTC + stats.employerPF + stats.gratuity + stats.insurance + stats.softwareLicenses + stats.laptopDepreciation;
    const hiddenCostPercentage = ((totalTrueCost - stats.monthlyCTC) / stats.monthlyCTC) * 100;

    return (
        <section className="p-8 rounded-3xl bg-[#0f172a] border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-primary" />
                        Salary True Cost Calculator
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">See the actual burn impact of a new hire, including hidden compliance & overhead costs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                {/* Input Area */}
                <div className="space-y-8">
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 block">Annual CTC (₹)</label>
                        <div className="flex items-center gap-4 mb-4">
                            <input
                                type="number"
                                value={ctc}
                                onChange={(e) => setCtc(parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-2xl font-bold text-white focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <input
                            type="range" min="300000" max="5000000" step="50000"
                            value={ctc} onChange={(e) => setCtc(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                            <span>₹3 LPA</span>
                            <span>₹50 LPA</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-200">
                            <span className="font-bold">Founder Insight:</span> While you offered ₹{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(ctc)}, this employee will actually cost you <span className="underline font-bold">₹{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(totalTrueCost * 12)}/year</span>. Budget accordingly.
                        </div>
                    </div>
                </div>

                {/* Breakdown Area */}
                <div className="bg-[#0f172a] rounded-2xl border border-white/5 p-6 relative">
                    <div className="absolute -top-4 -right-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20">
                        +{hiddenCostPercentage.toFixed(1)}% Hidden Cost
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-white font-medium">Base Monthly CTC</span>
                            <span className="text-white font-bold text-lg">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.monthlyCTC)}</span>
                        </div>

                        {[
                            { label: "Employer PF (12%)", value: stats.employerPF, sub: "Statutory" },
                            { label: "Gratuity Accrual (4.81%)", value: stats.gratuity, sub: "Long-term liability" },
                            { label: "Health Insurance", value: stats.insurance, sub: "Avg per employee" },
                            { label: "Software & Tools", value: stats.softwareLicenses, sub: "GSuite, Slack, Jira" },
                            { label: "Device Amortization", value: stats.laptopDepreciation, sub: "Laptop cost over 3 yrs" }
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <Plus className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-400">{item.label}</span>
                                    <span className="text-[10px] bg-white/5 px-1.5 rounded text-slate-500">{item.sub}</span>
                                </div>
                                <span className="text-slate-300 font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.value)}</span>
                            </div>
                        ))}

                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total True Cost</div>
                            <div className="text-3xl font-black text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalTrueCost)}<span className="text-sm text-slate-500 font-medium">/mo</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
