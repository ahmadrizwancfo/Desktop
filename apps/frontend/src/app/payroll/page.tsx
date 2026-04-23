'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Users, DollarSign, Calendar, Wallet, Database } from 'lucide-react';

export default function PayrollPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white">Payroll</h1>
                    <p className="text-slate-400 mt-1">Manage salaries, TDS deductions, and payroll approvals.</p>
                </div>

                {/* Honest Empty State */}
                <div className="glass-card rounded-3xl p-12 text-center border-dashed border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-indigo-500/50" />

                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 text-primary/50" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3">Payroll Coming Soon</h2>
                    <p className="text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
                        Payroll management will be powered by your real employee data and financial integrations.
                        This feature will include automated salary processing, TDS calculation, PF/ESIC tracking,
                        and direct bank disbursement.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                        {[
                            { icon: DollarSign, label: 'Salary Processing', desc: 'Auto-calculate net pay with TDS' },
                            { icon: Calendar, label: 'Compliance Calendar', desc: 'PF, ESIC, TDS filing reminders' },
                            { icon: Wallet, label: 'Bank Disbursement', desc: 'One-click bulk salary payments' },
                        ].map((feature, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
                                <feature.icon className="w-5 h-5 text-primary/50 mb-2" />
                                <p className="text-sm font-bold text-white/80">{feature.label}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 text-xs font-bold cursor-not-allowed">
                        <Database className="w-4 h-4" />
                        Connect HR System (Coming Soon)
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
