'use client';

import React, { useState } from 'react';

export type ScenarioType = 
    | 'HIRE_EMPLOYEE'
    | 'FIRE_EMPLOYEE'
    | 'MARKETING_SPEND'
    | 'REVENUE_CHANGE'
    | 'PAYMENT_DELAY'
    | 'CUSTOMER_CHURN'
    | 'OFFICE_LEASE'
    | 'LOAN_REPAYMENT'
    | 'FUNDRAISE'
    | 'CUSTOM';

export interface ScenarioDefinition {
    id: string;
    name: string;
    type: ScenarioType;
    overrides: {
        headcountDelta?: number;
        marketingSpendDelta?: number;
        newContractInflow?: number;
        avgSalaryPerHead?: number;
    };
    notes?: string;
}

const TEMPLATE_GALLERY = [
    { icon: '💼', name: 'Hire 2 Engineers', type: 'HIRE_EMPLOYEE' as ScenarioType, desc: 'Add engineering headcount', overrides: { headcountDelta: 2, avgSalaryPerHead: 100000 } },
    { icon: '✂️', name: 'Reduce 2 Seats', type: 'FIRE_EMPLOYEE' as ScenarioType, desc: 'Optimize headcount opex', overrides: { headcountDelta: -2, avgSalaryPerHead: 100000 } },
    { icon: '📣', name: 'Scale Ad Spend +50k', type: 'MARKETING_SPEND' as ScenarioType, desc: 'Increase paid acquisition', overrides: { marketingSpendDelta: 50000 } },
    { icon: '🚀', name: 'New Contract +100k', type: 'FUNDRAISE' as ScenarioType, desc: 'New enterprise client inflow', overrides: { newContractInflow: 100000 } },
    { icon: '📉', name: 'Revenue Decline -50k', type: 'REVENUE_CHANGE' as ScenarioType, desc: 'Simulate revenue drop', overrides: { newContractInflow: -50000 } },
    { icon: '⏳', name: 'Customer Payment Delay', type: 'PAYMENT_DELAY' as ScenarioType, desc: 'Simulate 30-day payment delay', overrides: { newContractInflow: -30000 } },
    { icon: '❌', name: 'Key Customer Churn', type: 'CUSTOMER_CHURN' as ScenarioType, desc: 'Lost major recurring account', overrides: { newContractInflow: -80000 } },
    { icon: '🤝', name: 'Vendor Cost Cut -30k', type: 'MARKETING_SPEND' as ScenarioType, desc: 'Renegotiate vendor contracts', overrides: { marketingSpendDelta: -30000 } },
    { icon: '🏢', name: 'New Office Lease', type: 'OFFICE_LEASE' as ScenarioType, desc: 'Monthly lease overhead', overrides: { marketingSpendDelta: 40000 } },
    { icon: '🚜', name: 'Equipment Capex', type: 'LOAN_REPAYMENT' as ScenarioType, desc: 'Hardware & equipment purchase', overrides: { marketingSpendDelta: 60000 } },
    { icon: '⚙️', name: 'Custom Scenario', type: 'CUSTOM' as ScenarioType, desc: 'Configure custom variables', overrides: { headcountDelta: 0, marketingSpendDelta: 0, newContractInflow: 0 } },
];

interface ScenarioBuilderPanelProps {
    scenarios: ScenarioDefinition[];
    onAddScenario: (scenario: ScenarioDefinition) => void;
    onRemoveScenario: (id: string) => void;
    onDuplicateScenario: (id: string) => void;
    onSimulate: () => void;
    loading: boolean;
}

export function ScenarioBuilderPanel({
    scenarios,
    onAddScenario,
    onRemoveScenario,
    onDuplicateScenario,
    onSimulate,
    loading,
}: ScenarioBuilderPanelProps) {
    const [showGallery, setShowGallery] = useState(false);
    const [naturalInput, setNaturalInput] = useState('');

    const handleSelectTemplate = (tpl: typeof TEMPLATE_GALLERY[0]) => {
        if (scenarios.length >= 4) return;
        const newScenario: ScenarioDefinition = {
            id: `sc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: tpl.name,
            type: tpl.type,
            overrides: tpl.overrides,
        };
        onAddScenario(newScenario);
        setShowGallery(false);
    };

    const handleNaturalLanguageParse = () => {
        if (!naturalInput.trim()) return;
        const lower = naturalInput.toLowerCase();
        let name = naturalInput;
        let headcountDelta = 0;
        let marketingSpendDelta = 0;
        let newContractInflow = 0;

        if (lower.includes('hire')) {
            const match = lower.match(/hire\s+(\d+)/);
            headcountDelta = match ? parseInt(match[1]) : 1;
            name = `Hire ${headcountDelta} Head(s)`;
        } else if (lower.includes('marketing') || lower.includes('ad')) {
            const match = lower.match(/(\d+)/);
            marketingSpendDelta = match ? parseInt(match[1]) : 50000;
            name = `Marketing +₹${marketingSpendDelta}`;
        } else if (lower.includes('revenue') || lower.includes('contract')) {
            const match = lower.match(/(\d+)/);
            newContractInflow = match ? parseInt(match[1]) : 100000;
            name = `Contract +₹${newContractInflow}`;
        }

        const parsedSc: ScenarioDefinition = {
            id: `sc_nl_${Date.now()}`,
            name,
            type: headcountDelta !== 0 ? 'HIRE_EMPLOYEE' : marketingSpendDelta !== 0 ? 'MARKETING_SPEND' : 'FUNDRAISE',
            overrides: { headcountDelta, marketingSpendDelta, newContractInflow, avgSalaryPerHead: 100000 },
        };

        onAddScenario(parsedSc);
        setNaturalInput('');
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🛠️</span>
                    <div>
                        <h3 className="text-sm font-bold text-white">Scenario Builder</h3>
                        <p className="text-[10px] text-slate-400">Template Gallery • Isolated Memory Math</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowGallery(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg transition"
                >
                    + Gallery
                </button>
            </div>

            {/* Natural Language Command Entry */}
            <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Natural Language Quick Entry</label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="text"
                        placeholder='e.g. Hire 2 engineers at 100k...'
                        value={naturalInput}
                        onChange={(e) => setNaturalInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageParse()}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleNaturalLanguageParse}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Template Gallery Modal */}
            {showGallery && (
                <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-xl space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">Select Decision Template</h4>
                        <button onClick={() => setShowGallery(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {TEMPLATE_GALLERY.map((tpl, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelectTemplate(tpl)}
                                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition space-y-0.5"
                            >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                    <span>{tpl.icon}</span>
                                    <span className="truncate">{tpl.name}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 line-clamp-1">{tpl.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Comparison Queue */}
            <div className="flex-1 space-y-2 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-400">Comparison Queue ({scenarios.length}/4)</h4>
                    {scenarios.length < 4 && (
                        <button onClick={() => setShowGallery(true)} className="text-[10px] text-indigo-400 hover:underline">
                            + Add Template
                        </button>
                    )}
                </div>

                {scenarios.map((sc, i) => (
                    <div key={sc.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                        <div>
                            <h5 className="text-xs font-bold text-white">{i + 1}. {sc.name}</h5>
                            <p className="text-[10px] text-slate-400 font-mono">
                                H:{sc.overrides.headcountDelta || 0} | M:₹{sc.overrides.marketingSpendDelta || 0} | IN:₹{sc.overrides.newContractInflow || 0}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onDuplicateScenario(sc.id)}
                                title="Duplicate"
                                className="p-1 text-xs text-slate-400 hover:text-white"
                            >
                                📋
                            </button>
                            {scenarios.length > 1 && (
                                <button
                                    onClick={() => onRemoveScenario(sc.id)}
                                    title="Remove"
                                    className="p-1 text-xs text-rose-400 hover:text-rose-300"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Run Action */}
            <button
                onClick={onSimulate}
                disabled={loading || scenarios.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-900/40"
            >
                {loading ? 'Simulating Scenarios...' : '⚡ Run Side-by-Side Comparison'}
            </button>
        </div>
    );
}
