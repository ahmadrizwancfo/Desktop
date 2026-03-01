import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'founder' | 'finance' | 'investor';

interface RoleViewState {
    currentRole: UserRole;
    setRole: (role: UserRole) => void;

    // Role-specific settings
    showSensitiveData: boolean;
    canEditData: boolean;
    canApproveTransactions: boolean;
    canViewBankDetails: boolean;
    canAccessAICFO: boolean;
    canRunSimulations: boolean;
    canViewUnitEconomics: boolean;
    canGenerateReports: boolean;
}

const rolePermissions: Record<UserRole, Partial<RoleViewState>> = {
    founder: {
        showSensitiveData: true,
        canEditData: true,
        canApproveTransactions: true,
        canViewBankDetails: true,
        canAccessAICFO: true,
        canRunSimulations: true,
        canViewUnitEconomics: true,
        canGenerateReports: true,
    },
    finance: {
        showSensitiveData: true,
        canEditData: true,
        canApproveTransactions: true,
        canViewBankDetails: true,
        canAccessAICFO: true,
        canRunSimulations: true,
        canViewUnitEconomics: true,
        canGenerateReports: true,
    },
    investor: {
        showSensitiveData: false, // Hide sensitive customer/vendor details
        canEditData: false,       // Read-only access
        canApproveTransactions: false,
        canViewBankDetails: false, // Hide bank account numbers
        canAccessAICFO: false,    // No AI CFO access
        canRunSimulations: false, // Can view but not modify
        canViewUnitEconomics: true, // Can view metrics
        canGenerateReports: true, // Can download reports
    },
};

export const useRoleViewStore = create<RoleViewState>()(
    persist(
        (set) => ({
            currentRole: 'founder' as UserRole,

            // Default permissions (Founder)
            showSensitiveData: true,
            canEditData: true,
            canApproveTransactions: true,
            canViewBankDetails: true,
            canAccessAICFO: true,
            canRunSimulations: true,
            canViewUnitEconomics: true,
            canGenerateReports: true,

            setRole: (role: UserRole) => {
                const permissions = rolePermissions[role];
                set({
                    currentRole: role,
                    ...permissions,
                });
            },
        }),
        {
            name: 'role-view-store',
        }
    )
);

// Role display config
export const roleConfig: Record<UserRole, { label: string; description: string; color: string; bg: string }> = {
    founder: {
        label: 'Founder',
        description: 'Full access to all features and data',
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
    },
    finance: {
        label: 'Finance / CA',
        description: 'Manage finances, compliance, and taxes',
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
    },
    investor: {
        label: 'Investor / Board',
        description: 'Read-only access to metrics and reports',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/20',
    },
};
