'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/store/auth-store';
import {
    User,
    Building2,
    Bell,
    Shield,
    CreditCard,
    Palette,
    Globe,
    Key,
    Save,
    Camera,
    Mail,
    Phone,
    MapPin,
    CheckCircle2,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'audit', label: 'Audit Trail', icon: History, href: '/settings/audit-trail' },
];

export default function SettingsPage() {
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState('profile');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                    <p className="text-slate-400 mt-1">Manage your account and preferences.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Tabs */}
                    <div className="space-y-2">
                        {tabs.map((tab) => (
                            tab.href ? (
                                <a
                                    key={tab.id}
                                    href={tab.href}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left text-slate-400 hover:bg-white/5 hover:text-white"
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </a>
                            ) : (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                        activeTab === tab.id
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        {activeTab === 'profile' && (
                            <div className="glass-card rounded-3xl p-8 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-black text-primary">
                                            {user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 p-2 bg-primary rounded-xl text-white hover:scale-105 transition-transform">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{user?.name || 'User'}</h3>
                                        <p className="text-slate-400 text-sm">{user?.email}</p>
                                        <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase">
                                            {user?.role || 'Founder'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                                        <input
                                            type="text"
                                            defaultValue={user?.name || ''}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                                        <input
                                            type="email"
                                            defaultValue={user?.email || ''}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all">
                                            <option value="FOUNDER">Founder</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="ACCOUNTANT">Accountant</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        className={cn(
                                            "px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
                                            saved
                                                ? "bg-emerald-500 text-white"
                                                : "bg-primary text-white hover:bg-indigo-600 shadow-lg shadow-primary/20"
                                        )}
                                    >
                                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {saved ? 'Saved!' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'organization' && (
                            <div className="glass-card rounded-3xl p-8 space-y-8">
                                <h3 className="text-xl font-bold text-white">Organization Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company Name</label>
                                        <input
                                            type="text"
                                            defaultValue="Tech Startup Pvt Ltd"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GSTIN</label>
                                        <input
                                            type="text"
                                            placeholder="29AABCU9603R1ZM"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Industry</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all">
                                            <option>Technology</option>
                                            <option>E-commerce</option>
                                            <option>FinTech</option>
                                            <option>Healthcare</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Year Start</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all">
                                            <option>April</option>
                                            <option>January</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-primary/20">
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="glass-card rounded-3xl p-8 space-y-6">
                                <h3 className="text-xl font-bold text-white">Notification Preferences</h3>
                                {[
                                    { title: 'Invoice Reminders', desc: 'Get notified when invoices are due or overdue' },
                                    { title: 'Payment Receipts', desc: 'Receive notifications when payments are received' },
                                    { title: 'Compliance Alerts', desc: 'Stay updated on GST, TDS and other statutory deadlines' },
                                    { title: 'AI Insights', desc: 'Get personalized financial insights from AI CFO' },
                                    { title: 'Weekly Reports', desc: 'Receive weekly financial summary emails' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{item.title}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="glass-card rounded-3xl p-8 space-y-8">
                                <h3 className="text-xl font-bold text-white">Security Settings</h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirm Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <h4 className="font-bold text-amber-500 text-sm">Two-Factor Authentication</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account</p>
                                        </div>
                                        <button className="ml-auto px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all">
                                            Enable 2FA
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-primary/20">
                                        <Save className="w-4 h-4" />
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="glass-card rounded-3xl p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Current Plan</h3>
                                        <p className="text-slate-400 text-sm mt-1">You're on the Free plan</p>
                                    </div>
                                    <a href="/upgrade" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                        Upgrade to Pro
                                    </a>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Bank Accounts', value: '1 / 3', used: 33 },
                                        { label: 'Invoices/Month', value: '5 / 10', used: 50 },
                                        { label: 'AI Queries', value: '8 / 20', used: 40 },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                                            <p className="text-lg font-bold text-white mt-1">{item.value}</p>
                                            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${item.used}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
