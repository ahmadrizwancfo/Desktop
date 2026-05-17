'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [hydrated, setHydrated] = useState(false);

    // Wait for Zustand persist to hydrate from localStorage
    useEffect(() => {
        // Zustand persist v5 finishes hydration synchronously after first render
        // We use a microtask to ensure hydration is complete
        const unsub = useAuthStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });
        // If already hydrated (e.g., client-side navigation)
        if (useAuthStore.persist.hasHydrated()) {
            setHydrated(true);
        }
        return () => { unsub(); };
    }, []);

    useEffect(() => {
        if (!hydrated) return; // Don't redirect until store is hydrated

        const publicPaths = ['/', '/login', '/register'];
        const path = pathname.split('?')[0];

        if (!isAuthenticated && !publicPaths.includes(path)) {
            router.push('/login');
        }

        if (isAuthenticated && publicPaths.includes(path) && path !== '/') {
            router.push('/dashboard');
        }
    }, [hydrated, isAuthenticated, pathname, router]);

    return <>{children}</>;
}
