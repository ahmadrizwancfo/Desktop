'use client';

import React from 'react';
import Link from 'next/link';

export interface NextStepOption {
    label: string;
    href: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'emerald';
}

interface NextStepRecommendationBarProps {
    title?: string;
    description?: string;
    steps: NextStepOption[];
}

export function NextStepRecommendationBar({
    title = 'Recommended Next Step',
    description = 'FounderCFO auto-guides your next financial workflow step.',
    steps,
}: NextStepRecommendationBarProps) {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {steps.map((step, idx) => {
                    const btnStyle = 
                        step.variant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                        step.variant === 'primary' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' :
                        'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700';

                    return (
                        <Link
                            key={idx}
                            href={step.href}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition shadow-md flex items-center gap-1.5 ${btnStyle}`}
                        >
                            {step.icon && <span>{step.icon}</span>}
                            <span>{step.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
