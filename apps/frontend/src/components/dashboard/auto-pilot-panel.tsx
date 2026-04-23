'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Wind, ShieldCheck, Zap, ShieldAlert } from 'lucide-react';
import { ActionCard } from './action-card';
import { CFOState } from '@/store/cfo-state-store';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AutoPilotPanelProps {
    state: CFOState;
}

export function AutoPilotPanel({ state }: AutoPilotPanelProps) {
    const router = useRouter();
    const { trustIntelligence } = state;
    const { autoPilot } = trustIntelligence || {};
    
    const isSafeMode = autoPilot?.mode === 'SAFE_MODE';

    // Combine shadow logs and pending actions for the panel
    const shadowActions = autoPilot?.shadowLogs?.map((log: any) => ({
        ...log,
        status: 'shadow' as const,
        action: log.action || { title: 'Unknown Action', description: log.reason }
    })) || [];

    const pendingActions = autoPilot?.pendingActions?.map((log: any) => ({
        ...log,
        status: 'pending' as const
    })) || [];

    // Recently executed actions (from activeMandates)
    const executedActions = state.activeMandates?.filter(m => m.status === 'DONE').slice(0, 2).map(m => ({
        id: m.id,
        actionId: m.id,
        title: m.title,
        description: m.description,
        status: 'executed' as const,
        riskLevel: 'low' as const, 
        impact: { monthlySavings: Number(m.expectedImpact) },
        confidence: m.verificationConfidence
    })) || [];

    const handleCancel = async (logId: string) => {
        try {
            await apiClient.post(`/cfo-engine/actions/cancel/${logId}`);
            toast.success('Execution cancelled');
            router.refresh();
        } catch (err) {
            toast.error('Failed to cancel action');
        }
    };

    const handleExecuteNow = async (actionId: string) => {
        try {
            await apiClient.post(`/cfo-engine/actions/execute/${actionId}`);
            toast.success('Executing immediately...');
            router.refresh();
        } catch (err) {
            toast.error('Execution failed');
        }
    };

    const handleRollback = async (actionId: string) => {
        try {
            await apiClient.post(`/cfo-engine/actions/rollback/${actionId}`);
            toast.success('Action rolled back');
            router.refresh();
        } catch (err) {
            toast.error('Rollback failed');
        }
    };

    const handleSchedule = async (actionId: string) => {
        try {
            await apiClient.post(`/cfo-engine/actions/schedule`, { actionId });
            toast.success('Action scheduled for execution');
            router.refresh();
        } catch (err) {
            toast.error('Failed to schedule action');
        }
    };

    const allActions = [...pendingActions, ...shadowActions, ...executedActions];

    if (allActions.length === 0) return null;

    return (
        <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                        isSafeMode ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                        {isSafeMode ? <ShieldAlert className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            {isSafeMode ? 'Auto-Pilot (Safe Mode)' : 'Auto-Pilot Intelligence'}
                            {isSafeMode && <span className="bg-indigo-500 text-[8px] px-1.5 py-0.5 rounded text-white animate-pulse">PROTECTED</span>}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            {isSafeMode ? 'Manual Approval Enforced' : 'Autonomous Decision Engine'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {trustIntelligence?.envUncertaintyScore !== undefined && trustIntelligence.envUncertaintyScore > 30 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                            <Wind className="w-3 h-3 text-rose-400 animate-pulse" />
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Uncertainty Lock</span>
                        </div>
                    )}
                    
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Confidence Score</p>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${state.dynamicConfidence.score}%` }}
                                    className={cn(
                                        "h-full rounded-full",
                                        state.dynamicConfidence.score > 80 ? "bg-emerald-500" : 
                                        state.dynamicConfidence.score > 60 ? "bg-amber-500" : "bg-rose-500"
                                    )}
                                />
                            </div>
                            <span className="text-[10px] font-black text-white">{state.dynamicConfidence.score}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AnimatePresence mode="popLayout">
                    {allActions.map((item) => (
                        <ActionCard 
                            key={item.id}
                            id={item.id}
                            actionId={item.actionId || item.id}
                            title={item.action?.title || item.title}
                            description={item.action?.description || item.description || item.reason}
                            status={item.status}
                            riskLevel={item.riskLevel?.toLowerCase() || 'low'}
                            impact={item.impact || { monthlySavings: Number(item.impactBurn || 0), runwayIncrease: item.impact?.runwayIncrease }}
                            confidence={item.confidence}
                            assumptions={item.action?.assumptions || item.assumptions}
                            scheduledAt={item.executeAt}
                            isSafeMode={isSafeMode}
                            onCancel={handleCancel}
                            onExecute={handleExecuteNow}
                            onRollback={handleRollback}
                            onSchedule={handleSchedule}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </motion.section>
    );
}
