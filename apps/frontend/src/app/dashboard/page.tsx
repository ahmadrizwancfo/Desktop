'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CfoHero } from '@/components/dashboard/cfo-hero';
import { CfoDecisions } from '@/components/dashboard/cfo-decisions';
import { AutoPilotPanel } from '@/components/dashboard/auto-pilot-panel';
import { StabilitySection } from '@/components/dashboard/stability-section';
import { CfoBehaviorInsightPanel } from '@/components/dashboard/cfo-behavior-insight-panel';
import { DecisionTimeline } from '@/components/dashboard/decision-timeline';
import { CriticalInterventionOverlay } from '@/components/dashboard/critical-intervention-overlay';
import { SurvivalChecklist } from '@/components/dashboard/SurvivalChecklist';
import { apiClient } from '@/lib/api-client';
import {
    Skull,
    History,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';
import { SafeModeBanner } from '@/components/dashboard/safe-mode-banner';
import { AlertStrip } from '@/components/dashboard/alert-strip';
import { CommandBar } from '@/components/dashboard/command-bar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import {
    useCFOState,
    type CFOState,
} from '@/store/cfo-state-store';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const { setProfile, clearProfile } = useStartupProfileStore();
    const [profileChecked, setProfileChecked] = useState(false);

    useEffect(() => {
        apiClient.get('/startup-profile/me')
            .then((res) => { setProfile(res.data); setProfileChecked(true); })
            .catch(() => { clearProfile(); router.push('/onboarding'); });
    }, [clearProfile, router, setProfile]);

    const { data: cfoState, isLoading, isRefetching } = useCFOState();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isLoading && !isRefetching && cfoState?.noData && !cfoState?.isDemo) {
            router.replace('/integrations');
        }
    }, [cfoState?.noData, cfoState?.isDemo, isLoading, isRefetching, router]);

    if (!profileChecked) return null;

    if (isLoading || isRefetching) {
        return (
            <DashboardLayout>
                <div className="h-full flex flex-col items-center justify-center -mt-20">
                    <div className="relative">
                        <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="w-20 h-20 bg-[#0a0f1e] border-2 border-rose-500/30 rounded-2xl shadow-2xl flex items-center justify-center relative z-10">
                            <Skull className="w-8 h-8 text-rose-400 animate-pulse" />
                        </div>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 text-center">
                        <h2 className="text-xl font-black text-white tracking-tight mb-2">Running survival diagnostics</h2>
                        <p className="text-slate-500 text-sm">Every transaction is being analyzed for risk.</p>
                    </motion.div>
                </div>
            </DashboardLayout>
        );
    }

    if (!cfoState) return null;

    const blockingAlert = cfoState.criticalAlerts?.find(a => a.isBlocking);

    if (blockingAlert) {
        return (
            <CriticalInterventionOverlay 
                alert={blockingAlert}
                onAcknowledge={async () => {
                    try {
                        await apiClient.post(`/cfo-engine/state/alert-acknowledge/${blockingAlert.id}`);
                        await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                        router.refresh();
                    } catch (error) {
                        console.error('Failed to acknowledge alert:', error);
                        await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
                    }
                }}
            />
        );
    }

    return <DashboardContent state={cfoState} />;
}

function DashboardContent({ state }: { state: CFOState }) {
    const router = useRouter();
    const isCrisis = state.summary.runwayMonths < 3 && !state.summary.isSustainable;
    const isSafeMode = state.trustIntelligence?.autoPilot.mode === 'SAFE_MODE';
    const rollbackRate = state.trustIntelligence?.autoPilot.rollbackRate || 0;
    const [showDeepInsights, setShowDeepInsights] = useState(false);

    return (
        <DashboardLayout
            banner={
                <>
                    <SafeModeBanner 
                        active={isSafeMode} 
                        rollbackRate={rollbackRate} 
                        recoveryProgress={state.trustIntelligence?.autoPilot.recoveryProgress} 
                    />
                    <AlertStrip 
                        mode={state.dashboardMode} 
                        isDemo={state.isDemo}
                        onConnect={() => router.push('/integrations')}
                    />
                </>
            }
        >
            <div className={cn(
                "min-h-screen transition-all duration-1000 -m-10 p-10 relative overflow-hidden",
                !state.summary.isSustainable && state.dashboardMode === 'CRITICAL' ? "bg-rose-500/[0.03]" : 
                !state.summary.isSustainable && state.dashboardMode === 'WARNING' ? "bg-amber-500/[0.02]" : ""
            )}>
                <div className="max-w-5xl mx-auto pb-32 px-4 flex flex-col gap-12">
                     {!isCrisis && <CommandBar state={state} />}

                    {isCrisis && (
                        <div className="pt-6 border-b border-rose-500/20 pb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center animate-pulse">
                                    <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-rose-400 uppercase tracking-tighter italic">Survival Mode Active</h2>
                            </div>
                            <p className="text-slate-400 font-bold max-w-2xl text-lg">
                                You are in survival mode. Every decision should extend runway.
                            </p>
                        </div>
                    )}

                    <CfoHero state={state} />

                    {isCrisis && <SurvivalChecklist />}

                    <CfoDecisions engine={state.decisionEngine} state={state} />

                    {!isCrisis && (
                        <div className="pt-8 border-t border-white/5">
                            <button 
                                onClick={() => setShowDeepInsights(!showDeepInsights)}
                                className="flex items-center gap-4 group w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] group-hover:text-primary transition-colors">
                                        Deep Intelligence Audit
                                    </h3>
                                </div>
                                <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-primary/20 transition-colors" />
                                <div className={cn(
                                    "p-2 rounded-full bg-white/5 border border-white/5 transition-transform duration-300",
                                    showDeepInsights ? "rotate-180" : "rotate-0 text-primary"
                                )}>
                                    <ChevronDown className="w-3 h-3" />
                                </div>
                            </button>

                            <AnimatePresence>
                                {showDeepInsights && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-20 pt-12">
                                            <AutoPilotPanel state={state} />
                                            <StabilitySection state={state} />
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                <CfoBehaviorInsightPanel audit={state.behavioralAudit} />
                                                <div className="space-y-8">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <History className="w-4 h-4 text-slate-500" />
                                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextual History</h3>
                                                        </div>
                                                        <DecisionTimeline events={state.decisionTimeline || []} />
                                                    </div>
                                                    
                                                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Final Conclusion</p>
                                                        <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                                                            &quot;{state.emotionalLine}&quot;
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
