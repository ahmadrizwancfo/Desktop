import { FinancialReasoningEngine } from '../financial-reasoning.engine';

describe('FounderCFO Kernel — Wave 4 Financial Reasoning Engine Suite', () => {
  let reasoningEngine: FinancialReasoningEngine;

  beforeEach(() => {
    reasoningEngine = new FinancialReasoningEngine();
  });

  it('1. should generate complete reasoning contract for COMPLIANCE_RISK_PERIOD', () => {
    const res = reasoningEngine.generateReasoning({
      organizationId: 'org_gst_101',
      cashBalance: 15000,
      monthlyBurn: 40000,
      runwayMonths: 0.3,
      runwayDays: 11,
      financialState: 'COMPLIANCE_RISK_PERIOD',
      primaryIntent: 'SURVIVE',
      confidenceScore: 0.98,
      gstPayable: 45000,
      temporal: {
        asOfTimestamp: '2026-08-03T14:00:00Z',
        effectiveDate: '2026-08-03',
        horizonType: 'ACTUAL',
        projectionDaysOut: 0,
      },
    });

    expect(res.organizationId).toBe('org_gst_101');
    expect(res.nature).toBe('STRUCTURAL');
    expect(res.whatChanged).toContain('Statutory GST liability');
    expect(res.primaryCause).toBe('Statutory cash isolation failure.');
    expect(res.secondaryCauses.length).toBeGreaterThan(0);
    expect(res.recommendedAction).toContain('GST escrow');
    expect(res.alternativeActions.length).toBeGreaterThan(0);
    expect(res.confidence).toBe(0.98);
    expect(res.evidence.length).toBe(3);
  });

  it('2. should generate complete reasoning contract for CRITICAL_CASH_CONSTRAINED', () => {
    const res = reasoningEngine.generateReasoning({
      organizationId: 'org_crit_102',
      cashBalance: 30000,
      monthlyBurn: 50000,
      runwayMonths: 0.6,
      runwayDays: 18,
      financialState: 'CRITICAL_CASH_CONSTRAINED',
      primaryIntent: 'PRESERVE_RUNWAY',
      confidenceScore: 0.95,
      temporal: {
        asOfTimestamp: '2026-08-03T14:00:00Z',
        effectiveDate: '2026-08-03',
        horizonType: 'ACTUAL',
        projectionDaysOut: 0,
      },
    });

    expect(res.nature).toBe('STRUCTURAL');
    expect(res.whatChanged).toContain('18 days');
    expect(res.riskIfIgnored).toContain('Insolvency');
    expect(res.recommendedAction).toContain('freeze non-essential vendor spend');
  });

  it('3. should generate complete reasoning contract for EXPANDING state', () => {
    const res = reasoningEngine.generateReasoning({
      organizationId: 'org_exp_103',
      cashBalance: 1200000,
      monthlyBurn: 50000,
      runwayMonths: 24,
      runwayDays: 730,
      financialState: 'EXPANDING',
      primaryIntent: 'AGGRESSIVE_GROWTH',
      confidenceScore: 1.0,
      temporal: {
        asOfTimestamp: '2026-08-03T14:00:00Z',
        effectiveDate: '2026-08-03',
        horizonType: 'ACTUAL',
        projectionDaysOut: 0,
      },
    });

    expect(res.nature).toBe('STRUCTURAL');
    expect(res.primaryCause).toBe('Strong liquidity capital buffer.');
    expect(res.recommendedAction).toContain('growth channels');
  });
});
