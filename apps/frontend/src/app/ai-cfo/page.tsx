'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';
import {
    BrainCircuit, Send, Sparkles, Loader2, AlertCircle,
    TrendingDown, TrendingUp, Shield, Zap, MessageCircle,
    ThumbsUp, ThumbsDown, Copy, Check, ChevronRight,
    Users, Wallet, Clock, Target, ArrowRight, Flame, BarChart3,
    Gauge, Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useCFOState } from '@/store/cfo-state-store';

interface StructuredResponse {
    shortAnswer: string;
    reasoning: string;
    confidence: number;
    runwayImpact: string;
    suggestedAction: string;
    tradeoffs: string;
}

interface Message {
    id: string;
    role: 'ai' | 'user';
    content: string;
    structured?: StructuredResponse;
    timestamp: string;
}

// ── Prompt Chips (CTO-mandated) ───────────────────────────────────────────────
const PROMPT_CHIPS = [
    { label: 'What should I cut this month?', icon: TrendingDown, color: 'text-rose-400' },
    { label: 'Am I ready to raise?', icon: Wallet, color: 'text-violet-400' },
    { label: 'TDS/GST compliance risks?', icon: Shield, color: 'text-amber-400' },
    { label: 'Can I afford to hire?', icon: Users, color: 'text-sky-400' },
    { label: 'Biggest cash leak?', icon: Flame, color: 'text-orange-400' },
    { label: 'What if burn drops 20%?', icon: Target, color: 'text-emerald-400' },
];

// ── Structured AI Message Bubble ──────────────────────────────────────────────
function StructuredBubble({ data }: { data: StructuredResponse }) {
    const confColor = data.confidence >= 80 ? 'text-emerald-400' : data.confidence >= 60 ? 'text-amber-400' : 'text-rose-400';
    const impactPositive = data.runwayImpact?.startsWith('+');

    return (
        <div className="space-y-4">
            {/* Short Answer */}
            <p className="text-base font-bold text-white leading-relaxed">{data.shortAnswer}</p>

            {/* Metrics Strip */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <Gauge className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Confidence</span>
                    <span className={cn("text-xs font-black", confColor)}>{data.confidence}%</span>
                </div>
                {data.runwayImpact && data.runwayImpact !== 'Unknown' && (
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
                        impactPositive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                    )}>
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Runway</span>
                        <span className={cn("text-xs font-black", impactPositive ? "text-emerald-400" : "text-rose-400")}>
                            {data.runwayImpact}
                        </span>
                    </div>
                )}
            </div>

            {/* Reasoning */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reasoning</p>
                <p className="text-sm text-slate-300 leading-relaxed">{data.reasoning}</p>
            </div>

            {/* Trade-offs */}
            {data.tradeoffs && data.tradeoffs !== 'N/A' && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Trade-offs</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{data.tradeoffs}</p>
                </div>
            )}

            {/* Suggested Action */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                    <Crosshair className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Action</p>
                </div>
                <p className="text-sm text-white font-bold">{data.suggestedAction}</p>
            </div>
        </div>
    );
}

// ── Main AI CFO Content ───────────────────────────────────────────────────────
function AICFOContent() {
    const user = useAuthStore((state) => state.user);
    const profile = useStartupProfileStore((s) => s.profile);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const handledPrefilled = useRef(false);

    const userName = user?.name || profile?.companyName || 'Founder';
    const { data: state } = useCFOState();

    const runway = state?.summary?.runwayMonths ?? 0;
    const cashFlowScore = state?.dynamicConfidence?.score ?? 0;

    // Initial greeting
    useEffect(() => {
        if (state && messages.length === 0) {
            const greeting = runway < 6
                ? `⚠️ ${userName}, runway is ${runway.toFixed(1)} months — critical zone. Let's focus on extending it. Ask me "What should I cut?" for a specific plan.`
                : `Namaste ${userName}. Your runway is ${runway.toFixed(1)} months. Confidence: ${cashFlowScore}/100. What financial decision do you need clarity on today?`;
            setMessages([{ id: '1', role: 'ai', content: greeting, timestamp: 'Just now' }]);
        }
    }, [state, messages.length, userName, runway, cashFlowScore]);

    // Handle pre-filled question from URL
    useEffect(() => {
        const prefilled = searchParams.get('q');
        if (prefilled && messages.length > 0 && !isTyping && !handledPrefilled.current) {
            handledPrefilled.current = true;
            const timer = setTimeout(() => handleSend(prefilled), 800);
            return () => clearTimeout(timer);
        }
    }, [messages.length, searchParams]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (overrideInput?: string) => {
        const msgText = overrideInput || input;
        if (!msgText.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msgText, timestamp: 'Now' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await apiClient.post('/ai/chat', {
                message: msgText,
                versionId: state?.versionId,
            });

            const data = response.data.response;
            // Check if response is the new structured JSON format
            const isStructured = typeof data === 'object' && data.shortAnswer;

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: isStructured ? data.shortAnswer : (typeof data === 'string' ? data : JSON.stringify(data)),
                structured: isStructured ? data as StructuredResponse : undefined,
                timestamp: 'Now',
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "Connection issue. Please try again.",
                timestamp: 'Now',
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-140px)] flex gap-8">
                {/* Chat Interface */}
                <div className="flex-1 glass-card rounded-3xl flex flex-col overflow-hidden relative border-primary/20 bg-primary/[0.02]">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                                <BrainCircuit className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">AI CFO — Command Center</h3>
                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                    Indian CFO • Blunt • Data-Grounded
                                </span>
                            </div>
                        </div>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            runway < 6 ? 'bg-rose-500/20 text-rose-400' : runway < 12 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        )}>
                            {runway.toFixed(1)}mo runway
                        </div>
                    </div>

                    {/* Prompt Chips (shown when conversation is short) */}
                    {messages.length <= 1 && (
                        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-primary" />
                                Ask your CFO
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {PROMPT_CHIPS.map((chip, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(chip.label)}
                                        className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-primary/30 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <chip.icon className={cn("w-4 h-4", chip.color)} />
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{chip.label}</span>
                                            <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex flex-col max-w-[85%] gap-2",
                                        msg.role === 'ai' ? "self-start" : "self-end items-end"
                                    )}
                                >
                                    <div className={cn(
                                        "p-5 rounded-2xl text-sm leading-relaxed",
                                        msg.role === 'ai'
                                            ? "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
                                            : "bg-primary text-white font-medium rounded-tr-none shadow-lg shadow-primary/20"
                                    )}>
                                        {msg.role === 'ai' && msg.structured ? (
                                            <StructuredBubble data={msg.structured} />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>

                                    {msg.role === 'ai' && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{msg.timestamp}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleCopy(msg.structured ? JSON.stringify(msg.structured, null, 2) : msg.content, msg.id)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                                                </button>
                                                <button className="p-1 hover:bg-white/10 rounded transition-colors"><ThumbsUp className="w-3 h-3 text-slate-500" /></button>
                                                <button className="p-1 hover:bg-white/10 rounded transition-colors"><ThumbsDown className="w-3 h-3 text-slate-500" /></button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-slate-500">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs">Your CFO is analyzing...</span>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {PROMPT_CHIPS.slice(0, 3).map((chip, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(chip.label)}
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[10px] text-slate-400 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-bold uppercase tracking-wide flex items-center gap-1"
                                >
                                    <MessageCircle className="w-3 h-3" />
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask your CFO anything about your finances..."
                                className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white outline-none focus:border-primary transition-all shadow-inner"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={isTyping || !input.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Context Panel */}
                <div className="w-80 flex flex-col gap-6">
                    <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            Cash Flow Score
                        </h4>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-black text-white">{cashFlowScore}</span>
                            <span className="text-emerald-500 font-bold text-sm mb-1">/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${cashFlowScore}%` }} />
                        </div>
                    </div>

                    {state?.primaryRisk && (
                        <div className="glass-card rounded-3xl p-6 bg-rose-500/5 border-rose-500/10">
                            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Top Risk
                            </h4>
                            <p className="text-sm text-white font-bold mb-3">{state.primaryRisk.message}</p>
                            <a href="/simulator?preset=survival-mode" className="w-full py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2">
                                <Zap className="w-3 h-3" /> Simulate Fix
                            </a>
                        </div>
                    )}

                    <div className="glass-card rounded-3xl p-6 flex-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">AI Context</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Runway</span>
                                <span className={cn("text-sm font-bold", runway < 6 ? 'text-rose-400' : runway < 12 ? 'text-amber-400' : 'text-emerald-400')}>
                                    {runway.toFixed(1)} months
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Burn Trend</span>
                                <span className={cn("text-sm font-bold flex items-center gap-1",
                                    state?.summary?.burnTrend === 'increasing' ? 'text-rose-400' : state?.summary?.burnTrend === 'decreasing' ? 'text-emerald-400' : 'text-slate-400')}>
                                    {state?.summary?.burnTrend === 'increasing' && <TrendingUp className="w-3 h-3" />}
                                    {state?.summary?.burnTrend === 'decreasing' && <TrendingDown className="w-3 h-3" />}
                                    {state?.summary?.burnTrend || 'stable'}
                                </span>
                            </div>
                            {profile && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Stage</span>
                                        <span className="text-sm font-bold text-primary">{profile.stage}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Goal</span>
                                        <span className="text-sm font-bold text-white">{profile.primaryGoal}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                AI CFO uses your real financial data to provide <span className="text-primary font-bold">opinionated, structured advice</span>. Confidence levels reflect data quality.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function AICFOPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        }>
            <AICFOContent />
        </Suspense>
    );
}
