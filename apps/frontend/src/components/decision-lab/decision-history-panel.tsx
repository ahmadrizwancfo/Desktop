'use client';

import React from 'react';

export interface DecisionHistoryRecord {
    id: string;
    name: string;
    createdAt: string;
    status: 'DRAFT' | 'SIMULATED' | 'ACCEPTED' | 'REJECTED';
    safestOptionName: string;
    baseZeroCashDate: string;
    bestZeroCashDate: string;
    scenariosCount: number;
    founderNotes?: string;
}

interface DecisionHistoryPanelProps {
    history: DecisionHistoryRecord[];
    onReopenSimulation: (recordId: string) => void;
    onClearHistory: () => void;
}

export function DecisionHistoryPanel({ history, onReopenSimulation, onClearHistory }: DecisionHistoryPanelProps) {
    if (history.length === 0) {
        return (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                No past decision simulations saved yet.
            </div>
        );
    }

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📜</span> Persistent Decision History ({history.length})
                </h4>
                <button
                    onClick={onClearHistory}
                    className="text-[10px] text-slate-500 hover:text-rose-400"
                >
                    Clear History
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div>
                            <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white">{item.name}</h5>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    item.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' :
                                    item.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' :
                                    'bg-indigo-500/20 text-indigo-400'
                                }`}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {new Date(item.createdAt).toLocaleDateString()} • {item.scenariosCount} Scenarios • Zero Cash: {item.bestZeroCashDate}
                            </p>
                        </div>
                        <button
                            onClick={() => onReopenSimulation(item.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-semibold rounded border border-slate-700"
                        >
                            Reopen
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
