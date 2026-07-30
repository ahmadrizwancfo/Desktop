'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, TrendingUp, LayoutDashboard, BrainCircuit, Mail, Target, Database, Shield, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery('');
      router.push(path);
    },
    [router]
  );

  const commandItems = [
    { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { label: 'AI CFO Command Center', path: '/ai-cfo', icon: BrainCircuit, category: 'Navigation' },
    { label: 'Founder Decision Lab', path: '/decision-lab', icon: TrendingUp, category: 'Navigation' },
    { label: 'Daily Brief', path: '/daily-brief', icon: Mail, category: 'Navigation' },
    { label: 'Action Center', path: '/action-center', icon: Target, category: 'Navigation' },
    { label: 'Integrations & Data', path: '/integrations', icon: Database, category: 'Navigation' },
    { label: 'Ask AI: "Can I afford to hire?"', path: '/ai-cfo?q=Can+I+afford+to+hire+2+engineers%3F', icon: Sparkles, category: 'Ask AI' },
    { label: 'Ask AI: "What should I cut this month?"', path: '/ai-cfo?q=What+should+I+cut+this+month%3F', icon: Sparkles, category: 'Ask AI' },
    { label: 'Simulate: 15% Price Increase', path: '/decision-lab', icon: TrendingUp, category: 'Simulations' },
  ];

  const filteredItems = commandItems.filter(
    (item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl bg-[#0a0f1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or ask FounderCFO... (Cmd + K)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-white placeholder-slate-500 outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No matching commands found.</div>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => navigateTo(item.path)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Press ESC to close</span>
              <span>FounderCFO Intelligence System</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
