'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
    Languages,
    ArrowRight,
    Copy,
    CheckCircle2,
    Sparkles,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const exampleTranslations = [
    {
        technical: "EBITDA margin expanded by 200 bps YoY due to improved operating leverage",
        simple: "We kept ₹2 more as profit for every ₹100 we made compared to last year, because our fixed costs stayed the same while we sold more"
    },
    {
        technical: "CAC:LTV ratio improved to 1:4 with 18-month payback period",
        simple: "For every ₹1 we spend to get a customer, they pay us back ₹4 over their lifetime. It takes 18 months to recover what we spent to acquire them"
    },
    {
        technical: "Working capital cycle reduced from 45 to 32 days",
        simple: "Money flows back into our bank 13 days faster now. We get paid quicker and don't tie up as much cash in inventory"
    }
];

export default function FinanceTranslatorPage() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<'simplify' | 'technical'>('simplify');

    const handleTranslate = async () => {
        if (!input.trim()) return;

        setIsLoading(true);

        // Simulate AI translation (in production, call OpenAI/Claude API)
        setTimeout(() => {
            if (mode === 'simplify') {
                setOutput(`Here's what this means in simple terms:\n\n${input.includes('EBITDA') ?
                    "Your company's core profitability (before taxes, interest, and accounting adjustments) shows how well the actual business operations are doing." :
                    input.includes('runway') ?
                        "This tells you how many months your company can survive with the current cash and spending rate." :
                        input.includes('burn') ?
                            "This is how much money you're spending each month beyond what you earn. A lower burn = longer survival." :
                            "This financial metric helps measure your company's health. In simpler words: it tells you if you're making smart use of your money."
                    }`);
            } else {
                setOutput(`Technical analysis:\n\n${input.includes('profit') ?
                    "Net margin = (Net Income / Revenue) × 100. Consider EBITDA for operational efficiency metrics." :
                    input.includes('customer') ?
                        "Calculate CAC (Customer Acquisition Cost) = Total Marketing Spend / New Customers. Track LTV:CAC ratio for unit economics." :
                        "Consider using standardized financial metrics like CAGR, ARR, MRR for consistent benchmarking."
                    }`);
            }
            setIsLoading(false);
        }, 1500);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Finance Translator</h1>
                    <p className="text-slate-400 mt-3">
                        Translate complex financial jargon into simple language, or vice versa.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center">
                    <div className="bg-white/5 p-1 rounded-xl inline-flex">
                        <button
                            onClick={() => setMode('simplify')}
                            className={cn(
                                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                                mode === 'simplify' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                            )}
                        >
                            Simplify Jargon
                        </button>
                        <button
                            onClick={() => setMode('technical')}
                            className={cn(
                                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                                mode === 'technical' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                            )}
                        >
                            Make Technical
                        </button>
                    </div>
                </div>

                {/* Translator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input */}
                    <div className="glass-card rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                {mode === 'simplify' ? 'Technical Term' : 'Simple Description'}
                            </h3>
                            <Languages className="w-5 h-5 text-slate-500" />
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={mode === 'simplify'
                                ? "Enter financial jargon, e.g., 'Our EBITDA margin is 25% with a 3x revenue multiple'"
                                : "Describe what you want to say, e.g., 'We're making good profit compared to our competitors'"
                            }
                            className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-primary/50 transition-all resize-none"
                        />
                        <button
                            onClick={handleTranslate}
                            disabled={isLoading || !input.trim()}
                            className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Translate
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Output */}
                    <div className="glass-card rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                {mode === 'simplify' ? 'Plain English' : 'Technical Version'}
                            </h3>
                            {output && (
                                <button
                                    onClick={handleCopy}
                                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                        <div className="h-40 bg-white/5 border border-white/10 rounded-xl p-4 overflow-auto">
                            {output ? (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-slate-300 whitespace-pre-wrap"
                                >
                                    {output}
                                </motion.p>
                            ) : (
                                <p className="text-sm text-slate-500 italic">
                                    Translation will appear here...
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Examples */}
                <div className="glass-card rounded-3xl p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Example Translations</h3>
                    <div className="space-y-4">
                        {exampleTranslations.map((ex, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all cursor-pointer"
                                onClick={() => {
                                    setInput(ex.technical);
                                    setOutput(ex.simple);
                                }}
                            >
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Technical</p>
                                    <p className="text-sm text-white">{ex.technical}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-emerald-500 uppercase font-bold mb-1">Simple</p>
                                    <p className="text-sm text-slate-300">{ex.simple}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
