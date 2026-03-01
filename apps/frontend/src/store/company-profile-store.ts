import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BusinessModel = 'saas' | 'services' | 'marketplace' | 'd2c';
export type CompanyStage = 'bootstrapped' | 'pre-revenue' | 'revenue' | 'funded';
export type PrimaryGoal = 'raise_capital' | 'extend_runway' | 'profitability' | 'optimize_taxes';

interface CompanyProfileState {
    businessModel: BusinessModel;
    stage: CompanyStage;
    primaryGoal: PrimaryGoal;

    // Actions
    setProfile: (profile: Partial<CompanyProfileState>) => void;

    // Computed (helper for UI logic)
    getReadinessType: () => 'capital' | 'profitability' | 'stability';
}

export const useCompanyProfileStore = create<CompanyProfileState>()(
    persist(
        (set, get) => ({
            // Defaults (can be inferred later via onboarding)
            businessModel: 'saas',
            stage: 'funded',
            primaryGoal: 'raise_capital',

            setProfile: (profile) => set((state) => ({ ...state, ...profile })),

            getReadinessType: () => {
                const { primaryGoal } = get();
                if (primaryGoal === 'raise_capital') return 'capital';
                if (primaryGoal === 'profitability') return 'profitability';
                return 'stability';
            },
        }),
        {
            name: 'company-profile-store',
        }
    )
);

// Dynamic Text Helpers
export const getGoalLabel = (goal: PrimaryGoal) => {
    switch (goal) {
        case 'raise_capital': return 'Fundraising Readiness';
        case 'profitability': return 'Path to Profitability';
        case 'extend_runway': return 'Runway Extension';
        case 'optimize_taxes': return 'Tax Efficiency';
        default: return 'Financial Health';
    }
};

export const getBlockerLabel = (goal: PrimaryGoal) => {
    switch (goal) {
        case 'raise_capital': return 'Next-Round Blockers';
        case 'profitability': return 'Profitability Blockers';
        case 'extend_runway': return 'Survival Risks';
        default: return 'Critical Blockers';
    }
};
