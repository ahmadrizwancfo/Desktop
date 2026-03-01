'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setAuth = useAuthStore((state) => state.setAuth);

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Store the token and fetch user info
            localStorage.setItem('auth_token', token);

            // Decode JWT to get user info (simplified)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setAuth({ id: payload.sub, email: payload.email, role: 'FOUNDER', name: '', organizationId: null } as any, token);
                router.push('/dashboard');
            } catch (e) {
                console.error('Failed to decode token:', e);
                router.push('/login?error=auth_failed');
            }
        } else {
            router.push('/login?error=no_token');
        }
    }, [searchParams, setAuth, router]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-white font-bold">Completing sign in...</p>
                <p className="text-slate-400 text-sm mt-2">Please wait while we authenticate you.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-white font-bold">Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
