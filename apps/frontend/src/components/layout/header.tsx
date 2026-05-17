'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Keyboard, ChevronDown, Users, Briefcase, Building2, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRoleViewStore, roleConfig, UserRole } from '@/store/role-view-store';
import { cn, timeAgo, isStale } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial-service';

export function Header() {
    const user = useAuthStore((state) => state.user);
    const { currentRole, setRole } = useRoleViewStore();
    const [showRoleMenu, setShowRoleMenu] = useState(false);

    const { data: stats } = useQuery({
        queryKey: ['financial-stats', user?.organizationId],
        queryFn: () => financialService.getStats(user?.organizationId || ''),
        enabled: !!user?.organizationId,
    });

    const lastUpdatedAt = stats?.lastUpdatedAt;
    const stale = isStale(lastUpdatedAt);

    const roles: { id: UserRole; icon: any }[] = [
        { id: 'founder', icon: Users },
        { id: 'finance', icon: Briefcase },
        { id: 'investor', icon: Building2 },
    ];

    const currentRoleConfig = roleConfig[currentRole];

    return (
        <header className="h-20 border-b border-white/5 bg-background/30 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between group/header transition-all duration-500 hover:bg-background/40">
            {/* Subtle Header Bottom Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700" />
            <div className="flex items-center gap-6 w-[450px]">
                <div className="relative w-full group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/search:text-primary transition-colors duration-300" />
                    <input
                        type="text"
                        placeholder="Search Intelligence Command..."
                        className="w-full bg-white/[0.03] border border-white/5 focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/20 focus:border-primary/20 rounded-2xl py-2.5 pl-12 pr-4 text-[13px] transition-all duration-300 outline-none text-white placeholder:text-slate-600 shadow-inner"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10 opacity-40 group-focus-within/search:opacity-100 transition-opacity">
                        <Keyboard className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] text-slate-400 font-black tracking-widest">⌘ K</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Data Freshness Indicator */}
                {lastUpdatedAt && (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all",
                        stale 
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 group relative cursor-help" 
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    )}>
                        {stale ? <AlertTriangle className="w-3 h-3 animate-pulse" /> : <Clock className="w-3 h-3" />}
                        <span className="font-black">Command Sync: {timeAgo(lastUpdatedAt)}</span>
                        
                        {stale && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-medium text-slate-300">
                                Warning: Data is more than 24h old. Please sync account.
                            </div>
                        )}
                    </div>
                )}

                {/* Role Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowRoleMenu(!showRoleMenu)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                            currentRoleConfig.bg,
                            "border-white/10 hover:border-white/20"
                        )}
                    >
                        <span className={cn("text-xs font-bold uppercase tracking-wider", currentRoleConfig.color)}>
                            {currentRoleConfig.label}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform", currentRoleConfig.color, showRoleMenu && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {showRoleMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowRoleMenu(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full right-0 mt-2 w-64 glass-card rounded-2xl border border-white/10 overflow-hidden z-50"
                                >
                                    <div className="p-3 border-b border-white/5">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Switch View</p>
                                    </div>
                                    <div className="p-2">
                                        {roles.map((role) => {
                                            const config = roleConfig[role.id];
                                            const isActive = currentRole === role.id;
                                            return (
                                                <button
                                                    key={role.id}
                                                    onClick={() => {
                                                        setRole(role.id);
                                                        setShowRoleMenu(false);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                                                        isActive ? config.bg : "hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className={cn("p-2 rounded-lg", config.bg)}>
                                                        <role.icon className={cn("w-4 h-4", config.color)} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={cn("text-sm font-bold", isActive ? config.color : "text-white")}>{config.label}</p>
                                                        <p className="text-[10px] text-slate-500">{config.description}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <p className="text-xs font-semibold text-white">{user?.name || 'Founder'}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{user?.role || 'Admin'}</p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-indigo-400 p-0.5 shadow-lg shadow-primary/20">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                            <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'F'}</span>
                        </div>
                    </button>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <Link href="/notifications" className="relative w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10">
                    <Bell className="w-5 h-5 text-slate-300" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />
                </Link>
            </div>
        </header>
    );
}

