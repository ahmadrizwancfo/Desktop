import { BusinessDnaService } from '../business-dna.service';
import { FinancialStateMachineService } from '../financial-state-machine.service';

describe('FounderCFO Kernel — Wave 3 Suite', () => {
  let dnaService: BusinessDnaService;
  let stateMachine: FinancialStateMachineService;

  beforeEach(() => {
    dnaService = new BusinessDnaService();
    stateMachine = new FinancialStateMachineService();
  });

  describe('BusinessDnaService', () => {
    it('1. should compile canonical Business DNA Profile with default April-March cycle', () => {
      const dna = dnaService.compileDnaProfile('org_101', {
        stage: 'SEED',
        industry: 'Fintech',
        primaryGoal: 'Extend runway to 18 months',
      });

      expect(dna.organizationId).toBe('org_101');
      expect(dna.stage).toBe('SEED');
      expect(dna.fiscalYearCycle).toBe('APRIL_MARCH');
      expect(dna.intent.primaryObjective).toBe('PRESERVE_RUNWAY');
    });

    it('2. should correctly normalize dynamic business intent vectors', () => {
      const surviveDna = dnaService.compileDnaProfile('org_102', { primaryGoal: 'Survive cash crunch' });
      expect(surviveDna.intent.primaryObjective).toBe('SURVIVE');

      const growthDna = dnaService.compileDnaProfile('org_103', { primaryGoal: 'Scale aggressive market acquisition' });
      expect(growthDna.intent.primaryObjective).toBe('AGGRESSIVE_GROWTH');

      const fundDna = dnaService.compileDnaProfile('org_104', { primaryGoal: 'Raise Series A funding' });
      expect(fundDna.intent.primaryObjective).toBe('FUNDRAISING');
    });
  });

  describe('FinancialStateMachineService', () => {
    it('3. should transition to COMPLIANCE_RISK_PERIOD when GST liability exceeds cash balance', () => {
      const res = stateMachine.evaluateState({
        cashInBank: 20000,
        monthlyBurn: 50000,
        runwayDays: 12,
        gstPayable: 50000, // GST > Cash
      });

      expect(res.currentState).toBe('COMPLIANCE_RISK_PERIOD');
      expect(res.legacyModeAlias).toBe('CRITICAL');
    });

    it('4. should transition to CRITICAL_CASH_CONSTRAINED when runway <= 30 days', () => {
      const res = stateMachine.evaluateState({
        cashInBank: 40000,
        monthlyBurn: 50000,
        runwayDays: 24,
      });

      expect(res.currentState).toBe('CRITICAL_CASH_CONSTRAINED');
      expect(res.legacyModeAlias).toBe('CRITICAL');
    });

    it('5. should transition to CASH_CONSTRAINED when runway <= 90 days', () => {
      const res = stateMachine.evaluateState({
        cashInBank: 100000,
        monthlyBurn: 50000,
        runwayDays: 60,
      });

      expect(res.currentState).toBe('CASH_CONSTRAINED');
      expect(res.legacyModeAlias).toBe('AT_RISK');
    });

    it('6. should transition to EXPANDING when runway >= 365 days', () => {
      const res = stateMachine.evaluateState({
        cashInBank: 1000000,
        monthlyBurn: 50000,
        runwayDays: 600,
      });

      expect(res.currentState).toBe('EXPANDING');
      expect(res.legacyModeAlias).toBe('STABLE');
    });
  });
});
