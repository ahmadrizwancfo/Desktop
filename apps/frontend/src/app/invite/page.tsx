'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Copy, Check, Send, Sparkles, 
    Gift, ArrowRight, Star, Share2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

export default function InvitePage() {
    const user = useAuthStore((state) => state.user);
    const [email, setEmail] = useState('');
    const [orgName, setOrgName] = useState(user?.organizationId ? 'My Startup' : '');
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);

    const referralLink = `https://foundercfo.com/join?ref=${user?.organizationId || 'early-founder'}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success('Referral link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy referral link.');
        }
    };

    const handleSendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setSending(true);
        setTimeout(() => {
            setSending(false);
            setEmail('');
            toast.success(`Beta invitation successfully dispatched to ${email}!`);
        }, 1200);
    };

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto pb-24 relative p-4 md:p-8 pt-12">
                {/* Background ambient glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none -z-10">
                    <div className="absolute top-10 left-1/4 w-[300px] h-[300px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute top-20 right-1/4 w-[250px] h-[250px] bg-purple-500/10 blur-[100px] rounded-full" />
                </div>

                {/* Header Section */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest mb-4">
                        <Gift className="w-3.5 h-3.5 fill-current" />
                        Exclusive Beta Reward
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
                        Grow the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary">FounderCFO Circle</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
                        Invite fellow founders to take control of their cash runway and intelligence dashboard.
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Invite Form & Referral Link (8 Cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Limited promo banner */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/25 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none" />
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-xl">
                                    <Star className="w-6 h-6 text-primary fill-current" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Beta Access is Highly Limited</h4>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        First 50 founders to invite 3 partners get <strong className="text-primary font-black">3 months of Pro Tier completely free</strong>. Act fast!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Invite Form */}
                        <div className="glass-card rounded-[2rem] p-6 md:p-8">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Send Beta Invitation
                            </h3>

                            <form onSubmit={handleSendInvite} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Founder Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="founder@partnerstartup.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Startup / Org Name</label>
                                        <input
                                            type="text"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            placeholder="e.g., Acme Corp"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending || !email}
                                    className="w-full py-4 rounded-xl bg-white text-[#020617] font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
                                >
                                    {sending ? (
                                        <>Dispatched...</>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5 fill-current" />
                                            Dispatch Beta Invitation
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Referral Link Copy */}
                        <div className="glass-card rounded-[2rem] p-6 md:p-8">
                            <h3 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-primary" />
                                Your Personal Referral Link
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">
                                Share this link on LinkedIn, Twitter, or founder communities to claim your free Pro credits.
                            </p>

                            <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 items-center">
                                <input
                                    type="text"
                                    readOnly
                                    value={referralLink}
                                    className="flex-1 bg-transparent border-none text-xs text-slate-300 px-3 outline-none font-mono"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Referral Stats & Waitlist Leaderboard (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* User Waitlist Stats */}
                        <div className="p-6 rounded-3xl bg-[#0a0f1e]/80 border border-white/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
                            
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Your Invitation Standings</h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400">Total Partners Invited</span>
                                    <span className="text-sm font-black text-white">0</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400">Active Activations</span>
                                    <span className="text-sm font-black text-white">0</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400">Waitlist Ranking</span>
                                    <span className="text-sm font-black text-primary">#142</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-xs font-bold text-slate-400">Free Pro Tier Earned</span>
                                    <span className="text-xs font-black text-slate-500 uppercase">None yet</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                Invite Tips
                            </h4>
                            <ul className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-primary font-bold">1.</span>
                                    <span>Target active SaaS or ecommerce startup founders spending ₹2L+/month.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary font-bold">2.</span>
                                    <span>Share screenshots of the Runway simulator to show instant value.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
