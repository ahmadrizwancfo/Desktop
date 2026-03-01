import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StartupStage = 'IDEA' | 'PRE_SEED' | 'SEED' | 'GROWTH' | 'SME';
export type PrimaryGoal = 'RAISE' | 'SURVIVE' | 'PROFIT' | 'SCALE';

export interface StartupProfile {
    id: string;
    userId: string;
    organizationId: string;
    companyName: string;
    stage: StartupStage;
    monthlyRevenue: number;
    monthlyExpenses: number;
    cashInBank: number;
    teamSize: number;
    country: string;
    industry: string;
    primaryGoal: PrimaryGoal;
    createdAt: string;
    updatedAt: string;
}

interface StartupProfileState {
    profile: StartupProfile | null;
    isLoaded: boolean;
    setProfile: (profile: StartupProfile) => void;
    clearProfile: () => void;
    // Helper: should investor metrics be shown?
    showInvestorMetrics: () => boolean;
}

export const useStartupProfileStore = create<StartupProfileState>()(
    persist(
        (set, get) => ({
            profile: null,
            isLoaded: false,

            setProfile: (profile) => set({ profile, isLoaded: true }),

            clearProfile: () => set({ profile: null, isLoaded: false }),

            showInvestorMetrics: () => {
                const { profile } = get();
                return profile?.primaryGoal === 'RAISE';
            },
        }),
        {
            name: 'startup-profile',
            partialize: (state) => ({ profile: state.profile }),
        },
    ),
);
