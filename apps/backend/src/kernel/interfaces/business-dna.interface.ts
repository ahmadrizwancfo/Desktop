export type BusinessStage = 'BOOTSTRAPPED' | 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B_PLUS' | 'PROFITABLE_SMB';
export type RevenueModel = 'SAAS_SUBSCRIPTION' | 'D2C_ECOMMERCE' | 'MARKETPLACE' | 'SERVICES_AGENCY' | 'TRANSACTIONAL';
export type PrimaryBusinessIntent = 'SURVIVE' | 'PRESERVE_RUNWAY' | 'PROFITABILITY' | 'AGGRESSIVE_GROWTH' | 'FUNDRAISING';

export interface BusinessIntentVector {
  primaryObjective: PrimaryBusinessIntent;
  riskTolerance: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  targetRunwayMonths: number;
  maxAcceptableBurnIncreasePercent: number;
  updatedAt: string;
}

export interface BusinessDnaProfile {
  organizationId: string;
  industry: string;
  stage: BusinessStage;
  revenueModel: RevenueModel;
  fiscalYearCycle: 'APRIL_MARCH' | 'JAN_DEC'; // India default: April-March
  daysSalesOutstanding: number;                // DSO (days)
  daysPayableOutstanding: number;              // DPO (days)
  cashConversionCycleDays: number;             // CCC (days)
  gstRegistered: boolean;
  payrollFrequency: 'MONTHLY' | 'BI_WEEKLY';
  intent: BusinessIntentVector;
}
