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
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// Components
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
import { ExecutiveMandateHero, ExecutiveReassuranceHeader, ExecutiveDecisionCard } from '@/components/dashboard/executive-mandate-hero';
import { ExecutiveOperationsFeed } from '@/components/dashboard/executive-operations-feed';
import { FinancialConfidenceCard } from '@/components/dashboard/financial-confidence-card';
import { ComplianceRadarCard } from '@/components/dashboard/compliance-radar-card';
import { BottomInsightBanner } from '@/components/dashboard/bottom-insight-banner';
import { Skull, Wallet, Clock, TrendingDown, BarChart3, AlertTriangle, Share2, Download, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinancialDisclaimer } from '@/components/ui/financial-disclaimer';
import { DailyBriefWidget } from '@/components/daily-brief/daily-brief-widget';
import { useLivingDashboard } from '@/hooks/use-living-dashboard';

export default function DashboardPage() {
    const router = useRouter();
    const profile = useStartupProfileStore((s) => s.profile);
    const { data: cfoState, isLoading, isRefetching } = useCFOState();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isLoading && !isRefetching && cfoState?.noData && !cfoState?.isDemo) {
            router.replace('/get-started');
        }
    }, [cfoState?.noData, cfoState?.isDemo, isLoading, isRefetching, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-[#111111] flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono tabular-nums uppercase tracking-widest text-slate-400">
                        Verifying ground-truth cash balance &amp; runway buffer...
                    </span>
                </div>
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
    const router = useRouter();
    const queryClient = useQueryClient();
    const { triggerVictory, isPartialState, processingMessage, sseStatus, sseLastUpdated } = useCfoStateStore();
    const decision = state.decisionEngine?.dailyFocus?.oneThing;

    // Connect SSE living dashboard
    useLivingDashboard(state.organizationId);

    const [showShareModal, setShowShareModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [dailyBrief, setDailyBrief] = useState<any>(null);
    const [loadingBrief, setLoadingBrief] = useState(true);
    const reportRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchBrief = async () => {
            try {
                const res = await apiClient.get('/cfo-engine/daily-brief');
                if (res.data && res.data.brief) {
                    setDailyBrief(res.data.brief);
                }
            } catch (e) {
                console.error('Failed to fetch daily brief:', e);
            } finally {
                setLoadingBrief(false);
            }
        };
        fetchBrief();
    }, []);

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
        <div className="text-slate-200 selection:bg-primary/30">
            <VictoryConfetti />
                <OnboardingFlow />

            {/* Top Status Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Continuous Financial Operating System</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                    <span>Reconciled: {state.lastUpdatedAt ? new Date(state.lastUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                </div>
            </div>

            {/* Ground-Truth Provenance Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            {state.isDemo ? "Level 1 — Estimated Baseline Model" : "Level 2 — Verified Evidence Ingested"}
                        </span>
                        <p className="text-xs text-slate-200 font-medium mt-0.5">
                            {state.isDemo
                                ? "Model initialized from 30-second onboarding context. Upload a bank statement or Tally XML for penny-exact verification."
                                : "Financial model grounded in verified bank vouchers & accounting records."}
                        </p>
                    </div>
                </div>
                {state.isDemo && (
                    <Link
                        href="/integrations"
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shrink-0"
                    >
                        Upgrade to Verified
                    </Link>
                )}
            </div>

            {/* Sprint D — Morning Executive Briefing Fold 1 Information Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 text-left">
                {/* Main Column (8 Columns): 1. Reassurance -> 2. Work Done -> 3. Single Decision -> 5. Core Numbers */}
                <div className="lg:col-span-8 space-y-6">
                    {/* 1. Immediate Reassurance ("Am I okay?") */}
                    <ExecutiveReassuranceHeader 
                        isDemo={state.isDemo}
                        runwayMonths={state.summary.runwayMonths}
                    />

                    {/* 2. Work Already Completed ("Here's what I reviewed for you") */}
                    <ExecutiveOperationsFeed 
                        isDemo={state.isDemo}
                        hasVouchers={!state.isDemo || (state.trust?.transactionCount || 0) > 0}
                        voucherCount={state.trust?.transactionCount || 0}
                        lastUpdatedAt={state.lastUpdatedAt}
                    />

                    {/* 3. One Decision Requiring Founder Attention ("What is the only decision I need to make?") */}
                    <ExecutiveDecisionCard 
                        oneThingAction={decision?.title || "Preserve cash: Delay hiring 2 senior engineers until Q3 AR collections hit 80%."}
                        followConsequence={decision?.consequenceExplanation || "+4.9 months"}
                        onExecute={handleExecute}
                    />

                    {/* 5. Core Financial Numbers ("What are my core cash & burn numbers?") */}
                    <KeyMetrics state={state} />
                </div>

                {/* Right Column (4 Columns): 4. Supporting Evidence & Compliance */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 4. Supporting Evidence ("Why should I trust this recommendation?") */}
                    <FinancialConfidenceCard 
                        isDemo={state.isDemo}
                        confidenceScore={confidenceScore > 0 ? Math.round(confidenceScore) : 68}
                    />

                    {/* Supporting Compliance Radar */}
                    <ComplianceRadarCard />
                </div>
            </div>

            {/* Bottom AI CFO Insight Banner */}
            <div className="mb-10">
                <BottomInsightBanner 
                    insight={state.primaryRisk?.message || "Your collections slowdown is the primary risk to your cash runway."}
                    actionHint="Focus on enterprise accounts receivable follow-ups."
                />
            </div>

            <div className="max-w-[1400px] mx-auto py-6">
                {/* Data Quality Banner */}
                <DataQualityBanner />

                {/* Deep Dive Tabs */}
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

                {/* Professional Disclaimer */}
                <FinancialDisclaimer />
            </div>

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
