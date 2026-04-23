'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
    Check,
    Zap,
    Crown,
    Rocket,
    Building2,
    Users,
    BarChart3,
    Shield,
    Brain,
    FileText,
    CreditCard,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const plans = [
    {
        name: 'Starter',
        price: 0,
        period: 'forever',
        description: 'Perfect for early-stage startups',
        icon: Zap,
        color: 'from-slate-500 to-slate-600',
        features: [
            '3 Bank Accounts',
            '10 Invoices/month',
            '20 AI Queries/month',
            'Basic Compliance Alerts',
            'Email Support',
        ],
        cta: 'Current Plan',
        disabled: true,
    },
    {
        name: 'Pro',
        price: 2999,
        period: '/month',
        description: 'For growing startups & SMEs',
        icon: Crown,
        color: 'from-primary to-indigo-500',
        popular: true,
        features: [
            'Unlimited Bank Accounts',
            'Unlimited Invoices',
            '500 AI Queries/month',
            'Advanced GST/TDS Automation',
            'Multi-user Access (5 seats)',
            'Priority Support',
            'Custom Reports',
        ],
        cta: 'Upgrade Now',
    },
    {
        name: 'Enterprise',
        price: 9999,
        period: '/month',
        description: 'For scaling businesses',
        icon: Rocket,
        color: 'from-emerald-500 to-teal-500',
        features: [
            'Everything in Pro',
            'Unlimited AI Queries',
            'Unlimited Users',
            'Dedicated Account Manager',
            'Custom Integrations',
            'SLA Guarantee',
            'On-call CFO Support',
            'White-label Options',
        ],
        cta: 'Contact Sales',
    },
];

export default function UpgradePage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-12 max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles className="w-4 h-4" />
                        Upgrade Your Financial Intelligence
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Choose Your Plan
                    </h1>
                    <p className="text-slate-400 mt-3 max-w-lg mx-auto">
                        Unlock the full power of AI-driven financial management. Scale your startup with confidence.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={cn("text-sm font-medium", billingCycle === 'monthly' ? 'text-white' : 'text-slate-500')}>Monthly</span>
                        <button
                            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                            className="w-14 h-7 bg-white/10 rounded-full relative transition-all"
                        >
                            <div className={cn(
                                "w-5 h-5 bg-primary rounded-full absolute top-1 transition-all",
                                billingCycle === 'yearly' ? 'left-8' : 'left-1'
                            )} />
                        </button>
                        <span className={cn("text-sm font-medium", billingCycle === 'yearly' ? 'text-white' : 'text-slate-500')}>
                            Yearly <span className="text-emerald-500 text-xs font-bold">Save 20%</span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={cn(
                                "glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col",
                                plan.popular && "border-primary/50 ring-2 ring-primary/20"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                    Most Popular
                                </div>
                            )}

                            <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6", plan.color)}>
                                <plan.icon className="w-7 h-7 text-white" />
                            </div>

                            <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                            <p className="text-slate-400 text-sm mt-1">{plan.description}</p>

                            <div className="flex items-end gap-1 mt-6">
                                <span className="text-4xl font-black text-white">
                                    {plan.price === 0 ? 'Free' : `₹${billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price}`}
                                </span>
                                {plan.price > 0 && (
                                    <span className="text-slate-500 text-sm mb-1">{plan.period}</span>
                                )}
                            </div>

                            <ul className="mt-8 space-y-3 flex-1">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-slate-300">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={plan.disabled}
                                className={cn(
                                    "mt-8 w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                                    plan.disabled
                                        ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                        : plan.popular
                                            ? "bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/30 hover:opacity-90"
                                            : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                                )}
                            >
                                {plan.cta}
                                {!plan.disabled && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Feature Comparison */}
                <div className="glass-card rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Compare All Features</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-white/10">
                                    <th className="pb-4 text-slate-400 text-sm font-medium">Feature</th>
                                    <th className="pb-4 text-slate-400 text-sm font-medium text-center">Starter</th>
                                    <th className="pb-4 text-primary text-sm font-bold text-center">Pro</th>
                                    <th className="pb-4 text-slate-400 text-sm font-medium text-center">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {[
                                    ['Bank Account Connections', '3', 'Unlimited', 'Unlimited'],
                                    ['Monthly Invoices', '10', 'Unlimited', 'Unlimited'],
                                    ['AI CFO Queries', '20/mo', '500/mo', 'Unlimited'],
                                    ['Team Members', '1', '5', 'Unlimited'],
                                    ['GST Automation', '❌', '✅', '✅'],
                                    ['TDS Compliance', '❌', '✅', '✅'],
                                    ['Custom Reports', '❌', '✅', '✅'],
                                    ['API Access', '❌', '❌', '✅'],
                                    ['Dedicated Support', '❌', '❌', '✅'],
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="py-4 text-white font-medium">{row[0]}</td>
                                        <td className="py-4 text-slate-400 text-center">{row[1]}</td>
                                        <td className="py-4 text-white font-medium text-center">{row[2]}</td>
                                        <td className="py-4 text-slate-400 text-center">{row[3]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ */}
                <div className="text-center pb-12">
                    <p className="text-slate-400">
                        Questions? <a href="mailto:support@foundercfo.com" className="text-primary font-bold hover:underline">Contact our sales team</a>
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
