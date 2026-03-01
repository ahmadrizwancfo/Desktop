'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouteGuard } from "@/components/auth/route-guard";
import { ToastProvider } from "@/components/ui/toast";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <RouteGuard>
                    {children}
                </RouteGuard>
            </ToastProvider>
        </QueryClientProvider>
    );
}
