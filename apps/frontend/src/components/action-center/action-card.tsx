'use client';

import React from 'react';

export interface FounderActionItem {
    id: string;
    organizationId: string;
    sourceModule: 'DecisionLab' | 'Dashboard' | 'AiCopilot' | 'RiskEngine';
    actionType: string;
    title: string;
    description?: string;
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    status: 'PREPARED' | 'APPROVED' | 'REJECTED' | 'SNOOZED' | 'COMPLETED';
    financialImpact: string;
    payload: any;
    createdById?: string;
    approvedById?: string;
    scheduledFor?: string;
    auditTrail?: any[];
    createdAt: string;
}

interface ActionCardProps {
    action: FounderActionItem;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onSnooze: (id: string) => void;
    onEdit: (action: FounderActionItem) => void;
    loading: boolean;
}

export function ActionCard({ action, onApprove, onReject, onSnooze, onEdit, loading }: ActionCardProps) {
    const urgencyStyle = 
        action.urgency === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
        action.urgency === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
        'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';

    const isCompleted = action.status === 'COMPLETED' || action.status === 'APPROVED';

    return (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4 transition hover:border-slate-700">
            {/* Header Badges */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${urgencyStyle}`}>
                        {action.urgency} Urgency
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Via {action.sourceModule}
                    </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                    Prepared {new Date(action.createdAt).toLocaleDateString()}
                </span>
            </div>

            {/* Title & Description */}
            <div>
                <h3 className="text-base font-black text-white">{action.title}</h3>
                {action.description && <p className="text-xs text-slate-300 mt-1">{action.description}</p>}
            </div>

            {/* Financial Impact Metric Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Estimated Financial Impact:</span>
                <span className="text-sm font-black font-mono text-emerald-400">+₹{action.financialImpact}</span>
            </div>

            {/* Prepared Work Preview */}
            {action.payload && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 font-mono text-[11px] text-slate-400">
                    <span className="text-[9px] uppercase font-bold text-indigo-400">AI Prepared Work Payload</span>
                    {action.payload.recipientEmail && <p>To: {action.payload.recipientEmail}</p>}
                    {action.payload.subject && <p className="font-semibold text-slate-200">Subject: {action.payload.subject}</p>}
                    {action.payload.body && <p className="line-clamp-2 text-slate-300">{action.payload.body}</p>}
                </div>
            )}

            {/* Audit Trail Stamp for Completed */}
            {isCompleted && action.auditTrail && action.auditTrail.length > 0 && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[10px] text-emerald-300 font-mono">
                    ✓ Executed by Founder on {new Date(action.auditTrail[action.auditTrail.length - 1].timestamp).toLocaleString()}
                </div>
            )}

            {/* Founder Approval Actions Bar */}
            {!isCompleted && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                        onClick={() => onSnooze(action.id)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
                    >
                        ⏰ Snooze 24h
                    </button>
                    <button
                        onClick={() => onReject(action.id)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800 transition"
                    >
                        ✕ Reject
                    </button>
                    <button
                        onClick={() => onEdit(action)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-800 transition"
                    >
                        ✏️ Edit Draft
                    </button>
                    <button
                        onClick={() => onApprove(action.id)}
                        disabled={loading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-lg transition shadow-lg shadow-emerald-950/50"
                    >
                        ✓ Approve & Execute
                    </button>
                </div>
            )}
        </div>
    );
}
