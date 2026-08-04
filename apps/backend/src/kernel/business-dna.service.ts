import { Injectable } from '@nestjs/common';
import { BusinessDnaProfile, PrimaryBusinessIntent, BusinessIntentVector } from './interfaces/business-dna.interface';

@Injectable()
export class BusinessDnaService {
  /**
   * Compiles canonical Business DNA Profile for an organization.
   * Long-term characteristics (Stage, Industry, Fiscal Year) + dynamic Intent strategy layer.
   */
  public compileDnaProfile(organizationId: string, rawProfile?: any): BusinessDnaProfile {
    const stage = rawProfile?.stage || 'SEED';
    const industry = rawProfile?.industry || 'Technology / SaaS';
    const revenueModel = rawProfile?.businessModel || 'SAAS_SUBSCRIPTION';

    // Parse dynamic intent vector or set defaults
    const rawIntent: PrimaryBusinessIntent = rawProfile?.primaryGoal || 'PRESERVE_RUNWAY';
    const intent: BusinessIntentVector = {
      primaryObjective: this.normalizeIntent(rawIntent),
      riskTolerance: rawProfile?.riskTolerance || 'BALANCED',
      targetRunwayMonths: rawProfile?.targetRunwayMonths || 12,
      maxAcceptableBurnIncreasePercent: rawProfile?.maxAcceptableBurnIncreasePercent || 10,
      updatedAt: rawProfile?.updatedAt ? new Date(rawProfile.updatedAt).toISOString() : new Date().toISOString(),
    };

    return {
      organizationId,
      industry,
      stage,
      revenueModel,
      fiscalYearCycle: 'APRIL_MARCH', // India standard
      daysSalesOutstanding: rawProfile?.dso || 45,
      daysPayableOutstanding: rawProfile?.dpo || 30,
      cashConversionCycleDays: (rawProfile?.dso || 45) - (rawProfile?.dpo || 30),
      gstRegistered: true,
      payrollFrequency: 'MONTHLY',
      intent,
    };
  }

  private normalizeIntent(raw: string): PrimaryBusinessIntent {
    const upper = (raw || '').toUpperCase();
    if (upper.includes('SURVIV') || upper.includes('CRITICAL')) return 'SURVIVE';
    if (upper.includes('PROFIT')) return 'PROFITABILITY';
    if (upper.includes('GROW') || upper.includes('SCALE')) return 'AGGRESSIVE_GROWTH';
    if (upper.includes('RAISE') || upper.includes('FUND')) return 'FUNDRAISING';
    return 'PRESERVE_RUNWAY';
  }
}
