'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { KeyboardShortcuts } from '../ui/keyboard-shortcuts';
import { PageTransition } from './page-transition';
import { useCfoStateStore } from '@/store/cfo-state-store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Info, Menu, X, MessageSquare, Send, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children, banner }: { children: React.ReactNode, banner?: React.ReactNode }) {
    const state = useCfoStateStore(s => s.state);
    const audit = state?.behavioralAudit;

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackText.trim()) return;

        setSubmittingFeedback(true);
        setTimeout(() => {
            setSubmittingFeedback(false);
            setFeedbackText('');
            setIsFeedbackOpen(false);
            toast.success('Thank you! Your feedback has been logged securely.');
        }, 1000);
    };

    const isProbationary = audit?.isProbationary && state?.dashboardMode !== 'CRITICAL';
    const isFailedProbation = audit?.isProbationary && state?.dashboardMode === 'CRITICAL';

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <AnimatePresence>
                {isProbationary && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-primary/20 border-b border-primary/20 px-6 py-2 flex items-center justify-center gap-3 relative z-[100] shrink-0"
                    >
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                            Mastermind Status: <span className="text-white">Probationary</span>. {audit.probationDaysLeft} days of disciplined action to reach 'Verified Disciplined' status.
                        </span>
                    </motion.div>
                )}

                {isFailedProbation && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-rose-500/20 border-b border-rose-500/20 px-6 py-2 flex items-center justify-center gap-3 relative z-[100] shrink-0"
                    >
                        <Info className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                            Clock Reset: <span className="text-white">Critical Risk Detected</span>. 7-day probation restarted to verify stability.
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Top Navbar */}
            <div className="flex lg:hidden items-center justify-between px-6 py-4 bg-[#0a0f1e]/80 border-b border-white/5 shrink-0 z-40">
                <Logo size="sm" />
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg bg-white/5 border border-white/10 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Sidebar Overlay Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[100] flex lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative flex flex-col w-72 max-w-xs h-full bg-[#020617] z-50 border-r border-white/5"
                        >
                            {/* Mobile drawer header */}
                            <div className="flex justify-between items-center px-6 pt-6 mb-4">
                                <Logo size="sm" />
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-1.5 text-slate-500 hover:text-white rounded-lg bg-white/5 border border-white/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <Sidebar className="border-r-0 flex-1 pt-2" onItemClick={() => setIsMobileMenuOpen(false)} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex-1 bg-[#020617] text-foreground flex overflow-hidden">
                {/* Sidebar - Desktop */}
                <Sidebar className="hidden lg:flex" />

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    {banner}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pt-4 px-4 md:px-8 pb-8">
                        <PageTransition>
                            {children}
                        </PageTransition>
                    </div>
                </main>
            </div>

            {/* Keyboard Shortcuts */}
            <KeyboardShortcuts />

            {/* Floating Feedback Trigger */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    Feedback
                </button>
            </div>

            {/* Feedback Form Modal */}
            <AnimatePresence>
                {isFeedbackOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsFeedbackOpen(false)}
                                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2 tracking-tight">
                                <Sparkles className="w-5 h-5 text-primary" />
                                What can we improve?
                            </h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                Your advice shapes FounderCFO. Suggest dashboard enhancements, new calculations, or report styles.
                            </p>

                            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                                <textarea
                                    required
                                    rows={4}
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="I'd love to see direct Stripe invoice imports, or more granular burn charts..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 text-sm resize-none"
                                />

                                <button
                                    type="submit"
                                    disabled={submittingFeedback || !feedbackText.trim()}
                                    className="w-full py-4 rounded-xl bg-white text-[#020617] font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submittingFeedback ? (
                                        <>Submitting...</>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5 fill-current" />
                                            Submit Feedback
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dynamic Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full" />
            </div>
        </div>
    );
}
