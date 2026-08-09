'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { appBootstrapService } from '@/lib/app-bootstrap.service';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/auth/login', { email, password });
            const { user, access_token } = response.data;
            localStorage.setItem('auth_token', access_token);
            setAuth(user, access_token);

            // Execute Unified App Boot Handshake to route cleanly
            const boot = await appBootstrapService.bootstrap();
            if (boot.state === 'READY' && boot.context?.hasProfile) {
                router.push('/dashboard');
            } else {
                router.push('/onboarding');
            }
        } catch (err: any) {
            const message = err.response?.data?.message;
            if (err.code === 'ERR_NETWORK') {
                setError('Unable to connect to server. Please try again later.');
            } else if (message === 'Invalid credentials') {
                setError('Invalid email or password. Please check your credentials.');
            } else {
                setError(message || 'Failed to login. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-6">
                        <Logo size="lg" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400 mt-2 text-sm font-medium">Sign in to your continuous financial operating system.</p>
                </div>

                <div className="p-8 rounded-3xl bg-[#18181B] border border-white/[0.06] shadow-none">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl py-3.5 pl-11 pr-4 text-base sm:text-sm text-white outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!email) {
                                            setError('Please enter your email address above to reset password.');
                                            return;
                                        }
                                        setIsLoading(true);
                                        try {
                                            const res = await apiClient.post('/auth/forgot-password', { email });
                                            setError('');
                                            alert(res.data?.message || 'Password reset link sent to your email.');
                                        } catch (err: any) {
                                            setError(err.response?.data?.message || 'Failed to send reset link.');
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-2xl py-3.5 pl-11 pr-4 text-base sm:text-sm text-white outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-slate-500 text-sm">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-primary font-bold hover:underline">Create Account</Link>
                </p>
            </motion.div>
        </div>
    );
}
