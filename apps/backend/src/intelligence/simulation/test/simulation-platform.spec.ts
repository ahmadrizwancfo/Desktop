import { Test, TestingModule } from '@nestjs/testing';
import { SimulationModule } from '../simulation.module';
import { SimulationPlatformService } from '../simulation-platform.service';
import { SimulationDecisionInput } from '../domain/simulation.types';

describe('Phase 7 Decision Simulation Engine Test Suite', () => {
  let simulationPlatform: SimulationPlatformService;
  const orgId = '00000000-0000-0000-0000-000000000001';

  const defaultBaseline = {
    organizationId: orgId,
    cashInBank: 5000000,
    monthlyExpenses: 1200000,
    monthlyRevenue: 1500000,
    accountsReceivable: 1000000,
    accountsPayable: 600000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationModule],
    }).compile();

    simulationPlatform = module.get<SimulationPlatformService>(SimulationPlatformService);
  });

  it('1. HIRING: Should simulate headcount expansion impact deterministically', () => {
    const decision: SimulationDecisionInput = {
      type: 'HIRING',
      value: 5,
      description: 'Hire 5 Senior Software Engineers',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.simulationId).toBeDefined();
    expect(res.affectedSystems).toContain('SYS_HIRING');
    expect(res.affectedSystems).toContain('SYS_EXPENSE');
    expect(res.financialMetricChanges['GROSS_BURN'].simulatedValue).toBe(1200000 + 5 * 150000);
    expect(res.confidence).toBe(1.0);
    expect(res.executionTimeMs).toBeLessThan(500);
  });

  it('2. SALARY_CHANGE: Should simulate 10% payroll increase impact', () => {
    const decision: SimulationDecisionInput = {
      type: 'SALARY_CHANGE',
      value: 10,
      description: '10% company-wide salary adjustment',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['GROSS_BURN'].simulatedValue).toBeGreaterThan(defaultBaseline.monthlyExpenses);
    expect(res.recommendation.isRecommended).toBeDefined();
  });

  it('3. EXPENSE_REDUCTION: Should simulate opex reduction extending runway', () => {
    const decision: SimulationDecisionInput = {
      type: 'EXPENSE_REDUCTION',
      value: 300000,
      description: 'Cut non-essential software SaaS subscriptions',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['GROSS_BURN'].simulatedValue).toBe(900000);
    expect(res.recommendation.isRecommended).toBe(true);
  });

  it('4. MARKETING_SPEND: Should simulate marketing ad spend increase', () => {
    const decision: SimulationDecisionInput = {
      type: 'MARKETING_SPEND',
      value: 150000,
      description: 'Increase Google & LinkedIn paid marketing budget',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['GROSS_BURN'].simulatedValue).toBe(1350000);
    expect(res.affectedSystems).toContain('SYS_GROWTH');
  });

  it('5. PRICING: Should simulate 15% pricing increase extending MRR', () => {
    const decision: SimulationDecisionInput = {
      type: 'PRICING',
      value: 15,
      description: '15% price increase across SaaS subscription tiers',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['MRR'].simulatedValue).toBeCloseTo(1725000);
    expect(res.recommendation.isRecommended).toBe(true);
  });

  it('6. COLLECTIONS_IMPROVEMENT: Should simulate 14-day DSO reduction', () => {
    const decision: SimulationDecisionInput = {
      type: 'COLLECTIONS_IMPROVEMENT',
      value: 14,
      description: 'Accelerate enterprise invoice collections',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['DSO'].simulatedValue).toBeLessThan(res.financialMetricChanges['DSO'].baselineValue);
    expect(res.recommendation.isRecommended).toBe(true);
  });

  it('7. VENDOR_PAYMENT_TERMS: Should simulate 15-day DPO extension', () => {
    const decision: SimulationDecisionInput = {
      type: 'VENDOR_PAYMENT_TERMS',
      value: 15,
      description: 'Extend supplier payment terms from Net-30 to Net-45',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['DPO'].simulatedValue).toBeGreaterThan(res.financialMetricChanges['DPO'].baselineValue);
  });

  it('8. DEBT: Should simulate venture debt facility injection', () => {
    const decision: SimulationDecisionInput = {
      type: 'DEBT',
      value: 2000000,
      description: 'Take ₹20L venture debt loan',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['CASH_BALANCE'].simulatedValue).toBe(7000000);
    expect(res.affectedSystems).toContain('SYS_FUNDING');
  });

  it('9. EQUITY_FUNDING: Should simulate equity round closing extending runway', () => {
    const decision: SimulationDecisionInput = {
      type: 'EQUITY_FUNDING',
      value: 10000000,
      description: 'Close ₹1 Cr Seed Equity Round',
    };

    const res = simulationPlatform.runSimulation({
      organizationId: orgId,
      decision,
      baselineParams: defaultBaseline,
    });

    expect(res.financialMetricChanges['CASH_BALANCE'].simulatedValue).toBe(15000000);
    expect(res.recommendation.isRecommended).toBe(true);
  });
});
