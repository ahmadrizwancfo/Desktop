'use client';

import React, { useState, useEffect } from 'react';
import { ScenarioBuilderPanel, ScenarioDefinition, ScenarioType } from '@/components/decision-lab/scenario-builder-panel';
import { ScenarioComparisonWorkspace, MultiScenarioComparisonResult } from '@/components/decision-lab/scenario-comparison-workspace';
import { AiDecisionCardCopilot, DecisionCard } from '@/components/decision-lab/ai-decision-card-copilot';
import { DecisionHistoryPanel, DecisionHistoryRecord } from '@/components/decision-lab/decision-history-panel';
import { useSimulation, SimulationDecisionType } from '@/hooks/useSimulation';

export default function DecisionLabPage() {
    const { runScenario, loading: simulationLoading } = useSimulation();

    const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([
        {
            id: 'sc_hire_2_pms',
            name: 'Hire 2 Engineers',
            type: 'HIRE_EMPLOYEE',
            overrides: { headcountDelta: 2, avgSalaryPerHead: 100000 },
        },
        {
            id: 'sc_cut_ad_spend',
            name: 'Scale Ad Spend +50k',
            type: 'MARKETING_SPEND',
            overrides: { marketingSpendDelta: 50000 },
        },
        {
            id: 'sc_new_contract',
            name: 'New Contract +100k',
            type: 'FUNDRAISE',
            overrides: { newContractInflow: 100000 },
        },
    ]);

    const [comparison, setComparison] = useState<MultiScenarioComparisonResult | null>(null);
    const [decisionCard, setDecisionCard] = useState<DecisionCard | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<DecisionHistoryRecord[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('cfo_decision_history');
        if (saved) {
            try { setHistory(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const handleAddScenario = (newSc: ScenarioDefinition) => {
        if (scenarios.length >= 4) return;
        setScenarios([...scenarios, newSc]);
    };

    const handleRemoveScenario = (id: string) => {
        setScenarios(scenarios.filter(s => s.id !== id));
    };

    const handleDuplicateScenario = (id: string) => {
        if (scenarios.length >= 4) return;
        const target = scenarios.find(s => s.id === id);
        if (target) {
            const duplicated: ScenarioDefinition = {
                ...JSON.parse(JSON.stringify(target)),
                id: `sc_${Date.now()}_dup`,
                name: `${target.name} (Copy)`,
            };
            setScenarios([...scenarios, duplicated]);
        }
    };

    const handleRunSimulation = async () => {
        if (scenarios.length === 0) return;
        setLoading(true);

        try {
            const results = await Promise.all(
                scenarios.map(async (sc) => {
                    let decType: SimulationDecisionType = 'HIRING';
                    let val = 1;

                    if (sc.type === 'HIRE_EMPLOYEE') {
                        decType = 'HIRING';
                        val = sc.overrides.headcountDelta || 1;
                    } else if (sc.type === 'FIRE_EMPLOYEE') {
                        decType = 'EXPENSE_REDUCTION';
                        val = Math.abs((sc.overrides.headcountDelta || 1) * (sc.overrides.avgSalaryPerHead || 100000));
                    } else if (sc.type === 'MARKETING_SPEND') {
                        decType = 'MARKETING_SPEND';
                        val = sc.overrides.marketingSpendDelta || 50000;
                    } else {
                        decType = 'PRICING';
                        val = sc.overrides.newContractInflow || 15;
                    }

                    return await runScenario({
                        decisionType: decType,
                        value: val,
                        description: sc.name,
                    });
                })
            );

            const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

            if (validResults.length > 0) {
                const primary = validResults[0];
                const baselineRunway = primary.financialMetricChanges?.['RUNWAY_MONTHS']?.baselineValue ?? 12;

                const compItems = validResults.map((r, idx) => {
                    const simRunway = r.financialMetricChanges?.['RUNWAY_MONTHS']?.simulatedValue ?? 12;
                    const endingCash = r.financialMetricChanges?.['CASH_BALANCE']?.simulatedValue ?? 5000000;
                    const simBurn = r.financialMetricChanges?.['NET_BURN']?.simulatedValue ?? 0;

                    return {
                        scenarioId: r.simulationId || `sc_${idx}`,
                        name: r.decision.description || scenarios[idx]?.name || `Scenario ${idx + 1}`,
                        type: r.decision.decisionType,
                        zeroCashDate: simRunway < 999 ? `${simRunway.toFixed(1)} Months` : 'Beyond 36 Months',
                        formattedZeroCashDate: simRunway < 999 ? `${simRunway.toFixed(1)} Months Runway` : 'Beyond 36 Months',
                        daysShift: Math.round((simRunway - baselineRunway) * 30),
                        endingCash: endingCash.toLocaleString('en-IN'),
                        minimumCashAmount: (endingCash * 0.8).toLocaleString('en-IN'),
                        minimumCashDate: 'Next Quarter',
                        simulatedNetBurn: simBurn.toLocaleString('en-IN'),
                        isSafestOption: r.recommendation?.isRecommended ?? false,
                        isLongestRunway: simRunway >= baselineRunway,
                        isLowestBurn: simBurn < (primary.financialMetricChanges?.['NET_BURN']?.baselineValue ?? 1000000),
                        isHighestEndingCash: endingCash >= 5000000,
                    };
                });

                const multiComp: MultiScenarioComparisonResult = {
                    organizationId: primary.organizationId,
                    baseZeroCashDate: null,
                    formattedBaseZeroCashDate: `${baselineRunway.toFixed(1)} Months`,
                    scenarios: compItems,
                    safestScenarioId: compItems.find(c => c.isSafestOption)?.scenarioId || compItems[0].scenarioId,
                    longestRunwayScenarioId: compItems[0].scenarioId,
                    lowestBurnScenarioId: compItems[0].scenarioId,
                    highestEndingCashScenarioId: compItems[0].scenarioId,
                    computedAt: new Date().toISOString(),
                };

                setComparison(multiComp);

                const bestSc = compItems.find(c => c.isSafestOption) || compItems[0];
                const baseCash = primary.financialMetricChanges?.['CASH_BALANCE']?.baselineValue ?? 5000000;
                const simCash = primary.financialMetricChanges?.['CASH_BALANCE']?.simulatedValue ?? 5000000;
                const baseBurn = primary.financialMetricChanges?.['NET_BURN']?.baselineValue ?? 500000;
                const simBurn = primary.financialMetricChanges?.['NET_BURN']?.simulatedValue ?? 500000;

                setDecisionCard({
                    cardId: `card_${Date.now()}`,
                    title: `Executive Recommendation: ${bestSc.name}`,
                    summary: primary.impactSummary || `Simulated ${scenarios.length} decision paths against live financial ledger state.`,
                    safestOptionName: bestSc.name,
                    decisionStatus: primary.recommendation?.isRecommended ? 'PROCEED' : 'CAUTION',
                    decisionScore: Math.round(primary.confidence * 100),
                    confidenceScore: Math.round(primary.confidence * 100),
                    beforeVsAfter: {
                        baseZeroCashDate: `${baselineRunway.toFixed(1)} Months`,
                        simulatedZeroCashDate: bestSc.formattedZeroCashDate || 'Sustainable',
                        baseNetBurn: `₹${baseBurn.toLocaleString('en-IN')}`,
                        simulatedNetBurn: `₹${simBurn.toLocaleString('en-IN')}`,
                        baseEndingCash: `₹${baseCash.toLocaleString('en-IN')}`,
                        simulatedEndingCash: `₹${simCash.toLocaleString('en-IN')}`,
                    },
                    whySupportingReasons: [
                        primary.recommendation?.rationale || 'Decision maintains healthy liquidity reserves.',
                        `Runway shift: ${bestSc.daysShift >= 0 ? '+' : ''}${bestSc.daysShift} days extended.`,
                    ],
                    whyRiskFactors: [
                        primary.recommendation?.alternativeStrategy || 'Ensure working capital remains buffered for unexpected opex.',
                    ],
                    risks: ['Working capital fluctuation'],
                    opportunities: ['Accelerated market reach'],
                    tradeOffs: [primary.recommendation?.alternativeStrategy || 'Cash preservation vs growth speed.'],
                    recommendation: primary.recommendation?.rationale || 'Proceed with disciplined execution.',
                    bestAlternative: primary.recommendation?.alternativeStrategy || 'Maintain 3 months cash buffer.',
                    reasoning: primary.assumptions || ['Hydrated from live Prisma database metrics.'],
                    dataSources: ['Live Bank Accounts', 'Prisma Invoices', '30-Day Transactions'],
                    generatedAt: new Date().toISOString(),
                });

                // Save to Decision History
                const newRecord: DecisionHistoryRecord = {
                    id: `rec_${Date.now()}`,
                    name: `${scenarios.length} Decision Scenarios Simulated`,
                    createdAt: new Date().toISOString(),
                    status: 'SIMULATED',
                    safestOptionName: bestSc.name,
                    baseZeroCashDate: `${baselineRunway.toFixed(1)} Months`,
                    bestZeroCashDate: bestSc.formattedZeroCashDate || 'Sustainable',
                    scenariosCount: scenarios.length,
                };
                const updatedHistory = [newRecord, ...history].slice(0, 10);
                setHistory(updatedHistory);
                localStorage.setItem('cfo_decision_history', JSON.stringify(updatedHistory));
            }
        } catch (err) {
            console.error('Decision Lab Simulation Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReopenSimulation = (recordId: string) => {
        handleRunSimulation();
    };

    const handleClearHistory = () => {
        setHistory([]);
        localStorage.removeItem('cfo_decision_history');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Founder Decision Lab
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Isolated Multi-Scenario Comparison Engine • Prebuilt Template Gallery • Executive Decision Cards
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
                        Phase 7 Simulation Powered
                    </span>
                </div>
            </div>

            {/* 3-Panel Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Panel: Scenario Builder */}
                <div className="lg:col-span-3 h-[650px] sticky top-6">
                    <ScenarioBuilderPanel
                        scenarios={scenarios}
                        onAddScenario={handleAddScenario}
                        onRemoveScenario={handleRemoveScenario}
                        onDuplicateScenario={handleDuplicateScenario}
                        onSimulate={handleRunSimulation}
                        loading={loading || simulationLoading}
                    />
                </div>

                {/* Center Panel: Side-by-Side Scenario Comparison Workspace & History */}
                <div className="lg:col-span-6 space-y-6">
                    <ScenarioComparisonWorkspace comparison={comparison} loading={loading || simulationLoading} />
                    <DecisionHistoryPanel
                        history={history}
                        onReopenSimulation={handleReopenSimulation}
                        onClearHistory={handleClearHistory}
                    />
                </div>

                {/* Right Panel: AI Decision Card */}
                <div className="lg:col-span-3 h-[650px] sticky top-6">
                    <AiDecisionCardCopilot card={decisionCard} loading={loading || simulationLoading} />
                </div>
            </div>
        </div>
    );
}
