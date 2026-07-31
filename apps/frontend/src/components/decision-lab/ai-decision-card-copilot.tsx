'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export interface DecisionCard {
    cardId: string;
    title: string;
    summary: string;
    safestOptionName: string;
    decisionStatus: 'PROCEED' | 'CAUTION' | 'HIGH_RISK';
    decisionScore: number;
    confidenceScore: number;
    beforeVsAfter: {
        baseZeroCashDate: string;
        simulatedZeroCashDate: string;
        baseNetBurn: string;
        simulatedNetBurn: string;
        baseEndingCash: string;
        simulatedEndingCash: string;
    };
    whySupportingReasons: string[];
    whyRiskFactors: string[];
    risks: string[];
    opportunities: string[];
    tradeOffs: string[];
    recommendation: string;
    bestAlternative: string;
    reasoning: string[];
    dataSources: string[];
    generatedAt: string;
}

interface AiDecisionCardCopilotProps {
    card: DecisionCard | null;
    loading: boolean;
}

export function AiDecisionCardCopilot({ card, loading }: AiDecisionCardCopilotProps) {
    const [showReasoning, setShowReasoning] = useState(false);
    const [preparingAction, setPreparingAction] = useState(false);
    const router = useRouter();

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Evaluating Decision Score & Generating Visual Card...</p>
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl text-center text-slate-500">
                <span className="text-2xl mb-1 block">📋</span>
                <p className="text-xs">Executive Decision Card will render once scenarios are simulated.</p>
            </div>
        );
    }

    const handleExport = () => {
        window.print();
    };

    const handlePrepareActionCenter = async () => {
        setPreparingAction(true);
        try {
            const res = await apiClient.post('/cfo-engine/action-center/prepare', {
                sourceModule: 'DecisionLab',
                actionType: 'MARKETING_BUDGET_ADJUSTMENT',
                title: `Execute Recommendation: ${card.safestOptionName}`,
                urgency: card.decisionStatus === 'HIGH_RISK' ? 'CRITICAL' : 'HIGH',
                financialImpact: card.beforeVsAfter.simulatedEndingCash.replace(/[^0-9.]/g, '') || '50000',
                payload: {
                    recipientEmail: 'board@company.com',
                    subject: `Decision Lab Approval Request: ${card.safestOptionName}`,
                    body: `Recommendation: ${card.recommendation}\nSummary: ${card.summary}\nZero Cash Date: ${card.beforeVsAfter.simulatedZeroCashDate}`,
                },
            });

            if (res.status === 200 || res.status === 201) {
                router.push('/action-center');
            }
        } catch (e) {
            console.error('Failed to prepare action from Decision Card:', e);
        } finally {
            setPreparingAction(false);
        }
    };

    const statusBg = 
        card.decisionStatus === 'PROCEED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
        card.decisionStatus === 'CAUTION' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
        'bg-rose-500/20 text-rose-400 border-rose-500/40';

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col h-full print:bg-white print:text-black">
            {/* Executive Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:border-black">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <div>
                        <h3 className="text-sm font-bold text-white print:text-black">Executive Decision Card</h3>
                        <p className="text-[10px] text-slate-400 print:text-gray-600">Decision Score: {card.decisionScore}/100</p>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg transition print:hidden"
                >
                    📄 Export PDF
                </button>
            </div>

            {/* Card Content Container */}
            <div className="flex-1 space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-y-auto print:bg-white print:border-gray-300">
                {/* Decision Status & Score Gauge */}
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800 print:bg-gray-100">
                    <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Executive Decision Verdict</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${statusBg}`}>
                                {card.decisionStatus}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Decision Score</span>
                        <p className="text-2xl font-black text-white print:text-black">{card.decisionScore}<span className="text-xs text-slate-400">/100</span></p>
                    </div>
                </div>

                {/* Title & Summary */}
                <div>
                    <h2 className="text-sm font-black text-white print:text-black">{card.title}</h2>
                    <p className="text-xs text-slate-300 print:text-gray-700 mt-1">{card.summary}</p>
                </div>

                {/* Before vs After Matrix */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5 print:bg-gray-50">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Before vs After Comparison</h4>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                        <span className="text-slate-400">Zero Cash Date:</span>
                        <span className="font-mono text-slate-200">{card.beforeVsAfter.baseZeroCashDate} ➔ <strong className="text-emerald-400">{card.beforeVsAfter.simulatedZeroCashDate}</strong></span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                        <span className="text-slate-400">Monthly Net Burn:</span>
                        <span className="font-mono text-slate-200">{card.beforeVsAfter.baseNetBurn} ➔ <strong className="text-white">{card.beforeVsAfter.simulatedNetBurn}</strong></span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Ending 90-Day Cash:</span>
                        <span className="font-mono text-slate-200">{card.beforeVsAfter.baseEndingCash} ➔ <strong className="text-emerald-400">{card.beforeVsAfter.simulatedEndingCash}</strong></span>
                    </div>
                </div>

                {/* Why This Recommendation? */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Why This Recommendation?</h4>
                    <ul className="space-y-1 text-xs">
                        {card.whySupportingReasons.map((reason, idx) => (
                            <li key={idx} className="text-emerald-300 flex items-start gap-1.5">
                                <span className="font-bold">✓</span> {reason}
                            </li>
                        ))}
                        {card.whyRiskFactors.map((risk, idx) => (
                            <li key={idx} className="text-amber-300 flex items-start gap-1.5">
                                <span className="font-bold">⚠</span> {risk}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Recommendation Callout */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">Top Recommendation</span>
                    <p className="text-xs text-emerald-100 font-semibold">{card.recommendation}</p>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-emerald-900/40 font-mono">{card.bestAlternative}</p>
                </div>

                {/* Seamless Action Preparation Button */}
                <button
                    onClick={handlePrepareActionCenter}
                    disabled={preparingAction}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/50 print:hidden flex items-center justify-center gap-1.5"
                >
                    <span>⚡</span> {preparingAction ? 'Preparing Action...' : 'Prepare Action in Action Center ➔'}
                </button>

                {/* Reasoning Toggle */}
                <div className="pt-2 border-t border-slate-800 print:hidden">
                    <button
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                        🧠 {showReasoning ? 'Hide AI Reasoning Steps' : 'View AI Reasoning Steps'}
                    </button>
                    {showReasoning && (
                        <div className="mt-2 p-2.5 bg-slate-900 rounded-lg space-y-1 font-mono text-[10px] text-slate-400">
                            {card.reasoning.map((step, idx) => (
                                <p key={idx}>{step}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
