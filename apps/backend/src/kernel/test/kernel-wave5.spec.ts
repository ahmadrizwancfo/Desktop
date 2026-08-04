import { FinancialMemoryEngine } from '../financial-memory.engine';
import { FinancialReasoningEngine } from '../financial-reasoning.engine';

describe('FounderCFO Kernel — Wave 5 Financial Memory Engine Suite', () => {
  let memoryEngine: FinancialMemoryEngine;
  let reasoningEngine: FinancialReasoningEngine;

  beforeEach(() => {
    memoryEngine = new FinancialMemoryEngine();
    reasoningEngine = new FinancialReasoningEngine();
  });

  it('1. should record completed strategic business events into Financial Memory', () => {
    const reasoning = reasoningEngine.generateReasoning({
      organizationId: 'org_mem_101',
      cashBalance: 15000,
      monthlyBurn: 40000,
      runwayMonths: 0.3,
      runwayDays: 11,
      financialState: 'COMPLIANCE_RISK_PERIOD',
      primaryIntent: 'SURVIVE',
      confidenceScore: 0.98,
      gstPayable: 45000,
      temporal: {
        asOfTimestamp: '2026-08-03T15:00:00Z',
        effectiveDate: '2026-08-03',
        horizonType: 'ACTUAL',
        projectionDaysOut: 0,
      },
    });

    const memory = memoryEngine.recordMemory({
      organizationId: 'org_mem_101',
      eventType: 'GST_STATUTORY_PENALTY',
      summary: 'Statutory GST liability exceeded bank cash; allocated emergency escrow.',
      triggeringFacts: { cash: 15000, gstPayable: 45000 },
      reasoningSnapshot: reasoning,
      businessState: 'COMPLIANCE_RISK_PERIOD',
      businessIntent: 'SURVIVE',
      actionsTaken: ['Allocated collected receivables to GST escrow account'],
      outcome: {
        realizedRunwayDeltaDays: 15,
        status: 'SUCCESS',
        lessonLearned: 'Always maintain statutory holdback account.',
      },
    });

    expect(memory.id).toBeDefined();
    expect(memory.eventType).toBe('GST_STATUTORY_PENALTY');
    expect(memory.outcome.status).toBe('SUCCESS');
  });

  it('2. should deterministically answer whether an organization has experienced an event', () => {
    const hasGstEvent = memoryEngine.hasExperiencedEvent('org_mem_101', 'GST_STATUTORY_PENALTY');
    expect(hasGstEvent).toBe(true);

    const hasHiringExpansion = memoryEngine.hasExperiencedEvent('org_mem_101', 'HIRING_EXPANSION');
    expect(hasHiringExpansion).toBe(false);
  });

  it('3. should retrieve historical outcomes for strategic decisions', () => {
    const outcomes = memoryEngine.getHistoricalOutcomes('org_mem_101', 'GST_STATUTORY_PENALTY');
    expect(outcomes.length).toBe(1);
    expect(outcomes[0].status).toBe('SUCCESS');
    expect(outcomes[0].realizedRunwayDeltaDays).toBe(15);
  });
});
