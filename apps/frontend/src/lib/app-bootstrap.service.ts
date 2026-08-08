import { apiClient } from './api-client';
import { useAuthStore } from '@/store/auth-store';
import { useStartupProfileStore } from '@/store/startup-profile-store';

export type BootstrapState =
    | 'UNAUTHENTICATED'
    | 'RESTORING_SESSION'
    | 'LOADING_CONTEXT'
    | 'CONTEXT_FAILED'
    | 'READY'
    | 'SANDBOX_DEMO';

export interface OperatingContext {
    user: any;
    profile: any;
    hasProfile: boolean;
    organizationId?: string;
}

class AppBootstrapService {
    private isBootstrapping = false;

    async bootstrap(): Promise<{ state: BootstrapState; context?: OperatingContext }> {
        if (this.isBootstrapping) {
            return { state: 'RESTORING_SESSION' };
        }

        this.isBootstrapping = true;

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

            if (!token) {
                this.isBootstrapping = false;
                return { state: 'UNAUTHENTICATED' };
            }

            // Load OperatingContext from backend API
            const res = await apiClient.get('/startup-profile/me');
            const profile = res.data;

            // Hydrate Stores
            if (profile) {
                useStartupProfileStore.getState().setProfile(profile);
            }

            this.isBootstrapping = false;
            return {
                state: 'READY',
                context: {
                    user: useAuthStore.getState().user,
                    profile,
                    hasProfile: !!profile,
                    organizationId: profile?.organizationId,
                },
            };
        } catch (error: any) {
            this.isBootstrapping = false;

            if (error.response?.status === 404) {
                // Auth valid, but profile/workspace not created yet
                return {
                    state: 'READY',
                    context: {
                        user: useAuthStore.getState().user,
                        profile: null,
                        hasProfile: false,
                    },
                };
            }

            if (error.response?.status === 401) {
                // Token revoked / invalid
                localStorage.removeItem('auth_token');
                useAuthStore.getState().logout();
                return { state: 'UNAUTHENTICATED' };
            }

            // Network timeout or server error
            return { state: 'CONTEXT_FAILED' };
        }
    }
}

export const appBootstrapService = new AppBootstrapService();
