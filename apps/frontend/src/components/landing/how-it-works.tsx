'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    ShieldCheck, 
    Lock, 
    FileText, 
    CheckCircle2, 
    Database, 
    Building2, 
    Server
} from 'lucide-react';
import { cn } from '@/lib/utils';

const banks = [
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "State Bank of India",
    "Kotak Mahindra",
    "Tally Prime XML"
];

export function HowItWorks() {
    return (
        <section id="trust" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/5">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>QUIET TRUST & PROVENANCE</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                    We never ask for your bank passwords.
                </h2>
                <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                    Trust is not built with flashy security badges. It is built through transparent behavior. You upload standard statements you already export; the engine verifies the numbers.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-7 flex flex-col justify-between hover:border-white/15 transition-all">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300 mb-6">
                            <Lock className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Read-Only Statement Ingestion</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            No scraping bots or screen-login credentials. Simply drop the CSV or PDF your bank already provides.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-white/5 text-xs font-mono text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Zero banking password storage</span>
                    </div>
                </div>

                <div className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-7 flex flex-col justify-between hover:border-white/15 transition-all">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300 mb-6">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Double-Entry Reconciliation</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Every number connects to verifiable transaction vouchers. Zero AI hallucinations in your cash calculations.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-white/5 text-xs font-mono text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Decimal.js arbitrary-precision math</span>
                    </div>
                </div>

                <div className="rounded-2xl bg-[#0a0f1e] border border-white/5 p-7 flex flex-col justify-between hover:border-white/15 transition-all">
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300 mb-6">
                            <Server className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Your Records Remain Yours</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Financial records are encrypted at rest (AES-256) with strict multi-tenant database isolation. Zero data selling.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-white/5 text-xs font-mono text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Isolated tenant row security</span>
                    </div>
                </div>
            </div>

            {/* Supported Banks Strip */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                    VERIFIED EXPORT COMPATIBILITY
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {banks.map((b, i) => (
                        <span 
                            key={i}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300"
                        >
                            {b}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
