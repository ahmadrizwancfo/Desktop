// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE GATES — Tier-based access control (localStorage for now)
// Starter (free) → Growth (Pro) → Scale (Enterprise)
// ═══════════════════════════════════════════════════════════════════════════════

export type UserTier = 'starter' | 'pro' | 'enterprise';

export type GatedFeature =
    | 'unlimitedScenarios'
    | 'pdfExports'
    | 'deepMandates'
    | 'boardDeck'
    | 'unlimitedAiQueries'
    | 'customReports';

const TIER_KEY = 'foundercfo_tier';

const TIER_LIMITS: Record<UserTier, Record<GatedFeature, boolean>> = {
    starter: {
        unlimitedScenarios: false,
        pdfExports: false,
        deepMandates: false,
        boardDeck: false,
        unlimitedAiQueries: false,
        customReports: false,
    },
    pro: {
        unlimitedScenarios: true,
        pdfExports: true,
        deepMandates: true,
        boardDeck: true,
        unlimitedAiQueries: true,
        customReports: true,
    },
    enterprise: {
        unlimitedScenarios: true,
        pdfExports: true,
        deepMandates: true,
        boardDeck: true,
        unlimitedAiQueries: true,
        customReports: true,
    },
};

const STARTER_SCENARIO_LIMIT = 3;

export function getCurrentTier(): UserTier {
    if (typeof window === 'undefined') return 'starter';
    return (localStorage.getItem(TIER_KEY) as UserTier) || 'starter';
}

export function setTier(tier: UserTier): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TIER_KEY, tier);
    }
}

export function canAccess(feature: GatedFeature): boolean {
    const tier = getCurrentTier();
    return TIER_LIMITS[tier]?.[feature] ?? false;
}

export function getScenarioLimit(): number {
    return canAccess('unlimitedScenarios') ? Infinity : STARTER_SCENARIO_LIMIT;
}

export function getTierLabel(tier?: UserTier): string {
    const t = tier || getCurrentTier();
    return t === 'starter' ? 'Starter' : t === 'pro' ? 'Pro' : 'Enterprise';
}

export function getUpgradeTierFor(feature: GatedFeature): UserTier {
    // All gated features unlock at Pro
    return 'pro';
}
