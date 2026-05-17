'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { KeyboardShortcuts } from '../ui/keyboard-shortcuts';
import { PageTransition } from './page-transition';
import { useCfoStateStore } from '@/store/cfo-state-store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Info } from 'lucide-react';

export function DashboardLayout({ children, banner }: { children: React.ReactNode, banner?: React.ReactNode }) {
    const state = useCfoStateStore(s => s.state);
    const audit = state?.behavioralAudit;

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

            <div className="flex-1 bg-[#020617] text-foreground flex overflow-hidden">
                {/* Sidebar - Desktop */}
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    {banner}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pt-4 px-8 pb-8">
                        <PageTransition>
                            {children}
                        </PageTransition>
                    </div>
                </main>
            </div>

            {/* Keyboard Shortcuts */}
            <KeyboardShortcuts />

            {/* Dynamic Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full" />
            </div>
        </div>
    );
}
