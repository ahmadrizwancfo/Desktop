'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronDown, 
    BarChart3, 
    TrendingUp, 
    ListChecks, 
    History,
    ChevronUp,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataQuality } from '@/store/cfo-state-store';

interface DeepDiveTabsProps {
    metrics: React.ReactNode;
    trends: React.ReactNode;
    mandates: React.ReactNode;
    history: React.ReactNode;
}

export function DeepDiveTabs({ metrics, trends, mandates, history }: DeepDiveTabsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'metrics' | 'trends' | 'mandates' | 'history'>('metrics');
    const dq = useDataQuality();
    const isLowQuality = dq.confidenceScore < 70;

    const tabs = [
        { id: 'metrics', label: 'Metrics', icon: BarChart3 },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
        { id: 'mandates', label: 'Mandates', icon: ListChecks, gated: isLowQuality },
        { id: 'history', label: 'History', icon: History },
    ] as const;

    return (
        <div className="mt-20 pt-10 border-t border-white/5">
            {/* Toggle Header */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-4 group w-full mb-8"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/30 transition-colors">
                        {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                    <h3 className={cn(
                        "text-[11px] font-black uppercase tracking-[0.25em] transition-colors",
                        isOpen ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                    )}>
                        Deep Intelligence Audit
                    </h3>
                </div>
                <div className="h-[1px] flex-1 bg-white/5 group-hover:bg-primary/20 transition-colors" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">
                    {isOpen ? 'Collapse' : 'Expand on Demand'}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-12"
                    >
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl w-fit">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab.id 
                                            ? "bg-primary text-black shadow-lg shadow-primary/20" 
                                            : "text-slate-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    {'gated' in tab && tab.gated && <Lock className="w-2.5 h-2.5 text-amber-400" />}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[400px] py-6">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === 'metrics' && metrics}
                                {activeTab === 'trends' && trends}
                                {activeTab === 'mandates' && mandates}
                                {activeTab === 'history' && history}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
