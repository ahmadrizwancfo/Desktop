'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, PieChart, Users, Settings, Search, Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

export function DashboardPreview() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center mb-16 px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-black text-white mb-6 editorial tracking-tight"
        >
          See your business the way a CFO does
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed font-light"
        >
          Real-time runway, burn, and financial insights — powered by your actual data.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 5 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative mx-auto max-w-6xl w-full"
        style={{ perspective: '2000px' }}
      >
        <div className="text-center mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 backdrop-blur-md">
            Live AI-generated insight based on your data
          </span>
        </div>
        <div className="relative rounded-3xl overflow-hidden glass-premium shadow-[0_0_150px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10 text-left group/preview bg-[#060b1e]/90">
          {/* Inner Border Glow */}
          <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none z-10" />
          
          {/* Dashboard UI Structure */}
          <div className="flex h-[600px] relative backdrop-blur-2xl">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/5 bg-slate-900/40 p-4 hidden md:flex flex-col gap-1 z-10">
              <div className="flex items-center gap-2 px-2 mb-8">
                <Logo size="sm" />
              </div>
              {[ 
                { icon: BarChart3, label: "Overview", active: true },
                { icon: PieChart, label: "Cash Flow" },
                { icon: Users, label: "Payroll" },
                { icon: TrendingUp, label: "Forecasts" },
                { icon: Settings, label: "Settings" }
              ].map((item, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-default",
                  item.active ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent_50%)]">
              {/* Header */}
              <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0f172a]/40 backdrop-blur-md">
                <div className="text-sm font-medium text-slate-400">Dashboard / Overview</div>
                <div className="flex items-center gap-4">
                  <Search className="w-4 h-4 text-slate-500" />
                  <Bell className="w-4 h-4 text-slate-500" />
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10">NS</div>
                </div>
              </div>

              {/* Dashboard Body */}
              <div className="p-8 overflow-hidden relative flex flex-col gap-6">
                {/* CFO Summary Card */}
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-md relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white editorial tracking-tight shadow-sm">FounderCFO Summary</h2>
                        <span className="text-xs font-bold bg-white/5 text-slate-400 px-2 py-1 rounded ring-1 ring-white/10">March 2026</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Watch
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                      <div className="col-span-8 pr-4">
                        <div className="text-2xl font-light text-slate-300 leading-relaxed">
                          You are likely to run out of cash in <span className="text-white font-bold tracking-tight">7.2 months</span> if marketing spend continues to rise by 18% MoM.
                        </div>
                        <div className="mt-5 flex gap-3">
                          <div className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-primary to-primary/80 text-white text-sm font-bold shadow-[0_4px_15px_-3px_rgba(124,58,237,0.4)] ring-1 ring-white/20">Analyze Spend</div>
                        </div>
                      </div>
                      <div className="col-span-4 grid grid-cols-1 gap-3">
                        <div className="p-4 bg-[#020617]/40 rounded-xl border border-white/5 flex justify-between items-center shadow-inner">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Runway</span>
                          <span className="text-xl font-bold text-white tracking-tighter">7.2 Mo</span>
                        </div>
                        <div className="p-4 bg-[#020617]/40 rounded-xl border border-white/5 flex justify-between items-center shadow-inner">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Funding</span>
                          <span className="text-xs font-bold text-amber-400">Start in 60 days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Narrative Feed & Chart Grid */}
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="space-y-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Recent Insights</div>
                    <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-white/5 flex gap-4 items-start backdrop-blur-sm shadow-xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex justify-between w-full mb-1">
                          <div className="text-sm font-bold text-white tracking-tight">Revenue Projection</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">On Track</div>
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed pt-1">
                          Based on current pipeline, you are projected to hit ₹12Cr ARR by Q3 2026.
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-white/5 flex gap-4 items-start backdrop-blur-sm opacity-70">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex justify-between w-full mb-1">
                          <div className="text-sm font-bold text-white tracking-tight">Payroll Update</div>
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed pt-1">
                          Payroll for March has been processed successfully.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="rounded-xl border border-white/5 bg-[#0f172a]/40 p-4 relative overflow-hidden flex flex-col justify-end backdrop-blur-sm shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-40 z-0" />
                    <div className="flex items-end justify-between h-32 gap-3 mt-8 px-2 relative z-10">
                      {[35, 45, 40, 60, 50, 75, 65, 90].map((h, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ delay: 0.6 + (i * 0.1), duration: 1, ease: "easeOut" }}
                          className="w-full bg-gradient-to-t from-primary/20 to-primary/40 rounded-[2px] border-t border-primary/50 shadow-[0_0_10px_rgba(124,58,237,0.2)]" 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top glass reflection over entire dashboard */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none z-20 mix-blend-overlay" />
        </div>

        {/* Ambient Glow behind dashboard */}
        <div className="absolute -bottom-32 left-10 right-10 h-64 bg-primary/20 blur-[180px] rounded-[100%] opacity-40 pointer-events-none -z-10" />
      </motion.div>
    </section>
  );
}
