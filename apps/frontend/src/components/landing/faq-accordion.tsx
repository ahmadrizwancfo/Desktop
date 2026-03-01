'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function FAQAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: "How does the AI forecasting work?",
            answer: "We connect to your bank accounts and accounting software (like Zoho/Quickbooks) to analyze historical cash flow patterns. Our GPT-4 engine then projects future burn based on your recurring expenses and hiring plans."
        },
        {
            question: "Is my financial data secure?",
            answer: "Absolutely. We use bank-grade 256-bit encryption. We are ISO 27001 certified and never sell your data. We use read-only access for bank connections."
        },
        {
            question: "Does this replace my CA?",
            answer: "Not entirely. FounderCFO handles the day-to-day operations, bookkeeping, and compliance filing. Your CA can still use our reports for final statutory audits. We make your CA's life 10x easier."
        },
        {
            question: "Can I cancel anytime?",
            answer: "Yes, there are no long-term contracts for the monthly plan. You can export all your data before cancelling."
        }
    ];

    return (
        <section className="py-24 px-6 max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, i) => (
                    <div
                        key={i}
                        className={cn(
                            "rounded-2xl transition-all duration-300 overflow-hidden",
                            openIndex === i ? "bg-white/5 border border-white/10" : "hover:bg-white/[0.02]"
                        )}
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full flex items-center justify-between p-6 text-left"
                        >
                            <span className={cn("font-medium text-lg", openIndex === i ? "text-white" : "text-slate-400")}>
                                {faq.question}
                            </span>
                            <div className={cn("p-2 rounded-full transition-colors", openIndex === i ? "bg-primary text-white" : "bg-white/5 text-slate-500")}>
                                {openIndex === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                        </button>

                        <AnimatePresence>
                            {openIndex === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="px-6 pb-6 text-slate-400 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-20 p-12 rounded-3xl bg-gradient-to-br from-primary via-indigo-600 to-purple-700 text-center shadow-2xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <h2 className="text-3xl md:text-4xl font-black text-white mb-6 relative z-10">Ready to automate your finance?</h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto relative z-10">Join 500+ founders who sleep better at night knowing their finances are sorted.</p>
                <Link
                    href="/register"
                    className="inline-flex py-4 px-8 rounded-xl bg-white text-primary font-bold shadow-xl hover:scale-105 transition-transform relative z-10"
                >
                    Get Started For Free
                </Link>
            </div>
        </section>
    );
}
