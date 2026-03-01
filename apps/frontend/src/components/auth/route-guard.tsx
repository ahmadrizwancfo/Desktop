'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        const publicPaths = ['/', '/login', '/register'];
        const path = pathname.split('?')[0];

        if (!isAuthenticated && !publicPaths.includes(path)) {
            router.push('/login');
        }

        if (isAuthenticated && publicPaths.includes(path) && path !== '/') {
            router.push('/dashboard');
        }
    }, [isAuthenticated, pathname, router]);

    return <>{children}</>;
}
