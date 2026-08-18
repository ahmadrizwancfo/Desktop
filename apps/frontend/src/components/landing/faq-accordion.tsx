'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
    {
        q: "Does FounderCFO replace my CA or accountant?",
        a: "No. Your CA files historical statutory taxes after the month ends. FounderCFO acts as your daily operating partner between filings—auditing live bank movements, stress-testing payroll buffers, and modeling financial trade-offs before you make expensive commitments."
    },
    {
        q: "How do you connect without my bank password?",
        a: "We strictly never ask for NetBanking credentials, PINs, or OTPs. You simply drop the standard statement CSV or PDF you already download from your bank portal (HDFC, ICICI, Axis, SBI, Kotak) or daybook XML from Tally Prime. The engine processes it in-memory."
    },
    {
        q: "How is this different from accounting software like Zoho Books or QuickBooks?",
        a: "Zoho and QuickBooks are historical compliance ledgers designed for tax reporting. They record what already happened. FounderCFO is a forward-looking decision engine that answers what happens to your cash runway if you make a hire, cut spend, or offer credit terms today."
    },
    {
        q: "What if our revenue is seasonal or lumpy?",
        a: "FounderCFO does not assume naive flat linear burn. Our cashflow projection accounts for discrete receivable collection lag (DSO), enterprise payment terms, and statutory GST/TDS tax lock dates to calculate true spendable runway rather than theoretical revenue."
    }
];

export function FAQAccordion() {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <section className="py-28 px-6 max-w-4xl mx-auto border-t border-white/5">
            <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <span>CLEAR ANSWERS</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                    Frequently asked questions.
                </h2>
                <p className="text-sm text-slate-400 font-normal">
                    Everything you need to know about provenance, security, and how FounderCFO works.
                </p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, idx) => {
                    const isOpen = openIdx === idx;
                    return (
                        <div 
                            key={idx}
                            className="rounded-xl bg-[#0a0f1e] border border-white/5 overflow-hidden transition-colors hover:border-white/10"
                        >
                            <button
                                onClick={() => setOpenIdx(isOpen ? null : idx)}
                                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                            >
                                <span className="font-semibold text-white text-base">
                                    {faq.q}
                                </span>
                                <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180 text-white")} />
                            </button>

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-white/5 font-sans">
                                            {faq.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
