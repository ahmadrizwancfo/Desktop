import { CanonicalFinancialEngine } from '../canonical-financial-engine';
import { FinancialLawsEngine } from '../financial-laws.engine';
import { ConfidenceEngine } from '../confidence.engine';

describe('FounderCFO Kernel — Wave 1 Foundational Suite', () => {
  describe('CanonicalFinancialEngine', () => {
    it('1. should calculate liquid cash balance accurately from bank accounts', () => {
      const input = {
        bankAccountBalances: [
          { balance: 150000.50 },
          { balance: '50000.25' },
        ],
        undepositedChecks: 10000,
        statutoryHoldbacks: 5000,
      };

      const result = CanonicalFinancialEngine.calculateCashBalance(input);
      expect(result).toBe(205000.75); // 150000.50 + 50000.25 + 10000 - 5000
    });

    it('2. should calculate monthly net burn rate accurately', () => {
      const burnInput = {
        inflows30D: 200000,
        outflows30D: 350000,
        periodMonths: 1,
      };

      const burn = CanonicalFinancialEngine.calculateNetBurn(burnInput);
      expect(burn).toBe(150000); // 350000 - 200000

      // When inflows exceed outflows, net burn should be 0
      const profitableBurn = CanonicalFinancialEngine.calculateNetBurn({
        inflows30D: 500000,
        outflows30D: 300000,
      });
      expect(profitableBurn).toBe(0);
    });

    it('3. should calculate exact runway and Zero Cash Date without rounding drift', () => {
      const cash = 300000;
      const burn = 100000;
      const startDate = new Date('2026-08-01T00:00:00.000Z');

      const runway = CanonicalFinancialEngine.calculateRunway(cash, burn, startDate);

      expect(runway.runwayMonths).toBe(3);
      expect(runway.runwayDays).toBe(91); // 3 * 30.4375 rounded
      expect(runway.status).toBe('WARNING'); // <= 90 days
      expect(runway.zeroCashDate).toBe('2026-10-31');
    });

    it('4. should wrap metrics into standardized FinancialResult<T> domain contract', () => {
      const cash = 500000;
      const result = CanonicalFinancialEngine.createResult(
        { cashBalance: cash },
        {
          formulaUsed: 'Sum(BankAccount.balance)',
          confidenceScore: 0.98,
        }
      );

      expect(result.data.cashBalance).toBe(500000);
      expect(result.temporal.horizonType).toBe('ACTUAL');
      expect(result.temporal.projectionDaysOut).toBe(0);
      expect(result.provenance.engineVersion).toBe('v1.0.0-kernel');
      expect(result.provenance.formulaUsed).toBe('Sum(BankAccount.balance)');
      expect(result.confidence).toBe(0.98);
    });
  });

  describe('FinancialLawsEngine', () => {
    it('5. should pass laws for healthy financial context', () => {
      const laws = FinancialLawsEngine.evaluateLaws({
        cashInBank: 500000,
        monthlyBurn: 50000,
        monthlyRevenue: 100000,
        gstPayable: 18000,
      });

      expect(laws.length).toBeGreaterThanOrEqual(4);
      const violations = laws.filter(l => l.severity === 'VIOLATION');
      expect(violations.length).toBe(0);
    });

    it('6. should trigger statutory VIOLATION if GST payable exceeds liquid cash balance', () => {
      const laws = FinancialLawsEngine.evaluateLaws({
        cashInBank: 10000,
        monthlyBurn: 50000,
        gstPayable: 45000, // GST > Cash
      });

      const gstLaw = laws.find(l => l.lawId === 'LAW_04_GST_NOT_REVENUE');
      expect(gstLaw).toBeDefined();
      expect(gstLaw?.passed).toBe(false);
      expect(gstLaw?.severity).toBe('VIOLATION');
    });
  });

  describe('ConfidenceEngine', () => {
    it('7. should deterministically compute confidence score', () => {
      const freshScore = ConfidenceEngine.calculateConfidence({
        hoursSinceLastSync: 0,
        bankAccountCoverage: 1.0,
        reconciliationRate: 1.0,
        invoiceCompleteness: 1.0,
        projectionDaysOut: 0,
      });

      expect(freshScore).toBe(1.0);

      const degradedScore = ConfidenceEngine.calculateConfidence({
        hoursSinceLastSync: 72, // 0 freshness
        bankAccountCoverage: 0.8,
        reconciliationRate: 0.8,
        invoiceCompleteness: 0.8,
        projectionDaysOut: 90, // forecast penalty
      });

      expect(degradedScore).toBeLessThan(0.70);
    });
  });
});
