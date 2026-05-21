'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FinancialDisclaimer() {
    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className="mt-16 pt-8 border-t border-white/5">
            {/* Desktop View */}
            <div className="hidden md:block text-[10px] text-slate-600 text-center leading-relaxed max-w-2xl mx-auto">
                <p>
                    <AlertTriangle className="w-3 h-3 inline-block mr-1 -mt-0.5 text-amber-500" />
                    <strong>Disclaimer:</strong> FounderCFO is an AI-powered tool. Always consult your Chartered Accountant for critical financial decisions.
                    This platform provides financial insights for informational purposes only and is <strong>not a substitute for professional CA, tax, or legal advice</strong>.
                    All metrics are derived from user-uploaded data and may contain inaccuracies.
                </p>
            </div>

            {/* Mobile View - Collapsible */}
            <div className="block md:hidden max-w-md mx-auto px-4">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-bold text-slate-500 hover:bg-white/[0.04] transition-all"
                >
                    <span className="flex items-center gap-2 text-left">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>AI Financial Disclosure & Disclaimer</span>
                    </span>
                    {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>

                {!collapsed && (
                    <div className="p-4 mt-2 rounded-xl bg-white/[0.01] border border-white/5 text-[9px] text-slate-600 leading-relaxed space-y-2 animate-fadeIn">
                        <p>
                            <strong>Important Notice:</strong> FounderCFO is an AI-powered tool. Always consult your Chartered Accountant for critical financial decisions.
                        </p>
                        <p>
                            This platform provides predictive simulations, risk analysis, and cash calculations for informational and planning purposes only. It does not constitute professional CA, audit, tax filing, or legal counsel.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
