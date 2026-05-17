'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Download, Copy, Check, Loader2,
    TrendingUp, TrendingDown, DollarSign,
    Users, Clock, Target, FileText, Zap,
    ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { useCfoStateStore, formatRunway } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';

interface InvestorReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InvestorReportModal({ isOpen, onClose }: InvestorReportModalProps) {
    const user = useAuthStore((state) => state.user);
    const profile = useStartupProfileStore((s) => s.profile);
    const cfoState = useCfoStateStore((s) => s.state);
    const resolutionPath = useCfoStateStore((s) => s.resolutionPath);

    const reportRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const isCrisis = cfoState && cfoState.summary.runwayMonths < 3 && cfoState.summary.runwayMonths > 0;
    const isResolutionMode = !!resolutionPath;
    const reportTitleText = isResolutionMode ? 'Strategic Restructuring / Exit Update' : (isCrisis ? 'Wartime Survival Update' : 'Monthly Investor Update');

    // Fetch financial data
    const { data: stats } = useQuery({
        queryKey: ['financial-stats-report', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/financial-metrics/stats');
            return res.data;
        },
        enabled: isOpen && !!user?.organizationId,
    });

    // Fetch latest decisions
    const { data: decisions } = useQuery({
        queryKey: ['decisions-report', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/cfo-engine/decisions');
            return res.data?.slice?.(0, 3) || [];
        },
        enabled: isOpen && !!user?.organizationId,
    });

    const companyName = profile?.companyName || 'Your Startup';
    const monthlyRevenue = Number(stats?.totalRevenue || profile?.monthlyRevenue || 0);
    const monthlyBurn = Number(stats?.monthlyBurn || profile?.monthlyExpenses || 0);
    
    // Wartime Math: Tax-Adjusted Capital (Indian Ghost Hard-Lock)
    const grossCash = Number(profile?.cashInBank || 0);
    const survivalCapital = isCrisis ? grossCash * 0.72 : grossCash; // 28% Locked
    
    const netBurn = monthlyBurn - monthlyRevenue;
    const runway = cfoState ? cfoState.summary.runwayMonths : (netBurn > 0 ? grossCash / netBurn : 999);
    const teamSize = profile?.teamSize || 0;
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)} K`;
        return `₹${amount}`;
    };

    // Copy report text to clipboard
    const handleCopy = async () => {
        const reportText = generatePlainTextReport();
        await navigator.clipboard.writeText(reportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // Download as HTML/print-ready
    const handleDownload = async () => {
        setDownloading(true);
        try {
            const content = reportRef.current;
            if (!content) return;

            // Create a print-friendly version
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups for PDF download');
                return;
            }

            printWindow.document.write(`
                <html>
                <head>
                    <title>${companyName} — Investor Update ${monthName}</title>
                    <style>
                        body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a2e; }
                        h1 { font-size: 24px; margin-bottom: 8px; }
                        h2 { font-size: 16px; margin-top: 28px; color: #6366f1; text-transform: uppercase; letter-spacing: 2px; }
                        .subtitle { color: #64748b; font-size: 14px; }
                        .metric-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 16px 0; }
                        .metric { padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
                        .metric-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
                        .metric-value { font-size: 24px; font-weight: 800; }
                        .decision { padding: 12px; border-left: 3px solid #6366f1; margin: 8px 0; background: #f8fafc; border-radius: 0 8px 8px 0; }
                        .decision-title { font-weight: 700; }
                        .decision-summary { font-size: 13px; color: #64748b; }
                        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>${companyName}</h1>
                    <p class="subtitle">${reportTitleText} — ${monthName}</p>
                    
                    <h2>Key Metrics ${isCrisis ? '(Survival Mode)' : ''}</h2>
                    <div class="metric-grid">
                        <div class="metric">
                            <p class="metric-label">${isCrisis ? 'Net Recovery' : 'Monthly Revenue'}</p>
                            <p class="metric-value" style="color: #10b981">${formatCurrency(monthlyRevenue)}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">${isCrisis ? 'Burn Severity' : 'Monthly Burn'}</p>
                            <p class="metric-value" style="color: #f43f5e">${formatCurrency(monthlyBurn)}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">${isCrisis ? 'Oxygen Clock' : 'Runway'}</p>
                            <p class="metric-value" style="color: ${runway < 3 ? '#f43f5e' : runway < 6 ? '#f59e0b' : '#10b981'}">
                                ${isCrisis ? formatRunway(runway) : (runway >= 999 ? 'Profitable' : runway.toFixed(1) + ' mo')}
                            </p>
                        </div>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <p class="metric-label">${isCrisis ? 'Survival Capital' : 'Cash in Bank'}</p>
                            <p class="metric-value">${formatCurrency(survivalCapital)}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">Net Burn</p>
                            <p class="metric-value">${formatCurrency(netBurn > 0 ? netBurn : 0)}</p>
                        </div>
                        <div class="metric">
                            <p class="metric-label">Team Size</p>
                            <p class="metric-value">${teamSize}</p>
                        </div>
                    </div>

                    <h2>${isCrisis ? 'Defensive Action Log' : 'Key Decisions'}</h2>
                    ${(decisions || []).map((d: any) => `
                        <div class="decision">
                            <p class="decision-title">${d.title || d.decisionDomain || 'Strategic Decision'}</p>
                            <p class="decision-summary">${d.summary || d.recommendation || ''}</p>
                        </div>
                    `).join('')}

                    <div class="footer">
                        <p>Generated by FounderCFO · ${now.toLocaleDateString()}</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        } finally {
            setDownloading(false);
        }
    };

    const generatePlainTextReport = () => {
        return `${companyName} — ${reportTitleText}\n${monthName}\n\n` +
            `KEY METRICS\n` +
            `─────────────────────────────\n` +
            `MRR:           ${formatCurrency(monthlyRevenue)}\n` +
            `Monthly Burn:  ${formatCurrency(monthlyBurn)}\n` +
            `Cash in Bank:  ${formatCurrency(grossCash)}\n` +
            `Runway:        ${runway >= 999 ? 'Profitable' : runway.toFixed(1) + ' months'}\n` +
            `Team Size:     ${teamSize}\n\n` +
            `KEY DECISIONS\n` +
            `─────────────────────────────\n` +
            (decisions || []).map((d: any) => `• ${d.title || d.decisionDomain}: ${d.summary || d.recommendation || ''}`).join('\n') +
            `\n\n---\nGenerated by FounderCFO · ${now.toLocaleDateString()}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="glass-card rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-hide"
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Investor Update</h2>
                                <p className="text-xs text-slate-400">{monthName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                Download PDF
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div ref={reportRef} className="p-8 space-y-8">
                        {/* Company Header */}
                        <div>
                            <h1 className="text-2xl font-bold text-white">{companyName}</h1>
                            <p className="text-slate-400 text-sm">{reportTitleText} — {monthName}</p>
                        </div>

                        {/* Key Metrics Grid */}
                        <div>
                            <h3 className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mb-4",
                                isCrisis ? "text-rose-500" : "text-primary"
                            )}>{isCrisis ? 'Survival Status (Wartime)' : 'Key Metrics'}</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{isCrisis ? 'Recovery' : 'MRR'}</p>
                                    <p className="text-xl font-black text-emerald-400 mt-1">{formatCurrency(monthlyRevenue)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{isCrisis ? 'Burn Severity' : 'Monthly Burn'}</p>
                                    <p className="text-xl font-black text-rose-400 mt-1">{formatCurrency(monthlyBurn)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{isCrisis ? 'Oxygen Left' : 'Runway'}</p>
                                    <p className={cn(
                                        "text-xl font-black mt-1",
                                        runway < 3 ? 'text-rose-400' : runway < 6 ? 'text-amber-400' : 'text-emerald-400'
                                    )}>
                                        {isCrisis ? formatRunway(runway) : (runway >= 999 ? 'Profitable' : `${runway.toFixed(1)} mo`)}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-3">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{isCrisis ? 'Survival Capital' : 'Cash in Bank'}</p>
                                    <p className="text-xl font-black text-white mt-1">{formatCurrency(survivalCapital)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Net Burn</p>
                                    <p className="text-xl font-black text-white mt-1">{formatCurrency(netBurn > 0 ? netBurn : 0)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Team Size</p>
                                    <p className="text-xl font-black text-white mt-1">{teamSize}</p>
                                </div>
                            </div>
                        </div>

                        {/* Key Decisions */}
                        <div>
                            <h3 className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mb-4",
                                isCrisis ? "text-rose-500" : "text-primary"
                            )}>{isCrisis ? 'Defensive Action Log' : 'Major Decisions This Month'}</h3>
                            <div className="space-y-3">
                                {decisions && decisions.length > 0 ? decisions.map((d: any, i: number) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border-l-2 border-primary">
                                        <p className="text-sm font-bold text-white">{d.title || d.decisionDomain || 'Strategic Decision'}</p>
                                        <p className="text-xs text-slate-400 mt-1">{d.summary || d.recommendation || ''}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500">No major decisions this month yet. Run the CFO engine to generate strategic recommendations.</p>
                                )}
                            </div>
                        </div>

                        {/* Asks Section */}
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
                            <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Asks</h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                                    Introductions to potential customers in {profile?.industry || 'our target market'}
                                </li>
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                                    Feedback on our go-to-market strategy
                                </li>
                            </ul>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                            <p className="text-[10px] text-slate-600">Generated by FounderCFO · {now.toLocaleDateString()}</p>
                            <p className="text-[10px] text-slate-600">Confidential — for investors only</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
