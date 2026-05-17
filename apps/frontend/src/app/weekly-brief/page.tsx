'use client';

import React, { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion } from 'framer-motion';
import {
    Mail, Send, Clock, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle2, Loader2, Settings,
    Zap, ArrowRight, Calendar, Shield, Minus,
    Download, FileText, Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { canAccess } from '@/lib/feature-gates';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import { toast } from 'sonner';

const CHANNELS = [
    { id: 'EMAIL', label: 'Email', icon: Mail, enabled: true, description: 'Sent to your registered email' },
    { id: 'WHATSAPP', label: 'WhatsApp', icon: Send, enabled: true, description: 'Direct message to your number' },
    { id: 'SLACK', label: 'Slack', icon: Zap, enabled: false, description: 'Coming soon' },
] as const;

const FREQUENCY_OPTIONS = [
    { id: 'WEEKLY', label: 'Every Monday', description: '9:00 AM IST' },
    { id: 'BIWEEKLY', label: 'Every 2 Weeks', description: 'Monday, 9:00 AM IST' },
] as const;

export default function WeeklyBriefPage() {
    const user = useAuthStore((state) => state.user);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL']);
    const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY'>('WEEKLY');
    const [sendSuccess, setSendSuccess] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const briefRef = useRef<HTMLDivElement>(null);

    // Fetch brief preview data
    const { data: brief, isLoading } = useQuery({
        queryKey: ['weekly-brief-preview', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/weekly-brief/preview');
            return res.data;
        },
        enabled: !!user?.organizationId,
        refetchOnWindowFocus: false,
    });

    // Send now mutation
    const sendMutation = useMutation({
        mutationFn: async () => {
            return apiClient.post('/weekly-brief/send');
        },
        onSuccess: () => {
            setSendSuccess(true);
            setTimeout(() => setSendSuccess(false), 4000);
        },
    });

    const toggleChannel = (channelId: string) => {
        setSelectedChannels((prev) =>
            prev.includes(channelId)
                ? prev.filter((c) => c !== channelId)
                : [...prev, channelId]
        );
    };

    const handlePdfDownload = async () => {
        if (!canAccess('pdfExports')) {
            toast.error('PDF export is available on the Pro plan.');
            return;
        }
        if (!briefRef.current) return;
        setPdfGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            const canvas = await html2canvas(briefRef.current, {
                backgroundColor: '#0a0f1e',
                scale: 2,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`FounderCFO-Brief-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF downloaded successfully!');
        } catch (err) {
            toast.error('PDF generation failed. Try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        if (!amount) return '₹0';
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
        return `₹${amount}`;
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="h-screen flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const metrics = brief?.metrics || {};
    const burnDirection = metrics.burnTrendDirection;

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-5xl">
                {/* Header */}
                <header>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Weekly Founder Brief</h1>
                            <p className="text-slate-400 text-sm">Your Monday morning financial snapshot — builds the habit</p>
                        </div>
                    </div>
                </header>

                {/* Brief Preview Card */}
                <motion.div
                    ref={briefRef}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl overflow-hidden border-2 border-primary/20"
                >
                    {/* Preview Header */}
                    <div className="p-6 bg-gradient-to-r from-primary/10 via-violet-500/5 to-transparent border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Preview — This Week</p>
                                    <p className="text-xs text-slate-400">{brief?.weekOf || 'This week'}</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                {brief?.companyName || 'Your Startup'}
                            </span>
                        </div>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="p-6">
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">FounderCFO Weekly Brief</h3>
                        <div className="grid grid-cols-3 gap-6">
                            {/* Runway */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Runway</p>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        metrics.runwayStatus === 'CRITICAL' && "bg-rose-500",
                                        metrics.runwayStatus === 'WARNING' && "bg-amber-500",
                                        metrics.runwayStatus === 'HEALTHY' && "bg-emerald-500",
                                    )} />
                                </div>
                                <p className={cn(
                                    "text-3xl font-black",
                                    metrics.runwayStatus === 'CRITICAL' && "text-rose-400",
                                    metrics.runwayStatus === 'WARNING' && "text-amber-400",
                                    metrics.runwayStatus === 'HEALTHY' && "text-emerald-400",
                                    !metrics.runwayStatus && "text-white",
                                )}>
                                    {metrics.runway >= 999 ? '∞' : `${metrics.runway || 0}`}
                                    <span className="text-sm font-bold ml-1 text-slate-500">months</span>
                                </p>
                            </div>

                            {/* Burn */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Monthly Burn</p>
                                    {burnDirection === 'UP' ? (
                                        <div className="flex items-center gap-1 text-rose-400">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">↑{Math.abs(metrics.burnTrend || 0)}%</span>
                                        </div>
                                    ) : burnDirection === 'DOWN' ? (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <TrendingDown className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">↓{Math.abs(metrics.burnTrend || 0)}%</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Minus className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">Flat</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-3xl font-black text-white">
                                    {formatCurrency(metrics.monthlyBurn || 0)}
                                </p>
                            </div>

                            {/* Cash */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Cash in Bank</p>
                                <p className="text-3xl font-black text-white">
                                    {formatCurrency(metrics.cashInBank || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Biggest Risk */}
                        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-rose-500/20 mt-0.5">
                                    {brief?.biggestRisk?.domain === 'NONE' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-rose-400 uppercase tracking-widest font-bold mb-1">Biggest Risk</p>
                                    <p className="text-sm font-bold text-white">
                                        {brief?.biggestRisk?.type || 'No critical risks'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {brief?.biggestRisk?.summary || 'All systems healthy'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 mt-0.5">
                                    <Zap className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-1">Recommendation</p>
                                    <p className="text-sm font-bold text-white">
                                        {brief?.recommendation || 'Continue optimizing operations'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Compliance Snapshot */}
                        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/20 mt-0.5">
                                    <Shield className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-1">Compliance Radar</p>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400">• GSTR-3B Filing — due 20th of every month</p>
                                        <p className="text-xs text-slate-400">• TDS Deposit — due 7th of every month</p>
                                        <p className="text-xs text-slate-400">• Advance Tax — quarterly (15 Jun / 15 Sep / 15 Dec / 15 Mar)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Disclaimer */}
                        <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <p className="text-[8px] text-slate-600 leading-relaxed">
                                <AlertTriangle className="w-2 h-2 inline mr-1" />
                                This brief is auto-generated by FounderCFO's AI engine and is not a substitute for professional chartered accountant advice.
                                All figures are derived from uploaded bank statements and may not reflect complete financial position.
                                Consult a licensed CA before making critical financial decisions.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600">
                            <p>Generated by FounderCFO Decision Engine</p>
                            <p>{brief?.decisionsCount || 0} decisions analyzed</p>
                        </div>
                    </div>
                </motion.div>

                {/* Send Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Channel Selection */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card rounded-3xl p-6"
                    >
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Settings className="w-4 h-4 text-primary" />
                            Delivery Channels
                        </h3>
                        <div className="space-y-3">
                            {CHANNELS.map((channel) => {
                                const isSelected = selectedChannels.includes(channel.id);
                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() => channel.enabled && toggleChannel(channel.id)}
                                        disabled={!channel.enabled}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                                            !channel.enabled && "opacity-40 cursor-not-allowed",
                                            isSelected && channel.enabled
                                                ? "bg-primary/10 border-primary/30 text-white"
                                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10",
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <channel.icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-slate-500")} />
                                            <div className="text-left">
                                                <p className="text-sm font-bold">{channel.label}</p>
                                                <p className="text-[10px] text-slate-500">{channel.description}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                            isSelected ? "bg-primary border-primary" : "border-white/20",
                                        )}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Frequency + Send */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-3xl p-6 flex flex-col"
                    >
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-primary" />
                            Frequency
                        </h3>
                        <div className="space-y-3 mb-6">
                            {FREQUENCY_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setFrequency(option.id as any)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                                        frequency === option.id
                                            ? "bg-primary/10 border-primary/30 text-white"
                                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10",
                                    )}
                                >
                                    <div className="text-left">
                                        <p className="text-sm font-bold">{option.label}</p>
                                        <p className="text-[10px] text-slate-500">{option.description}</p>
                                    </div>
                                    <div className={cn(
                                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                        frequency === option.id ? "border-primary bg-primary" : "border-white/20",
                                    )}>
                                        {frequency === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto space-y-3">
                            {/* PDF Download */}
                            <button
                                onClick={handlePdfDownload}
                                disabled={pdfGenerating}
                                className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                {pdfGenerating ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
                                ) : (
                                    <><Download className="w-4 h-4" /> Download as PDF</>
                                )}
                                {!canAccess('pdfExports') && (
                                    <span className="ml-1 text-[8px] text-amber-400 font-black uppercase">Pro</span>
                                )}
                            </button>

                            {/* Board Deck (gated) */}
                            {!canAccess('boardDeck') ? (
                                <UpgradePrompt feature="Board-Ready Deck" featureKey="boardDeck" />
                            ) : (
                                <button className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
                                    <FileText className="w-4 h-4" /> Generate Board Deck
                                </button>
                            )}

                            {/* Send Now Button */}
                            <button
                                onClick={() => sendMutation.mutate()}
                                disabled={sendMutation.isPending || selectedChannels.length === 0}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                    sendSuccess
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/20 hover:opacity-90",
                                    (sendMutation.isPending || selectedChannels.length === 0) && "opacity-50 cursor-not-allowed",
                                )}
                            >
                                {sendMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending Brief...</>
                                ) : sendSuccess ? (
                                    <><CheckCircle2 className="w-4 h-4" /> Brief Sent!</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Send Brief Now</>
                                )}
                            </button>

                            <p className="text-[10px] text-center text-slate-600">
                                Next automatic brief: Monday, 9:00 AM IST
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Habit Forming CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-3xl p-6 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5 border border-primary/10"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/20">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white">Why a Weekly Brief?</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Companies like Stripe and Notion use weekly financial snapshots to stay aligned.
                                The brief becomes habit-forming — every Monday, you know exactly where you stand.
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-primary" />
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
