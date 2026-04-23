import { SensitivityLevel } from '@prisma/client';

export interface SensitivityConfig {
    minConfidence: number;
    rollbackTolerance: number;
    triggerStrictness: 'LOW' | 'MEDIUM' | 'HIGH';
    maxAutoBurnImpactPercent: number; // Max burn impact % of runway for auto-pilot
}

export const SENSITIVITY_CONFIGS: Record<SensitivityLevel, SensitivityConfig> = {
    [SensitivityLevel.CONSERVATIVE]: {
        minConfidence: 95,
        rollbackTolerance: 0.10,
        triggerStrictness: 'HIGH',
        maxAutoBurnImpactPercent: 2.0,
    },
    [SensitivityLevel.BALANCED]: {
        minConfidence: 85,
        rollbackTolerance: 0.20,
        triggerStrictness: 'MEDIUM',
        maxAutoBurnImpactPercent: 5.0,
    },
    [SensitivityLevel.AGGRESSIVE]: {
        minConfidence: 75,
        rollbackTolerance: 0.30,
        triggerStrictness: 'LOW',
        maxAutoBurnImpactPercent: 10.0,
    },
};

export const CFO_GUARDRAILS = {
    /** 
     * Never recommend or execute actions that result in < 3 months runway 
     * unless the starting runway is already below this.
     */
    MIN_CASH_BUFFER_MONTHS: 3.0,

    /** Max % of a single category that can be cut without manual verification */
    MAX_AUTO_COST_CUT_PERCENT: 0.40,

    /** Categories that NEVER allow auto-execution regardless of sensitivity */
    MANUAL_ONLY_CATEGORIES: ['Salaries', 'Payroll', 'Rent', 'Office Rent', 'Taxes'],

    /** Action types that require manual approval (High-Impact Behavioral) */
    MANUAL_ONLY_ACTION_TYPES: ['LAYOFFS', 'OFFICE_RELOCATION', 'M&A', 'LOAN_APPLICATION'],
};
