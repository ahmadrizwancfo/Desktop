'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Zap, TrendingUp, CheckCircle2, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExecutiveMandateHeroProps {
  healthScore?: number;
  cashBalance?: number;
  runwayMonths?: number;
  primaryRisk?: string;
  oneThingAction?: string;
  followConsequence?: string;
  ignoreConsequence?: string;
  onExecute?: () => void;
}

export function ExecutiveMandateHero({
  healthScore = 57,
  cashBalance = 25920230,
  runwayMonths = 23.3,
  primaryRisk = 'Uncollected Accounts Receivable (DSO 263D) violating Law: Revenue Is Not Cash.',
  oneThingAction = 'Preserve runway: Delay hiring 2 senior engineers until Q3 receivables collection reaches 80%.',
  followConsequence = '+4.9 months runway buffer retained (Zero Cash Date pushed to late 2027).',
  ignoreConsequence = '-4.9 months runway accelerated (-21% liquidity margin).',
  onExecute,
}: ExecutiveMandateHeroProps) {
  const [activeTab, setActiveTab] = useState<'FOLLOW' | 'IGNORE'>('FOLLOW');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-3xl bg-gradient-to-br from-[#0c1329] via-[#0a0f1e] to-[#040814] border border-emerald-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Banner: Single CFO Reassurance Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
            {runwayMonths >= 12 ? `You're safe today. ${runwayMonths.toFixed(1)} months of runway.` : `Attention required today. Runway buffer at ${runwayMonths.toFixed(1)} months.`}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>No immediate liquidity crisis</span>
        </div>
      </div>

      {/* Question 3 & 4 Grid: The Single Most Important Action & What Happens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Risk & Single Action */}
        <div className="lg:col-span-7 space-y-6">
          {/* Biggest Risk */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">
                Primary Risk Flagged
              </span>
              <p className="text-xs text-rose-200 font-semibold leading-relaxed">{primaryRisk}</p>
            </div>
          </div>

          {/* Single Most Important Action */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              Today&apos;s Single CFO Action
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
              {oneThingAction}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExecute}
              className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Action
            </button>
            <Link
              href="/decision-lab"
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              See why
            </Link>
          </div>
        </div>

        {/* Right Column: Question 4 (What Happens If You Follow or Ignore) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Question 4: Consequence Preview
            </span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('FOLLOW')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'FOLLOW' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                If You Follow
              </button>
              <button
                onClick={() => setActiveTab('IGNORE')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'IGNORE' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                If You Ignore
              </button>
            </div>
          </div>

          {activeTab === 'FOLLOW' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Positive Runway Impact</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{followConsequence}</p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
                +4.9 Months Buffer retained • Zero Cash Date: Dec 2027
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Accelerated Burn Risk</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{ignoreConsequence}</p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-mono">
                -4.9 Months Runway reduction • Zero Cash Date pulled to Jul 2027
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
