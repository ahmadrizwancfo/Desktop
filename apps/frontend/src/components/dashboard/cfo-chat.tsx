"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, TrendingUp, AlertTriangle, User, Target, BarChart3 } from 'lucide-react';
import { useCfoChatStore, ChatMessage } from '../../store/cfo-chat-store';
import { useAuthStore } from '../../store/auth-store';
import { cn } from '../../lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

export function CfoChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const { messages, isPending, sendMessage, suggestions, fetchSuggestions, fetchProactiveSignals, proactiveSignals, convertToAction } = useCfoChatStore();
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSuggestions();
            fetchProactiveSignals();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (scrollRef.current && messages.length > 0) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isPending]);

    if (!isAuthenticated) return null;

    const handleSend = async (q?: string) => {
        const queryText = q || input;
        if (!queryText.trim() || isPending) return;
        setInput('');
        await sendMessage(queryText);
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-[400px] md:w-[500px] h-[700px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-bottom border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <Target className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-widest text-xs">CFO Chat</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grounded in Live Data</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                            {/* v7.0 Proactive Signals in Chat */}
                            {proactiveSignals.map((signal, idx) => (
                                <motion.div 
                                    key={`sig-${idx}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Proactive Insight</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{signal.message}</p>
                                    <button 
                                        onClick={() => handleSend(signal.query)}
                                        className="text-[10px] font-black text-white bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20 transition-all uppercase tracking-widest"
                                    >
                                        Explore Signal
                                    </button>
                                </motion.div>
                            ))}

                            {messages.map((msg) => (
                                <ChatMessageItem key={msg.id} msg={msg} onConvert={convertToAction} />
                            ))}
                            {isPending && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center animate-pulse">
                                        <Target className="w-4 h-4 text-primary/40" />
                                    </div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">CFO is analyzing...</div>
                                </div>
                            )}
                        </div>

                        {/* v7.0 Suggested Questions */}
                        {suggestions.length > 0 && !isPending && (
                            <div className="px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide bg-black/10">
                                {suggestions.map((q, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handleSend(q)}
                                        className="whitespace-nowrap px-4 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-6 bg-black/20 border-t border-white/5">
                            <div className="relative">
                                <input 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask about runway, expenses, or hiring impact..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all pr-16"
                                />
                                <button 
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isPending}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-black rounded-xl hover:bg-white transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center transition-all duration-500 border-2 relative",
                    isOpen ? "bg-white border-white text-black rotate-90" : "bg-primary border-primary/20 text-black"
                )}
            >
                {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
                {!isOpen && proactiveSignals.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 border-2 border-black rounded-full animate-bounce" />
                )}
            </motion.button>
        </div>
    );
}

function ChatMessageItem({ msg, onConvert }: { msg: ChatMessage; onConvert?: (id: string, text: string) => Promise<void> }) {
    const isAi = msg.role === 'assistant';
    const [converted, setConverted] = useState(false);

    return (
        <div className={cn("flex flex-col", isAi ? "items-start" : "items-end")}>
            <div className={cn(
                "max-w-[90%] rounded-3xl p-5",
                isAi ? "bg-white/5 border border-white/10 text-slate-200" : "bg-primary text-black font-medium"
            )}>
                <p className="text-sm leading-relaxed">{msg.content}</p>

                {/* V6 Structured Extensions */}
                {isAi && (msg.data || msg.chart || msg.action) && (
                    <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
                        {/* v7.0 Convert to Action Button */}
                        {!converted && (
                            <button 
                                onClick={async () => {
                                    if (onConvert) await onConvert(msg.id, msg.content);
                                    setConverted(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary/20 transition-all"
                            >
                                <Target className="w-3 h-3" /> Convert to Tracked Action
                            </button>
                        )}
                        {converted && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                <MessageSquare className="w-3 h-3" /> Decision Created
                            </div>
                        )}
                        {/* Data Grid */}
                        {msg.data && (
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(msg.data).map(([key, val]) => (
                                    <div key={key} className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-xs font-black text-white">{String(val)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chart */}
                        {msg.chart && (
                            <div className="h-48 w-full bg-black/20 rounded-2xl p-4 border border-white/5">
                                <ResponsiveContainer width="100%" height="100%">
                                    {msg.chart.type === 'bar' ? (
                                        <BarChart data={msg.chart.data}>
                                            <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </BarChart>
                                    ) : (
                                        <LineChart data={msg.chart.data}>
                                            <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={3} dot={false} />
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </LineChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Action */}
                        {msg.action && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                <Target className="w-5 h-5 text-emerald-500" />
                                <div className="flex-1">
                                    <span className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest block">Recommended Action</span>
                                    <span className="text-xs font-black text-white">{msg.action.title}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                {isAi ? "FounderCFO Intelligence" : "Founder"} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
}
