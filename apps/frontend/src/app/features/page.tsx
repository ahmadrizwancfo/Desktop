'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RunwaySimulator } from '@/components/features/runway-simulator';
import { SalaryTrueCost } from '@/components/features/salary-true-cost';
import { GSTCashImpact } from '@/components/features/gst-cash-impact';
import { MonthlyFounderReport } from '@/components/reports/monthly-founder-report';
import { cn } from '@/lib/utils';
import { Calculator, FileText, IndianRupee } from 'lucide-react';

export default function FeaturesPage() {
    const [activeTab, setActiveTab] = useState<'simulator' | 'compliance' | 'report'>('simulator');

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">CFO Power Tools</h1>
                        <p className="text-slate-400 mt-1">Advanced simulations and calculators for strategic decision making.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/5 pb-1">
                        {[
                            { id: 'simulator', label: 'Runway Simulator', icon: Calculator },
                            { id: 'compliance', label: 'India Compliance', icon: IndianRupee },
                            { id: 'report', label: 'Founder Reports', icon: FileText }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all",
                                    activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-slate-400 hover:text-white"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[600px]">
                    {activeTab === 'simulator' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <RunwaySimulator />
                        </div>
                    )}

                    {activeTab === 'compliance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SalaryTrueCost />
                            <GSTCashImpact />
                        </div>
                    )}

                    {activeTab === 'report' && (
                        <div className="bg-slate-100 rounded-2xl p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-slate-900 font-bold">Print Preview</h3>
                                <button className="px-4 py-2 bg-white border shadow-sm rounded-lg text-xs font-bold text-slate-900">
                                    Download PDF
                                </button>
                            </div>
                            <div className="scale-[0.8] origin-top md:scale-100">
                                <MonthlyFounderReport />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
