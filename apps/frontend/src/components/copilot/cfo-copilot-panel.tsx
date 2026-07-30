'use client';

import React, { useState } from 'react';

export function CfoCopilotPanel() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [decision, setDecision] = useState<any>(null);
    const [showReasoning, setShowReasoning] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<'THUMBS_UP' | 'THUMBS_DOWN' | null>(null);

    const handleOrchestrate = async (customQuery?: string) => {
        const q = customQuery || query;
        if (!q.trim()) return;

        setLoading(true);
        setDecision(null);
        setFeedbackGiven(null);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/ai/orchestrate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ query: q }),
            });

            if (res.ok) {
                const data = await res.json();
                setDecision(data.decision);
            }
        } catch (err) {
            console.error('AI Orchestration error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFeedback = async (rating: 'THUMBS_UP' | 'THUMBS_DOWN') => {
        if (!decision) return;
        setFeedbackGiven(rating);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            await fetch('/api/ai/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    decisionId: decision.decisionId,
                    rating,
                    promptText: query,
                    responseText: decision.headline + ' | ' + decision.narrative,
                }),
            });
        } catch (err) {
            console.error('Feedback submission error:', err);
        }
    };

    return (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl flex flex-col h-full">
            {/* Copilot Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                        <h3 className="text-sm font-bold text-white">AI CFO Copilot</h3>
                        <p className="text-[10px] text-slate-400">Predictive Financial Agent • Stateful RAG</p>
                    </div>
                </div>
                {decision && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {Math.round((decision.confidenceScore || 0.95) * 100)}% Confidence
                    </span>
                )}
            </div>

            {/* Quick Slash Command Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                    onClick={() => { setQuery('When will I run out of money?'); handleOrchestrate('When will I run out of money?'); }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-full border border-slate-700 whitespace-nowrap"
                >
                    ⚡ When will I run out of money?
                </button>
                <button
                    onClick={() => { setQuery('Simulate hiring 2 engineers at 100k salary'); handleOrchestrate('Simulate hiring 2 engineers at 100k salary'); }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-full border border-slate-700 whitespace-nowrap"
                >
                    💼 Simulate Hiring
                </button>
                <button
                    onClick={() => { setQuery('Detect active tax and invoice risks'); handleOrchestrate('Detect active tax and invoice risks'); }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-full border border-slate-700 whitespace-nowrap"
                >
                    ⚠️ Detect Risks
                </button>
            </div>

            {/* AI Decision Output Box */}
            {loading ? (
                <div className="flex-1 p-6 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400">Executing RAG & Decision Tools...</span>
                </div>
            ) : decision ? (
                <div className="flex-1 space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 overflow-y-auto">
                    {/* Headline */}
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-black text-white">{decision.headline}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${decision.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {decision.domain}
                        </span>
                    </div>

                    {/* Narrative */}
                    <p className="text-xs text-slate-300 leading-relaxed">{decision.narrative}</p>

                    {/* Citations */}
                    {decision.dataSources && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1">
                            <span>Cited Sources:</span>
                            {decision.dataSources.map((s: string, idx: number) => (
                                <span key={idx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">{s}</span>
                            ))}
                        </div>
                    )}

                    {/* Thinking UI Toggle */}
                    {decision.reasoningSteps && (
                        <div className="pt-2">
                            <button
                                onClick={() => setShowReasoning(!showReasoning)}
                                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                                🧠 {showReasoning ? 'Hide AI Reasoning Steps' : 'View AI Reasoning Steps'}
                            </button>
                            {showReasoning && (
                                <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                                    {decision.reasoningSteps.map((step: string, idx: number) => (
                                        <p key={idx} className="text-[10px] font-mono text-slate-400">{step}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Feedback Rating Loop */}
                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-[10px] text-slate-400">Was this decision helpful?</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleFeedback('THUMBS_UP')}
                                className={`p-1.5 rounded-lg text-xs transition ${feedbackGiven === 'THUMBS_UP' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                                👍
                            </button>
                            <button
                                onClick={() => handleFeedback('THUMBS_DOWN')}
                                className={`p-1.5 rounded-lg text-xs transition ${feedbackGiven === 'THUMBS_DOWN' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            >
                                👎
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 p-6 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center text-slate-500">
                    <span className="text-2xl mb-1">💡</span>
                    <p className="text-xs">Ask a question or click a slash command above to run the predictive CFO agent.</p>
                </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Ask CFO agent (e.g. When will I run out of money?)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOrchestrate()}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                    onClick={() => handleOrchestrate()}
                    disabled={loading || !query.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                >
                    Ask
                </button>
            </div>
        </div>
    );
}
