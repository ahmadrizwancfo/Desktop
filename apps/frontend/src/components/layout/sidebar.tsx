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

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
    premium?: boolean;
    promo?: boolean;
}

const navItems: NavItem[] = [
    { name: 'Today & Agenda', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI CFO Co-Pilot', href: '/ai-cfo', icon: BrainCircuit, premium: true },
    { name: 'Cashflow OS', href: '/cashflow-operating-system', icon: TrendingUp, premium: true },
    { name: 'Integrations & Data', href: '/integrations', icon: Database },
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
                                "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 relative overflow-hidden",
                                isActive
                                    ? "bg-white/10 text-white font-semibold border border-white/10 shadow-sm"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            {/* Active Glow Indicator */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill"
                                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-full" 
                                />
                            )}
                            
                            <div className="flex items-center gap-3 relative z-10">
                                <item.icon className={cn(
                                    "w-4 h-4 transition-colors duration-150",
                                    isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                <span className={cn(
                                    "text-xs tracking-tight",
                                    isActive ? "font-bold text-white" : "font-medium"
                                )}>{item.name}</span>
                            </div>

                            {item.premium && (
                                <span className={cn(
                                    "text-[9px] font-black px-1.5 py-0.5 rounded border tracking-tighter uppercase font-mono",
                                    isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-slate-500 border-white/5"
                                )}>
                                    AI
                                </span>
                            )}
                        </Link>
                    );
                })}

                <button
                    onClick={handleForceSync}
                    disabled={syncing}
                    className="w-full group mt-6 flex items-center justify-between px-4 py-3 rounded-xl bg-[#18181B] border border-white/[0.06] text-emerald-400 hover:bg-[#202124] transition-all font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
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
