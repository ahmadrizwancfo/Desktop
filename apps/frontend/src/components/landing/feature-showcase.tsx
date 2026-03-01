'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ShieldCheck, BarChart3, Receipt, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utils file

export function FeatureShowcase() {
    const [activeTab, setActiveTab] = useState(0);

    const features = [
        {
            id: 'ai-analysis',
            title: 'AI Financial Analysis',
            description: 'Get instant answers to complex financial questions. "What is my burn rate vs last month?" or "Project cash flow for Q4 based on current trends."',
            icon: BrainCircuit,
            color: 'bg-primary',
            image: '/features/ai_demo.png' // You would typically have real images here
        },
        {
            id: 'compliance',
            title: 'Auto-Compliance',
            description: 'Never miss a TDS payment or GST filing again. We automatically reconcile your bank statements with tax obligations in real-time.',
            icon: ShieldCheck,
            color: 'bg-emerald-500',
            image: '/features/compliance.png'
        },
        {
            id: 'cashflow',
            title: 'Cash Flow Forecasting',
            description: 'Visualize your runway with scenario planning. See exactly how hiring 5 new engineers affects your bottom line in 6 months.',
            icon: Wallet,
            color: 'bg-amber-500',
            image: '/features/cashflow.png'
        }
    ];

    return (
        <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-20 max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Engineered for Responsible Growth</h2>
                <p className="text-xl text-slate-400">
                    Everything you need to replace your fragmented finance stack with one intelligent operating system.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                {/* Left: Interactive Tabs */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {features.map((feature, idx) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveTab(idx)}
                            className={cn(
                                "group text-left p-6 rounded-3xl transition-all duration-300 border",
                                activeTab === idx
                                    ? "bg-white/5 border-white/10 shadow-xl"
                                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                            )}
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    activeTab === idx ? feature.color : "bg-white/10 group-hover:bg-white/20"
                                )}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className={cn("text-xl font-bold", activeTab === idx ? "text-white" : "text-slate-400 group-hover:text-slate-200")}>
                                    {feature.title}
                                </h3>
                            </div>
                            <p className={cn("text-sm leading-relaxed pl-14", activeTab === idx ? "text-slate-300" : "text-slate-500")}>
                                {feature.description}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Right: Visual Preview */}
                <div className="lg:col-span-7 relative h-[500px]">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-indigo-500/10 rounded-[3rem] blur-3xl -z-10" />

                    <div className="relative h-full w-full rounded-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="w-full h-full rounded-xl bg-white/5 overflow-hidden flex items-center justify-center relative"
                            >
                                {/* Placeholder for feature visual - Using abstract representation since we don't have images */}
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />

                                <div className="text-center p-10">
                                    <div className={cn("w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl", features[activeTab].color)}>
                                        {React.createElement(features[activeTab].icon, { className: "w-10 h-10 text-white" })}
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-2">{features[activeTab].title} Visual</div>
                                    <div className="text-slate-400 text-sm">Interactive Dashboard Preview</div>
                                </div>

                                {/* Simulated UI Elements */}
                                <div className="absolute bottom-10 left-10 right-10 h-32 bg-white/5 rounded-t-xl border-t border-x border-white/10 p-4 space-y-3">
                                    <div className="h-2 w-1/3 bg-white/10 rounded-full" />
                                    <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                                    <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
