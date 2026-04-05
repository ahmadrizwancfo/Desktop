'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Cpu, BarChart3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: Link2,
    title: "Connect",
    description: "Connect your bank, payments, and accounting tools in seconds.",
    color: "emerald",
    highlight: "Instant Sync"
  },
  {
    icon: Cpu,
    title: "Understand",
    description: "AI analyzes your finances, detects patterns, and tracks what’s changing.",
    color: "indigo",
    highlight: "Pure Signal"
  },
  {
    icon: BarChart3,
    title: "Decide",
    description: "Get clear, actionable decisions — what to do, when to act, and how to grow.",
    color: "violet",
    highlight: "Direct Outcomes"
  }
];

export function HowItWorks() {
  return (
    <section id="demo" className="relative py-20 overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10 w-full">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-md"
          >
            <Zap className="w-3.5 h-3.5 fill-primary" />
            Decision Pipeline
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 editorial tracking-tight leading-[1.1]"
          >
            From Data to Decisions <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-emerald-400">
              — Automatically
            </span>
          </motion.h2>
          <motion.p
            className="text-slate-400/80 max-w-2xl mx-auto text-lg leading-relaxed font-light"
          >
            Stop managing features and start making moves. <br className="hidden md:block" />
            Our AI turns your financial chaos into a roadmap for growth.
          </motion.p>
        </div>

        <div className="relative">
          {/* System Pipeline Line (Desktop) */}
          <div className="hidden lg:block absolute top-[110px] left-[10%] right-[10%] h-[1px] bg-white/5 z-0">
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/40 via-indigo-500/40 to-violet-500/40 origin-left"
            />
            {/* Active Data Pulse */}
            <motion.div 
              animate={{ x: ['-20%', '120%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 w-32 h-[3px] -translate-y-[1px] bg-gradient-to-r from-transparent via-primary to-transparent blur-[2px]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.8 }}
                className="group p-8 rounded-[2rem] glass-premium border border-white/5 hover:border-white/20 hover:-translate-y-2 transition-all duration-500 relative flex flex-col items-center text-center overflow-hidden"
              >
                {/* Node Glow */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />

                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mb-8 relative z-10 transition-all duration-500 group-hover:scale-110",
                  step.color === 'emerald' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  step.color === 'indigo' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                  step.color === 'violet' && "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                )}>
                  <step.icon className="w-9 h-9 relative z-10 group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 group-hover:text-white transition-colors">
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    step.color === 'emerald' && "bg-emerald-500",
                    step.color === 'indigo' && "bg-indigo-500",
                    step.color === 'violet' && "bg-violet-500"
                  )} />
                  {step.highlight}
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 editorial tracking-tight">{step.title}</h3>
                <p className="text-slate-400/90 leading-relaxed font-light text-base group-hover:text-white/80 transition-colors">
                  {step.description}
                </p>

                {/* Node Number */}
                <div className="absolute top-4 right-6 text-white/[0.03] font-black text-6xl italic group-hover:text-white/5 transition-colors pointer-events-none">
                  {idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <div className="text-[11px] font-medium text-slate-500 lowercase tracking-[0.4em] italic opacity-70">
            No setup. No spreadsheets. <span className="text-white not-italic font-bold">Just decisions.</span>
          </div>
        </div>

        {/* Bottom Trail Connector */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30 opacity-40">
          <div className="w-[1px] h-10 bg-gradient-to-b from-primary/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
