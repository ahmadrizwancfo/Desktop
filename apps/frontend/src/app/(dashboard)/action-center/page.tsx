'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ActionCard, FounderActionItem } from '@/components/action-center/action-card';
import { ActionModal } from '@/components/action-center/action-modal';
import { apiClient } from '@/lib/api-client';

export default function ActionCenterPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'URGENT' | 'SCHEDULED' | 'COMPLETED'>('URGENT');
    const [actionsData, setActionsData] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedActionForEdit, setSelectedActionForEdit] = useState<FounderActionItem | null>(null);

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/cfo-engine/action-center');
            if (res.data) {
                setActionsData(res.data.actions);
                setMetrics(res.data.metrics);
            }
        } catch (err) {
            console.error('Failed to fetch action center:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrepareNewAction = async (type: string, title: string, impact: string, urgency: string) => {
        try {
            await apiClient.post('/cfo-engine/action-center/prepare', {
                sourceModule: 'Dashboard',
                actionType: type,
                title,
                urgency,
                financialImpact: impact,
                payload: {
                    recipientEmail: 'client@example.com',
                    subject: title,
                    body: `This is an AI prepared execution draft for ${title}.`,
                },
            });
            fetchActions();
        } catch (err) {
            console.error('Failed to prepare action:', err);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await apiClient.post(`/cfo-engine/action-center/${id}/approve`);
            fetchActions();
        } catch (err) {
            console.error('Failed to approve action:', err);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await apiClient.post(`/cfo-engine/action-center/${id}/reject`);
            fetchActions();
        } catch (err) {
            console.error('Failed to reject action:', err);
        }
    };

    const handleSnooze = async (id: string) => {
        try {
            await apiClient.post(`/cfo-engine/action-center/${id}/snooze`);
            fetchActions();
        } catch (err) {
            console.error('Failed to snooze action:', err);
        }
    };

    const handleSaveAndApprove = async (id: string, updatedTitle: string, updatedPayload: any) => {
        try {
            await apiClient.patch(`/cfo-engine/action-center/${id}/edit`, { title: updatedTitle, payload: updatedPayload });
            await handleApprove(id);
            setSelectedActionForEdit(null);
        } catch (err) {
            console.error('Failed to edit and approve action:', err);
        }
    };

    const currentList: FounderActionItem[] = 
        tab === 'URGENT' ? (actionsData?.urgent || []) :
        tab === 'SCHEDULED' ? (actionsData?.scheduled || []) :
        (actionsData?.completed || []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
            {/* Header Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Founder Action Center
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        AI Prepares Work • Founder Approves Execution • Full Operational Audit Trail
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePrepareNewAction('INVOICE_REMINDER', 'Send Overdue Invoice Reminder', '45000', 'HIGH')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                        + Prepare Invoice Reminder
                    </button>
                    <button
                        onClick={() => handlePrepareNewAction('VENDOR_NEGOTIATION', 'Negotiate Payment Delay (-30 Days)', '30000', 'CRITICAL')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                        + Prepare Vendor Delay
                    </button>
                </div>
            </div>

            {/* Executive Metrics Header */}
            {metrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Total Actions Prepared</span>
                        <p className="text-xl md:text-2xl font-black text-white mt-1">{metrics.totalGenerated}</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Founder Approval Rate</span>
                        <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">{metrics.approvalRatePercent}%</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Runway Preserved</span>
                        <p className="text-xl md:text-2xl font-black text-white mt-1">₹{metrics.estimatedRunwayPreserved}</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Collections Accelerated</span>
                        <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">₹{metrics.collectionsAccelerated}</p>
                    </div>
                </div>
            )}

            {/* Tabs Filter Bar */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                    onClick={() => setTab('URGENT')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'URGENT' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    🚨 Urgent Actions ({actionsData?.urgent?.length || 0})
                </button>
                <button
                    onClick={() => setTab('SCHEDULED')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'SCHEDULED' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    📅 Scheduled ({actionsData?.scheduled?.length || 0})
                </button>
                <button
                    onClick={() => setTab('COMPLETED')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${tab === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                    ✅ Completed Audit Log ({actionsData?.completed?.length || 0})
                </button>
            </div>

            {/* Action Cards Queue Grid */}
            {loading ? (
                <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs">Loading Founder Action Queue...</p>
                    </div>
                </div>
            ) : currentList.length === 0 ? (
                <div className="p-12 bg-slate-900/80 border border-slate-800 rounded-3xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                        <span className="text-xl">✅</span>
                    </div>
                    <h3 className="text-base font-black text-white">Your Action Queue is 100% Clean</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Great job! You have executed all pending financial recommendations. Your capital buffer is fully optimized and safe.
                    </p>
                    <div className="pt-2">
                        <button
                            onClick={() => router.push('/simulator')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95"
                        >
                            Simulate Next Scenario in Decision Lab
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentList.map((action) => (
                        <ActionCard
                            key={action.id}
                            action={action}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onSnooze={handleSnooze}
                            onEdit={(ac) => setSelectedActionForEdit(ac)}
                            loading={loading}
                        />
                    ))}
                </div>
            )}

            {/* Edit Draft Modal */}
            <ActionModal
                action={selectedActionForEdit}
                onClose={() => setSelectedActionForEdit(null)}
                onSaveAndApprove={handleSaveAndApprove}
            />
        </div>
    );
}
