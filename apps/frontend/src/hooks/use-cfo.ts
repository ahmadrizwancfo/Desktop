'use client';

import { useCFOState } from '@/store/cfo-state-store';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';

/**
 * Convenience hook for components that need CFO state + refresh.
 * Wraps useCFOState and provides a simple `recommendations` accessor
 * and a `refresh` function to invalidate the CFO cache.
 */
export function useCfo() {
    const { data: cfoState, isLoading, isRefetching } = useCFOState();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['cfo-state', user?.organizationId] });
    };

    return {
        cfoState,
        recommendations: cfoState?.autonomousRecommendations ?? null,
        isLoading,
        isRefetching,
        refresh,
    };
}
