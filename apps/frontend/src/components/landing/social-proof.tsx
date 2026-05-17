'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function SocialProof() {
    const logos = [
        "SEQUOIA", "Y-COMBINATOR", "ANDREESSEN HOROWITZ", "ACCEL", "LIGHTSPEED",
        "INDEX VENTURES", "benchmark", "GREYLOCK"
    ];

    return (
        <section className="py-20 border-y border-white/5 bg-slate-400/[0.02] overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                    Trusted by high-growth startups backed by
                </p>
            </div>

            {/* Infinite Marquee */}
            <div className="flex relative overflow-hidden">
                <motion.div
                    className="flex gap-16 items-center whitespace-nowrap"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 30,
                        ease: "linear"
                    }}
                >
                    {/* Repeat logos multiple times to ensure seamless loop */}
                    {[...logos, ...logos, ...logos].map((logo, i) => (
                        <span key={i} className="text-2xl md:text-3xl font-bold text-white/20 select-none cursor-default hover:text-white/40 transition-colors">
                            {logo}
                        </span>
                    ))}
                </motion.div>
                {/* Fade Edges */}
                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0f172a] to-transparent z-10" />
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0f172a] to-transparent z-10" />
            </div>

            {/* Stats Grid */}
            <div className="max-w-6xl mx-auto px-6 mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                    { label: "Transactions Processed", value: "₹50Cr+" },
                    { label: "Active Founders", value: "500+" },
                    { label: "Hours Saved", value: "10k+" },
                    { label: "Compliance Score", value: "100%" }
                ].map((stat, i) => (
                    <div key={i} className="text-center">
                        <div className="text-3xl md:text-4xl font-black text-white mb-2">{stat.value}</div>
                        <div className="text-sm text-slate-500">{stat.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}
