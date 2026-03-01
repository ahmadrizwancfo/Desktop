'use client';

import React from 'react';
import Link from 'next/link';
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
    Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Simulator', href: '/simulator', icon: TrendingUp, premium: true },
    { name: 'Investor Readiness', href: '/investor-readiness', icon: Target, premium: true },
    { name: 'Unit Economics', href: '/unit-economics', icon: Calculator, premium: true },
    { name: 'Accounts', href: '/accounts', icon: Wallet },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Customers & Vendors', href: '/customers-vendors', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'AI CFO', href: '/ai-cfo', icon: BrainCircuit, premium: true },
    { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
];

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="w-64 h-screen fixed left-0 top-0 glass-sidebar flex flex-col p-4 z-50">
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <TrendingUp className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white">FounderCFO</h1>
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Autopilot</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            {item.premium && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                            {isActive && (
                                <ChevronRight className="w-4 h-4 text-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-1 border-t border-white/5 pt-4">
                <Link
                    href="/upgrade"
                    className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all mb-2"
                >
                    <span>⚡</span>
                    Upgrade to Pro
                </Link>
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Settings</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all font-bold"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>

        </div>
    );
}
