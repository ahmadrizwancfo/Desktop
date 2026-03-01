'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function PricingTable() {
    const [isAnnual, setIsAnnual] = useState(true);

    const plans = [
        {
            name: "Starter",
            description: "For pre-revenue startups",
            price: 0,
            features: [
                "Basic Cash Flow Dashboard",
                "Expense Tracking",
                "3 Months Transaction History",
                "Email Support"
            ],
            missing: ["AI Forecasting", "GST Auto-filing", "Investor Reporting"],
            cta: "Get Started Free",
            popular: false
        },
        {
            name: "Growth",
            description: "For scaling startups",
            price: isAnnual ? 4999 : 5999,
            features: [
                "Advanced AI Forecasting",
                "Automated GST & TDS",
                "Unlimited History",
                "Investor Data Rooms",
                "Priority Support"
            ],
            missing: [],
            cta: "Start 14-Day Trial",
            popular: true
        },
        {
            name: "Scale",
            description: "For established companies",
            price: "Custom",
            features: [
                "Dedicated CFO",
                "Multi-entity consolidation",
                "Custom ERP Integrations",
                "Audit Assistance",
                "24/7 Phone Support"
            ],
            missing: [],
            cta: "Contact Sales",
            popular: false
        }
    ];

    return (
        <section id="pricing" className="py-24 px-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full -z-10" />

            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
                <div className="inline-flex items-center gap-4 bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setIsAnnual(false)}
                        className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", !isAnnual ? "bg-white/10 text-white" : "text-slate-400 hover:text-white")}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setIsAnnual(true)}
                        className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", isAnnual ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white")}
                    >
                        Yearly <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1">SAVE 20%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {plans.map((plan, i) => (
                    <div
                        key={i}
                        className={cn(
                            "relative p-8 rounded-3xl border flex flex-col h-full",
                            plan.popular
                                ? "bg-[#0f172a]/80 backdrop-blur-xl border-primary/50 ring-2 ring-primary/20 shadow-2xl scale-105 z-10"
                                : "bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors"
                        )}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-sm text-slate-400 mb-6">{plan.description}</p>
                            <div className="flex items-baseline gap-1">
                                {typeof plan.price === 'number' ? (
                                    <>
                                        <span className="text-4xl font-black text-white">₹{plan.price}</span>
                                        <span className="text-slate-500">/mo</span>
                                    </>
                                ) : (
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow space-y-4 mb-8">
                            {plan.features.map((feat, j) => (
                                <div key={j} className="flex items-start gap-3">
                                    <div className={cn("mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0", plan.popular ? "bg-primary text-white" : "bg-white/10 text-slate-400")}>
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-sm text-slate-300">{feat}</span>
                                </div>
                            ))}
                            {plan.missing.map((feat, j) => (
                                <div key={j} className="flex items-start gap-3 opacity-40">
                                    <div className="mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-white/5 text-slate-500">
                                        <X className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-sm text-slate-500">{feat}</span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/register"
                            className={cn(
                                "w-full py-4 rounded-xl font-bold text-center transition-all",
                                plan.popular
                                    ? "bg-primary text-white shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
                                    : "bg-white/5 text-white hover:bg-white/10"
                            )}
                        >
                            {plan.cta}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
