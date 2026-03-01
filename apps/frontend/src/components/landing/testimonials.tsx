'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Testimonials() {
    const testimonials = [
        {
            name: "Arjun Dev",
            role: "Founder, FintechAI",
            quote: "FounderCFO replaced our external CA firm and saved us ₹4 Lakhs/year. The AI insights specifically helped us extend our runway by 3 months.",
            image: "S"
        },
        {
            name: "Sneha Reddy",
            role: "CEO, GrowthWave",
            quote: "I used to spend every Sunday reconciling invoices. Now I check FounderCFO for 5 minutes a week and I'm done. It's magic.",
            image: "S"
        },
        {
            name: "Rahul Kumar",
            role: "Co-founder, TechSprout",
            quote: "The automatic GST reconciliation is a lifesaver. It found ₹50k in unclaimed input tax credit we would have missed completely.",
            image: "R"
        }
    ];

    return (
        <section className="py-24 px-6 border-t border-white/5">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-4">Loved by Indian Founders</h2>
                <p className="text-slate-400">Join 500+ startups scaling with financial clarity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {testimonials.map((t, i) => (
                    <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                        <div className="flex gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map((_, star) => (
                                <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                        <p className="text-slate-300 leading-relaxed mb-6">"{t.quote}"</p>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                                {t.name[0]}
                            </div>
                            <div>
                                <div className="font-bold text-white">{t.name}</div>
                                <div className="text-xs text-slate-500">{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
