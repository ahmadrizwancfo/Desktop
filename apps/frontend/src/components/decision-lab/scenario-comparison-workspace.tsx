'use client';

import React from 'react';

export interface ScenarioComparisonItem {
    scenarioId: string;
    name: string;
    type: string;
    zeroCashDate: string | null;
    formattedZeroCashDate: string | null;
    daysShift: number;
    endingCash: string;
    minimumCashAmount: string;
    minimumCashDate: string;
    simulatedNetBurn: string;
    isSafestOption: boolean;
    isLongestRunway: boolean;
    isLowestBurn: boolean;
    isHighestEndingCash: boolean;
}

export interface MultiScenarioComparisonResult {
    organizationId: string;
    baseZeroCashDate: string | null;
    formattedBaseZeroCashDate: string | null;
    scenarios: ScenarioComparisonItem[];
    safestScenarioId: string;
    longestRunwayScenarioId: string;
    lowestBurnScenarioId: string;
    highestEndingCashScenarioId: string;
    computedAt: string;
}

interface ScenarioComparisonWorkspaceProps {
    comparison: MultiScenarioComparisonResult | null;
    loading: boolean;
}

export function ScenarioComparisonWorkspace({ comparison, loading }: ScenarioComparisonWorkspaceProps) {
    if (loading) {
        return (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Running Parallel Isolated Memory Simulations...</p>
                </div>
            </div>
        );
    }

    if (!comparison || comparison.scenarios.length === 0) {
        return (
            <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                <span className="text-3xl mb-2 block">🔬</span>
                <p className="text-sm font-semibold text-slate-200">Founder Decision Lab Ready</p>
                <p className="text-xs text-slate-400 mt-1">Select a decision template from the left panel and click &quot;Run Side-by-Side Comparison&quot;.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Summary Banner */}
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            Multi-Scenario Winner Evaluation
                        </span>
                        <h1 className="text-xl md:text-2xl font-black text-white mt-2">
                            Comparing {comparison.scenarios.length} Decision Paths
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Baseline Zero Cash Date: <span className="font-semibold text-white">{comparison.formattedBaseZeroCashDate || 'Beyond 90 Days'}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Side-by-Side Comparison Cards Grid (Responsive Scrollbar Wrapper) */}
            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[700px] md:min-w-0">
                    {comparison.scenarios.map((sc) => (
                        <div
                            key={sc.scenarioId}
                            className={`p-5 rounded-2xl border transition relative flex flex-col justify-between shrink-0 w-[280px] md:w-auto ${
                                sc.isSafestOption 
                                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40' 
                                    : 'bg-slate-900/80 border-slate-800'
                            }`}
                        >
                        {/* Winner Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            {sc.isSafestOption && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950">
                                    🛡️ Safest Option
                                </span>
                            )}
                            {sc.isLongestRunway && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500 text-white">
                                    🚀 Longest Runway
                                </span>
                            )}
                            {sc.isLowestBurn && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                                    📉 Lowest Burn
                                </span>
                            )}
                            {sc.isHighestEndingCash && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-cyan-500 text-slate-950">
                                    💰 Highest Cash
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-base font-black text-white">{sc.name}</h3>

                            {/* Zero Cash Date Box */}
                            <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Zero Cash Date</span>
                                <p className={`text-base font-extrabold mt-0.5 ${sc.formattedZeroCashDate ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {sc.formattedZeroCashDate || 'Beyond 90 Days'}
                                </p>
                                <span className={`text-[10px] font-mono mt-1 block ${sc.daysShift >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {sc.daysShift >= 0 ? `+${sc.daysShift} days extended` : `${sc.daysShift} days accelerated`}
                                </span>
                            </div>

                            {/* Metrics List */}
                            <div className="mt-4 space-y-2 text-xs">
                                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                    <span className="text-slate-400">Monthly Net Burn</span>
                                    <span className="font-mono font-semibold text-white">₹{sc.simulatedNetBurn}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                    <span className="text-slate-400">Lowest Cash Point</span>
                                    <span className="font-mono font-semibold text-white">₹{sc.minimumCashAmount}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                                    <span className="text-slate-400">Ending 90-Day Cash</span>
                                    <span className="font-mono font-semibold text-white">₹{sc.endingCash}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
}
