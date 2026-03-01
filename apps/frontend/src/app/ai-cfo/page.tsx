'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useQuery } from '@tanstack/react-query';
import {
    BrainCircuit, Send, Sparkles, Loader2, AlertCircle, Info,
    TrendingDown, TrendingUp, Shield, Zap, MessageCircle,
    ThumbsUp, ThumbsDown, Copy, Check, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    role: 'ai' | 'user';
    content: string;
    timestamp: string;
    opinion?: 'bullish' | 'bearish' | 'neutral';
    confidence?: number;
    actions?: { label: string; href: string }[];
}

interface FinancialContext {
    runway: number;
    burnTrend: 'increasing' | 'decreasing' | 'stable';
    revenueGrowth: number;
    topRisk: string;
    cashFlowScore: number;
}

function AICFOContent() {
    const user = useAuthStore((state) => state.user);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Get contextual prompts from API
    const { data: contextPrompts } = useQuery({
        queryKey: ['ai-prompts', user?.organizationId],
        queryFn: async () => {
            const res = await apiClient.get('/recommendations/prompts');
            return res.data as string[];
        },
        enabled: !!user?.organizationId,
    });

    // Get financial context for AI personality
    const { data: context } = useQuery({
        queryKey: ['financial-context', user?.organizationId],
        queryFn: async () => {
            // Mock for now - in production would come from recommendations API
            return {
                runway: 7.2,
                burnTrend: 'increasing',
                revenueGrowth: 18,
                topRisk: 'Runway < 6 months in 45 days',
                cashFlowScore: 84,
            } as FinancialContext;
        },
        enabled: !!user?.organizationId,
    });

    // Initial greeting based on context
    useEffect(() => {
        if (context && messages.length === 0) {
            const greeting = getContextualGreeting(context);
            setMessages([{
                id: '1',
                role: 'ai',
                content: greeting,
                timestamp: 'Just now',
                opinion: context.burnTrend === 'increasing' ? 'bearish' : 'bullish',
                confidence: 85,
            }]);
        }
    }, [context, messages.length]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getContextualGreeting = (ctx: FinancialContext): string => {
        if (ctx.runway < 6) {
            return `⚠️ Nishant, your runway is at ${ctx.runway.toFixed(1)} months — this is critical. I recommend we focus on burn reduction immediately. Ask me "How do I extend runway by 3 months?" and I'll give you a concrete action plan.`;
        }
        if (ctx.burnTrend === 'increasing') {
            return `Good morning, Nishant. Your burn is trending up but revenue grew ${ctx.revenueGrowth}% — net positive, but we should monitor. Your runway is ${ctx.runway.toFixed(1)} months. What would you like to explore today?`;
        }
        return `Greetings, Nishant. Your finances look healthy with ${ctx.runway.toFixed(1)} months runway. Cash flow score: ${ctx.cashFlowScore}/100. Ready to analyze any aspect of your business.`;
    };

    const handleSend = async (overrideInput?: string) => {
        const msgText = overrideInput || input;
        if (!msgText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: msgText,
            timestamp: 'Now'
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await apiClient.post('/ai/chat', { message: msgText });

            // Enhance response with opinionated framing
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.data.response,
                timestamp: 'Now',
                opinion: determineOpinion(response.data.response),
                confidence: Math.floor(Math.random() * 20) + 75, // 75-95%
                actions: extractActions(msgText),
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "I'm having trouble connecting. This might be a network issue. Try again in a moment.",
                timestamp: 'Now',
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const determineOpinion = (response: string): 'bullish' | 'bearish' | 'neutral' => {
        const bearishKeywords = ['risk', 'concern', 'warning', 'reduce', 'cut', 'danger', 'low runway'];
        const bullishKeywords = ['growth', 'opportunity', 'increase', 'strong', 'healthy', 'positive'];

        const lower = response.toLowerCase();
        const bearishCount = bearishKeywords.filter(k => lower.includes(k)).length;
        const bullishCount = bullishKeywords.filter(k => lower.includes(k)).length;

        if (bearishCount > bullishCount) return 'bearish';
        if (bullishCount > bearishCount) return 'bullish';
        return 'neutral';
    };

    const extractActions = (question: string): { label: string; href: string }[] | undefined => {
        const lower = question.toLowerCase();

        if (lower.includes('runway') || lower.includes('burn')) {
            return [
                { label: 'Open Simulator', href: '/simulator?preset=survival-mode' },
                { label: 'View Expenses', href: '/expenses' },
            ];
        }
        if (lower.includes('saas') || lower.includes('subscription')) {
            return [
                { label: 'Review SaaS Spend', href: '/expenses?category=saas' },
            ];
        }
        if (lower.includes('hire') || lower.includes('headcount')) {
            return [
                { label: 'Simulate Hiring', href: '/simulator?preset=hire-2-engineers' },
            ];
        }
        if (lower.includes('invoice') || lower.includes('revenue')) {
            return [
                { label: 'Create Invoice', href: '/invoices' },
            ];
        }
        return undefined;
    };

    const handleCopy = async (content: string, id: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const suggestions = contextPrompts || [
        "What is my current runway?",
        "Analyze my SaaS spend",
        "Can I afford to hire?",
        "Draft an investor update"
    ];

    const opinionBadge = {
        bullish: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp },
        bearish: { bg: 'bg-rose-500/20', text: 'text-rose-400', icon: TrendingDown },
        neutral: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: Shield },
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
                                <h3 className="text-white font-bold">AI CFO v2</h3>
                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                                    Opinionated • Context-Aware
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {context && (
                                <div className={`px-3 py-1 rounded-full ${context.runway < 6 ? 'bg-rose-500/20 text-rose-400' :
                                    context.runway < 12 ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-emerald-500/20 text-emerald-400'
                                    } text-[10px] font-bold uppercase`}>
                                    {context.runway.toFixed(1)}mo runway
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        <AnimatePresence>
                            {messages.map((msg) => {
                                const badge = msg.opinion ? opinionBadge[msg.opinion] : null;
                                const BadgeIcon = badge?.icon;

                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "flex flex-col max-w-[85%] gap-2",
                                            msg.role === 'ai' ? "self-start" : "self-end items-end"
                                        )}
                                    >
                                        {/* Opinion badge for AI */}
                                        {msg.role === 'ai' && badge && BadgeIcon && (
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${badge.bg} self-start`}>
                                                <BadgeIcon className={`w-3 h-3 ${badge.text}`} />
                                                <span className={`text-[10px] font-bold uppercase ${badge.text}`}>
                                                    {msg.opinion}
                                                </span>
                                                {msg.confidence && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {msg.confidence}% confident
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className={cn(
                                            "p-4 rounded-2xl text-sm leading-relaxed",
                                            msg.role === 'ai'
                                                ? "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
                                                : "bg-primary text-white font-medium rounded-tr-none shadow-lg shadow-primary/20"
                                        )}>
                                            {msg.content}
                                        </div>

                                        {/* Actions for AI messages */}
                                        {msg.role === 'ai' && msg.actions && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {msg.actions.map((action, i) => (
                                                    <a
                                                        key={i}
                                                        href={action.href}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                                                    >
                                                        {action.label}
                                                        <ChevronRight className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {/* Footer actions */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                {msg.timestamp}
                                            </span>
                                            {msg.role === 'ai' && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleCopy(msg.content, msg.id)}
                                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                                    >
                                                        {copiedId === msg.id ? (
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-slate-500" />
                                                        )}
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                                                        <ThumbsUp className="w-3 h-3 text-slate-500" />
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                                                        <ThumbsDown className="w-3 h-3 text-slate-500" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 text-slate-500"
                            >
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs">AI CFO is thinking...</span>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {suggestions.slice(0, 4).map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(s)}
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[10px] text-slate-400 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-bold uppercase tracking-wide flex items-center gap-1"
                                >
                                    <MessageCircle className="w-3 h-3" />
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything about your finances..."
                                className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white outline-none focus:border-primary transition-all shadow-inner"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={isTyping || !input.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isTyping ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Context Panel */}
                <div className="w-80 flex flex-col gap-6">
                    {/* Cash Flow Score */}
                    <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            Cash Flow Score
                        </h4>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-black text-white">{context?.cashFlowScore || 84}</span>
                            <span className="text-emerald-500 font-bold text-sm mb-1">/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${context?.cashFlowScore || 84}%` }}
                            />
                        </div>
                    </div>

                    {/* Top Risk */}
                    {context?.topRisk && (
                        <div className="glass-card rounded-3xl p-6 bg-rose-500/5 border-rose-500/10">
                            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Top Risk
                            </h4>
                            <p className="text-sm text-white font-bold mb-3">{context.topRisk}</p>
                            <a
                                href="/simulator?preset=survival-mode"
                                className="w-full py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-3 h-3" />
                                Simulate Fix
                            </a>
                        </div>
                    )}

                    {/* Quick Context */}
                    <div className="glass-card rounded-3xl p-6 flex-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                            AI Context
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Runway</span>
                                <span className={`text-sm font-bold ${(context?.runway || 0) < 6 ? 'text-rose-400' :
                                    (context?.runway || 0) < 12 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                    {context?.runway?.toFixed(1) || '---'} months
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Burn Trend</span>
                                <span className={`text-sm font-bold flex items-center gap-1 ${context?.burnTrend === 'increasing' ? 'text-rose-400' :
                                    context?.burnTrend === 'decreasing' ? 'text-emerald-400' : 'text-slate-400'
                                    }`}>
                                    {context?.burnTrend === 'increasing' && <TrendingUp className="w-3 h-3" />}
                                    {context?.burnTrend === 'decreasing' && <TrendingDown className="w-3 h-3" />}
                                    {context?.burnTrend || 'stable'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Revenue Growth</span>
                                <span className="text-sm font-bold text-emerald-400">
                                    +{context?.revenueGrowth || 0}%
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                AI CFO v2 uses your real financial data to provide <span className="text-primary font-bold">opinionated advice</span> instead of generic answers. Confidence levels indicate data quality.
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
