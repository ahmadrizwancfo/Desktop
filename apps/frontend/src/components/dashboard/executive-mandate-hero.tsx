'use client';

import React from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReassuranceHeaderProps {
  isDemo?: boolean;
  runwayMonths?: number;
}

export function ExecutiveReassuranceHeader({
  isDemo = false,
  runwayMonths = 18.5,
}: ReassuranceHeaderProps) {
  const isSafe = runwayMonths >= 12;
  const evidenceTag = isDemo ? 'Level 1 — Estimated Baseline Model' : 'Level 2 — Verified Evidence Ingested';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 rounded-[2rem] bg-[#0c1322] border border-white/[0.08] shadow-2xl relative overflow-hidden text-left"
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Provenance Tag */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          EXECUTIVE SUMMARY
        </span>
        <span className="text-xs text-slate-500 font-mono">
          {evidenceTag}
        </span>
      </div>

      {/* Main Reassurance Headline */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">
          {isSafe ? "You're safe for now." : "Attention required today."}
        </h1>
        <p className="text-lg md:text-xl font-bold text-slate-300">
          <span className="text-emerald-400">{runwayMonths.toFixed(1)} months</span> of runway with current burn.
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {isSafe ? "Your cash position gives you room to execute." : "Preserve cash buffer to extend runway window."}
        </p>
      </div>
    </motion.div>
  );
}

interface ExecutiveDecisionCardProps {
  oneThingAction?: string;
  followConsequence?: string;
  onExecute?: () => void;
}

export function ExecutiveDecisionCard({
  oneThingAction = 'Preserve cash: Delay hiring 2 senior engineers until Q3 AR collections hit 80%.',
  followConsequence = '+4.9 months',
  onExecute,
}: ExecutiveDecisionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-[2rem] bg-gradient-to-r from-emerald-950/30 via-[#0c1322] to-[#0c1322] border border-emerald-500/30 shadow-2xl space-y-4 text-left"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Star className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Today&apos;s Single CFO Action</span>
            <p className="text-sm font-bold text-white leading-relaxed">{oneThingAction}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right shrink-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Impact on Runway</span>
          <span className="text-sm font-black text-emerald-400 font-mono">{followConsequence}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={onExecute}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve &amp; Execute
        </button>
        <Link
          href="/decision-lab"
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Simulate Alternatives
        </Link>
      </div>
    </motion.div>
  );
}

// Backward Compatibility Wrapper
export function ExecutiveMandateHero(props: any) {
  return (
    <div className="space-y-6">
      <ExecutiveReassuranceHeader isDemo={props.isDemo} runwayMonths={props.runwayMonths} />
      <ExecutiveDecisionCard 
        oneThingAction={props.oneThingAction} 
        followConsequence={props.followConsequence} 
        onExecute={props.onExecute} 
      />
    </div>
  );
}
