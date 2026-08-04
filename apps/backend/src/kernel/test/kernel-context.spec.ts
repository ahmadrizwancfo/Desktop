import { FinancialContextEngine } from '../financial-context.engine';
import { BusinessDnaService } from '../business-dna.service';
import { FinancialStateMachineService } from '../financial-state-machine.service';
import { FinancialReasoningEngine } from '../financial-reasoning.engine';
import { FinancialMemoryEngine } from '../financial-memory.engine';

describe('FounderCFO Kernel — Unified Financial Context Layer Suite', () => {
  let contextEngine: FinancialContextEngine;

  beforeEach(() => {
    const dnaService = new BusinessDnaService();
    const stateMachine = new FinancialStateMachineService();
    const reasoningEngine = new FinancialReasoningEngine();
    const memoryEngine = new FinancialMemoryEngine();

    contextEngine = new FinancialContextEngine(
      dnaService,
      stateMachine,
      reasoningEngine,
      memoryEngine
    );
  });

  it('1. should unify all Kernel outputs into a single canonical Financial Context Layer', () => {
    const context = contextEngine.compileContext({
      organizationId: 'org_context_101',
      cashBalance: 250000,
      monthlyBurn: 50000,
      monthlyRevenue: 20000,
      gstPayable: 15000,
    });

    expect(context.organizationId).toBe('org_context_101');
    expect(context.metrics.runwayMonths).toBe(5); // 250000 / 50000
    expect(context.metrics.runwayDays).toBe(152);
    expect(context.state.currentState).toBe('HEALTHY');
    expect(context.reasoning.whatChanged).toBeDefined();
    expect(context.dna.fiscalYearCycle).toBe('APRIL_MARCH');
    expect(context.lawsApplied.length).toBeGreaterThan(0);
    expect(context.confidence).toBeGreaterThan(0.80);
    expect(context.provenance.engineVersion).toBe('v1.0.0-kernel');
  });
});
