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
            description: "For early-stage founders",
            price: 0,
            features: [
                "Basic Cash Flow Dashboard",
                "Expense & Burn Tracking",
                "Bank Account Sync (1)",
                "Weekly Runway Reports"
            ],
            missing: ["AI Forecasting", "Scenario Modeling", "Priority Support"],
            cta: "Get Started Free",
            popular: false
        },
        {
            name: "Growth",
            description: "For growing startups making weekly decisions",
            price: isAnnual ? 3999 : 4999,
            features: [
                "Advanced AI Forecasting",
                "Burn Prediction Alerts",
                "Unlimited Integrations",
                "Scenario Planning",
                "Priority Email Support"
            ],
            missing: [],
            cta: "Try 14 Days Free",
            popular: true
        },
        {
            name: "Scale",
            description: "For teams needing deeper financial control",
            price: "Custom",
            features: [
                "Dedicated Financial Advisor",
                "Custom Audit Assistance",
                "ERP & Payroll Integrations",
                "Multi-Entity Support",
                "24/7 Phone Support"
            ],
            missing: [],
            cta: "Book Demo",
            popular: false
        }
    ];

    return (
        <section id="pricing" className="py-20 px-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />

            <div className="text-center mb-16 px-6">
                <h2 className="text-3xl md:text-5xl font-black mb-6 editorial tracking-tight">Simple, Growth-Focused Pricing</h2>
                <p className="text-slate-400 mb-8 max-w-xl mx-auto font-light">
                    Start free. Upgrade when you need deeper insights.
                </p>
                <div className="inline-flex items-center gap-4 bg-white/[0.03] border border-white/5 p-1 rounded-xl backdrop-blur-md">
                    <button
                        onClick={() => setIsAnnual(false)}
                        className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", !isAnnual ? "bg-white/10 text-white" : "text-slate-500 hover:text-white")}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setIsAnnual(true)}
                        className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", isAnnual ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white")}
                    >
                        Yearly <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1 tracking-tighter">SAVE 20%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-center">
                {plans.map((plan, i) => (
                    <div
                        key={i}
                        className={cn(
                            "relative p-8 rounded-[2.5rem] border flex flex-col h-full transition-all duration-500",
                            plan.popular
                                ? "bg-[#0f172a]/95 backdrop-blur-xl border-primary shadow-[0_0_50px_-12px_rgba(124,58,237,0.3)] scale-105 z-10"
                                : "bg-white/[0.02] border-white/5 hover:border-white/20"
                        )}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg whitespace-nowrap">
                                Most founders choose this
                            </div>
                        )}

                        <div className="mb-8 relative z-10">
                            <h3 className="text-xl font-bold text-white mb-2 editorial tracking-tight">{plan.name}</h3>
                            <p className="text-sm text-slate-400 mb-6 font-light">{plan.description}</p>
                            <div className="flex items-baseline gap-1">
                                {typeof plan.price === 'number' ? (
                                    <>
                                        <span className="text-4xl font-black text-white">₹{plan.price}</span>
                                        <span className="text-slate-500 font-medium">/mo</span>
                                    </>
                                ) : (
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow space-y-4 mb-10 relative z-10">
                            {plan.features.map((feat, j) => (
                                <div key={j} className="flex items-start gap-3">
                                    <div className={cn("mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0", plan.popular ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-500")}>
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className={cn("text-sm", plan.popular ? "text-slate-200" : "text-slate-400")}>{feat}</span>
                                </div>
                            ))}
                            {plan.missing.map((feat, j) => (
                                <div key={j} className="flex items-start gap-3 opacity-30">
                                    <div className="mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white/5 text-slate-700">
                                        <X className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm text-slate-600">{feat}</span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href="/register"
                            className={cn(
                                "w-full py-4 rounded-2xl font-black text-center transition-all duration-300 relative overflow-hidden group/btn",
                                plan.popular
                                    ? "bg-primary text-white shadow-xl hover:shadow-primary/40 hover:scale-[1.02]"
                                    : "bg-white/5 text-white hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            <span className="relative z-10">{plan.cta}</span>
                            {plan.popular && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                            )}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
