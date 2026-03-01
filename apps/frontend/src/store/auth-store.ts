import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    organizationId?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_token', token);
                }
                set({ user, token, isAuthenticated: true });
            },
            logout: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_token');
                }
                set({ user: null, token: null, isAuthenticated: false });
            },
            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null
                })),
        }),
        {
            name: 'auth-storage',
        }
    )
);
