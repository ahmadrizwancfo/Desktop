'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import { 
    useCFOState, 
    useCfoStateStore, 
    type CFOState,
    updateDecisionStatus,
    trackDecisionActed,
    formatCurrency as formatCurrencyStore,
} from '@/store/cfo-state-store';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// Components
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CfoHero } from '@/components/dashboard/cfo-hero';
import { RightSidebar } from '@/components/dashboard/right-sidebar';
import { DecisionStrip } from '@/components/dashboard/decision-strip';
import { DeepDiveTabs } from '@/components/dashboard/deep-dive-tabs';
import { KeyMetrics } from '@/components/dashboard/key-metrics';
import { BurnBar } from '@/components/dashboard/burn-bar';
import { StabilitySection } from '@/components/dashboard/stability-section';
import { CfoDecisions } from '@/components/dashboard/cfo-decisions';
import { DecisionTimeline } from '@/components/dashboard/decision-timeline';
import { CfoBehaviorInsightPanel } from '@/components/dashboard/cfo-behavior-insight-panel';
import { AutoPilotPanel } from '@/components/dashboard/auto-pilot-panel';
import { GhostInterventionCard } from '@/components/dashboard/ghost-intervention-card';
import { VictoryConfetti } from '@/components/dashboard/victory-confetti';
import { CriticalInterventionOverlay } from '@/components/dashboard/critical-intervention-overlay';
import { DataQualityBanner, DataQualityGate } from '@/components/dashboard/data-quality-banner';
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow';
import { ComplianceAlerts } from '@/components/dashboard/compliance-alerts';
import { Skull, Wallet, Clock, TrendingDown, BarChart3, AlertTriangle, Share2, Download, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinancialDisclaimer } from '@/components/ui/financial-disclaimer';

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
            router.replace('/get-started');
        }
    }, [cfoState?.noData, cfoState?.isDemo, isLoading, isRefetching, router]);

    if (!profileChecked) return null;

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center">
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

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD CONTENT — Restructured Hierarchy (CTO-Approved)
// Zone 1: Decision Strip (top-level behavior nudge)
// Zone 2: Cash Position + Runway (PROMINENT) + Data Quality Banner
// Zone 3: CFO Brain (7:3 grid) — Hero + Sidebar
// Zone 4: Deep Dive (collapsible) — gated behind DataQualityGate if < 70
// Zone 5: Professional Disclaimer
// ═══════════════════════════════════════════════════════════════════════════════

const DashboardContent = React.memo(({ state }: { state: CFOState }) => {
    const queryClient = useQueryClient();
    const { triggerVictory } = useCfoStateStore();
    const decision = state.decisionEngine?.dailyFocus?.oneThing;

    const [showShareModal, setShowShareModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const reportRef = React.useRef<HTMLDivElement>(null);

    const handleDownloadImage = async () => {
        if (!reportRef.current) return;
        setGenerating(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: '#0a0f1e',
                scale: 2,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `foundercfo-runway-report-${new Date().toISOString().split('T')[0]}.png`;
            link.href = imgData;
            link.click();
            toast.success('Runway Report image downloaded successfully!');
        } catch (err) {
            toast.error('Image generation failed. Try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://foundercfo.com/report/${(state.behavioralAudit as any)?.id || 'live-metrics'}`);
            setLinkCopied(true);
            toast.success('Shareable report link copied!');
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy link.');
        }
    };

    const handleExecute = async () => {
        if (!decision) return;
        await updateDecisionStatus(decision.id, 'in_progress');
        await trackDecisionActed(decision.id, state.summary.runwayMonths);
        queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
        triggerVictory(0, 50, 'Action Initiated', 'MICRO');
    };

    const isSustainable = state.isInfiniteRunway || state.summary.runwayMonths > 36;
    const confidenceScore = state.dynamicConfidence?.score ?? 0;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-primary/30">
            <VictoryConfetti />
            <OnboardingFlow />

            {/* Zone 1: Decision Strip (Behavior Engine) */}
            {decision && (
                <DecisionStrip 
                    title={decision.title}
                    urgency={decision.urgency === 'critical' ? 'CRITICAL: Act in 24h' : `Urgent: Act in ${decision.deadline || '7 days'}`}
                    consequence={decision.consequenceExplanation || "Negative variance in next cycle"}
                    action={decision.title}
                    onExecute={handleExecute}
                    onSimulate={() => {}}
                />
            )}

            <main className="max-w-[1400px] mx-auto px-8 py-12">
                {/* Zone 2: Cash Position + Runway (PROMINENT — top of dashboard) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Cash Position — Hero Metric */}
                        <div className="bg-[#0a0f1e]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                            <div className="flex items-center gap-2 mb-3">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cash Position</span>
                            </div>
                            <h2 className="text-4xl font-black text-white tabular-nums">
                                {formatCurrencyStore(state.summary.cashInBank)}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold mt-2 flex items-center gap-2">
                                Available Liquidity
                                <span className="text-emerald-400/60">
                                    ({Math.round(confidenceScore)}% confidence)
                                </span>
                            </p>
                        </div>

                        {/* True Runway — Hero Metric */}
                        <div className={cn(
                            "backdrop-blur-xl border rounded-3xl p-8 relative overflow-hidden",
                            isSustainable ? "bg-emerald-500/5 border-emerald-500/20" :
                            state.summary.runwayMonths > 6 ? "bg-[#0a0f1e]/80 border-white/10" :
                            state.summary.runwayMonths > 3 ? "bg-amber-500/5 border-amber-500/20" :
                            "bg-rose-500/5 border-rose-500/20"
                        )}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">True Runway</span>
                                </div>
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider relative z-20"
                                >
                                    <Share2 className="w-3 h-3 text-primary" />
                                    Share
                                </button>
                            </div>
                            <h2 className="text-4xl font-black text-white tabular-nums">
                                {isSustainable ? '> 36' : state.summary.runwayMonths.toFixed(1)}
                                <span className="text-lg font-bold text-slate-500 ml-2">months</span>
                            </h2>
                            <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (state.summary.runwayMonths / 36) * 100)}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className={cn(
                                        "h-full rounded-full",
                                        isSustainable || state.summary.runwayMonths > 12 ? "bg-emerald-500" :
                                        state.summary.runwayMonths > 4 ? "bg-amber-500" : "bg-rose-500"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Burn Rate — Hero Metric */}
                        <div className="bg-[#0a0f1e]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Burn</span>
                            </div>
                            <h2 className="text-4xl font-black text-white tabular-nums">
                                {formatCurrencyStore(state.summary.netBurn)}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold mt-2">
                                per month · {state.summary.burnTrend === 'increasing' ? '↑ Rising' : state.summary.burnTrend === 'decreasing' ? '↓ Falling' : '→ Stable'}
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Data Quality Banner */}
                <DataQualityBanner />

                {/* Zone 3: CFO Brain (7:3 Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-12 items-start">
                    <div className="lg:col-span-7 flex flex-col gap-12">
                        <CfoHero state={state} />
                        
                        {/* Ghost Alerts remain as non-blocking primary risks */}
                        {state.criticalAlerts?.filter(a => a.id.startsWith('ghost_')).map(alert => (
                            <GhostInterventionCard 
                                key={alert.id} 
                                alert={alert} 
                                onAcknowledged={() => queryClient.invalidateQueries({ queryKey: ['cfo-state'] })}
                            />
                        ))}
                    </div>

                    <aside className="lg:col-span-3 flex flex-col gap-6">
                        <RightSidebar state={state} />
                        <ComplianceAlerts />
                    </aside>
                </div>

                {/* Zone 4: Deep Dive Tabs (Collapsed by default, gated if quality < 70) */}
                <DataQualityGate featureName="Deep Intelligence Audit">
                    <DeepDiveTabs 
                        metrics={<KeyMetrics state={state} />}
                        trends={
                            <div className="flex flex-col gap-12">
                                <BurnBar state={state} />
                                <StabilitySection state={state} />
                                <AutoPilotPanel state={state} />
                            </div>
                        }
                        mandates={<CfoDecisions engine={state.decisionEngine} state={state} />}
                        history={
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <DecisionTimeline events={state.decisionTimeline || []} />
                                <CfoBehaviorInsightPanel audit={state.behavioralAudit as any} />
                            </div>
                        }
                    />
                </DataQualityGate>

                {/* Zone 5: Professional Disclaimer */}
                <FinancialDisclaimer />
            </main>

            {/* Share Runway Report Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#0a0f1e]/90 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative text-center overflow-hidden"
                        >
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-black text-white mb-2 tracking-tight">Share Runway Report</h3>
                            <p className="text-xs text-slate-400 mb-6">Confidential board-ready metric snapshot</p>

                            {/* Share Card to Render (to be downloaded) */}
                            <div className="p-1 rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-purple-500/30 mb-6">
                                <div 
                                    ref={reportRef} 
                                    className="p-6 md:p-8 rounded-[1.4rem] bg-[#0a0f1e] text-left relative overflow-hidden shadow-inner border border-white/5"
                                    style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}
                                >
                                    {/* Card Ambient Glows */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full pointer-events-none" />

                                    {/* Logo + Date */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="text-xs font-black text-white uppercase tracking-wider block">FounderCFO</span>
                                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Startup Intelligence</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] text-slate-500 font-mono block">DATE: {new Date().toLocaleDateString('en-IN')}</span>
                                            <span className="text-[7px] text-primary font-black uppercase tracking-widest block mt-0.5">CONFIDENTIAL</span>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">CASH POSITION</span>
                                            <span className="text-sm font-black text-white tabular-nums">{formatCurrencyStore(state.summary.cashInBank)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">TRUE RUNWAY</span>
                                            <span className="text-sm font-black text-emerald-400 tabular-nums">
                                                {state.isInfiniteRunway || state.summary.runwayMonths > 36 ? '> 36 mo' : `${state.summary.runwayMonths.toFixed(1)} mo`}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">NET MONTHLY BURN</span>
                                            <span className="text-sm font-black text-rose-400 tabular-nums">{formatCurrencyStore(state.summary.netBurn)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">DATA QUALITY</span>
                                            <span className="text-sm font-black text-primary tabular-nums">{Math.round(confidenceScore)}%</span>
                                        </div>
                                    </div>

                                    {/* Active Mandate Block */}
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 relative">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary/80 block mb-1">RUNWAY MANDATE</span>
                                        <p className="text-[10px] text-white font-bold leading-relaxed">
                                            {state.decisionEngine?.dailyFocus?.oneThing?.title || "Preserve cash & optimize saas subscription stack by 20%."}
                                        </p>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="mt-6 flex justify-between items-center text-[7px] text-slate-500 uppercase tracking-widest border-t border-white/5 pt-3">
                                        <span>FounderCFO Beta Platform</span>
                                        <span>cfo-digest-{(state.behavioralAudit as any)?.id?.substring(0, 8) || 'live'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2.5">
                                <button
                                    onClick={handleDownloadImage}
                                    disabled={generating}
                                    className="w-full py-3.5 rounded-xl bg-white text-[#020617] font-black text-[11px] uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <>Generating Image...</>
                                    ) : (
                                        <>
                                            <Download className="w-3.5 h-3.5" />
                                            Download Image Report
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCopyShareLink}
                                    className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-black text-[11px] uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                                >
                                    {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    {linkCopied ? 'Link Copied!' : 'Copy Shareable Link'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
});
