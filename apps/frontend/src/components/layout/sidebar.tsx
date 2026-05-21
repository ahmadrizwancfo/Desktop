'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Bell,
    Search,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
    BrainCircuit,
    Target,
    Calculator,
    Mail,
    Database,
    Zap,
    History,
    PenLine
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI CFO', href: '/ai-cfo', icon: BrainCircuit, premium: true },
    { name: 'History', href: '/history', icon: History },
    { name: 'Weekly Brief', href: '/weekly-brief', icon: Mail, premium: true },
    { name: 'Scenario Simulator', href: '/simulator', icon: TrendingUp, premium: true },
    { name: 'Investor Readiness', href: '/investor-readiness', icon: Target, premium: true },
    { name: 'Unit Economics', href: '/unit-economics', icon: Calculator, premium: true },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Customers & Vendors', href: '/customers-vendors', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
    { name: 'Integrations', href: '/integrations', icon: Database },
    { name: 'Invite Founders', href: '/invite', icon: Users, promo: true },
];

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function Sidebar({ className, onItemClick }: { className?: string; onItemClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useAuthStore((state) => state.logout);
    const queryClient = useQueryClient();
    const [syncing, setSyncing] = React.useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleForceSync = async () => {
        setSyncing(true);
        try {
            await apiClient.post('/cfo-engine/sync/force');
            await queryClient.invalidateQueries({ queryKey: ['cfo-state'] });
            toast.success('Intelligence Re-Synchronized');
        } catch (e) {
            toast.error('Sync failed. Check API link.');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className={cn("w-64 h-full glass-premium border-r border-white/5 flex flex-col pt-6 px-6 pb-10 z-50 flex-shrink-0", className)}>
            {/* Logo Section */}
            <Link href="/dashboard" onClick={onItemClick} className="flex items-center gap-4 mb-12 group">
                <div>
                    <Logo size="md" />
                    <p className="text-[9px] text-primary/80 font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                        Intelligence
                    </p>
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "group flex items-center justify-between px-4 py-3 rounded-[1.25rem] transition-all duration-300 relative overflow-hidden",
                                isActive
                                    ? "bg-white/[0.03] text-white shadow-inner border border-white/5"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]"
                            )}
                        >
                            {/* Active Glow Accent */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full shadow-[0_0_100px_rgba(99,102,241,0.5)]" 
                                />
                            )}
                            
                            <div className="flex items-center gap-3 relative z-10">
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                                    isActive ? "text-primary shadow-primary/20" : "text-slate-600 group-hover:text-slate-400"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold tracking-tight",
                                    isActive ? "font-bold" : "font-medium"
                                )}>{item.name}</span>
                            </div>

                            {item.premium && (
                                <span className={cn(
                                    "text-[8px] font-black px-1.5 py-0.5 rounded-md border tracking-tighter",
                                    isActive ? "bg-primary/20 text-primary border-primary/20" : "bg-white/5 text-slate-600 border-white/5"
                                )}>
                                    AI
                                </span>
                            )}

                            {item.promo && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 tracking-tighter">
                                    FREE
                                </span>
                            )}
                        </Link>
                    );
                })}

                <button
                    onClick={handleForceSync}
                    disabled={syncing}
                    className="w-full group mt-6 flex items-center justify-between px-4 py-3 rounded-[1.25rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                    <div className="flex items-center gap-3">
                        <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                        <span>{syncing ? 'Synchronizing...' : 'Force Intelligence Sync'}</span>
                    </div>
                </button>
            </nav>

            {/* Footer Actions */}
            <div className="mt-8 space-y-2 pt-6 border-t border-white/5">
                <Link
                    href="/upgrade"
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white text-[#020617] font-black text-xs shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all mb-4 uppercase tracking-[0.1em]"
                >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    Go Beyond Pro
                </Link>
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:text-white transition-all group/settings"
                >
                    <Settings className="w-4 h-4 group-hover/settings:rotate-90 transition-transform duration-500" />
                    <span className="text-sm font-medium">Global Settings</span>
                </Link>
                <button
                    onClick={handleLogout}
                    suppressHydrationWarning
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-bold group/logout"
                >
                    <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Terminate Session</span>
                </button>
            </div>

        </div>
    );
}
