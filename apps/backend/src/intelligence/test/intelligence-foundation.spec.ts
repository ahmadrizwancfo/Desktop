import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FinancialEventStoreService } from '../events/financial-event-store.service';
import { MetricsEngineService } from '../metrics/metrics-engine.service';
import { FinancialFactsEngineService } from '../facts/financial-facts.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';
import { IntelligencePlatformService } from '../intelligence-platform.service';
import crypto from 'crypto';

describe('Phase 6C1 Intelligence Foundation Test Suite', () => {
  let platformService: IntelligencePlatformService;
  let eventStore: FinancialEventStoreService;
  let metricsEngine: MetricsEngineService;
  let factsEngine: FinancialFactsEngineService;
  let intelligenceBus: IntelligenceBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        FinancialEventStoreService,
        MetricsEngineService,
        FinancialFactsEngineService,
        IntelligenceBusService,
        IntelligencePlatformService,
      ],
    }).compile();

    platformService = module.get<IntelligencePlatformService>(IntelligencePlatformService);
    eventStore = module.get<FinancialEventStoreService>(FinancialEventStoreService);
    metricsEngine = module.get<MetricsEngineService>(MetricsEngineService);
    factsEngine = module.get<FinancialFactsEngineService>(FinancialFactsEngineService);
    intelligenceBus = module.get<IntelligenceBusService>(IntelligenceBusService);
  });

  describe('1. Financial Event Store', () => {
    it('should record immutable financial events and prevent mutations', () => {
      const orgId = crypto.randomUUID();
      const eventId = crypto.randomUUID();

      const event = eventStore.recordEvent({
        eventId,
        organizationId: orgId,
        eventType: 'TRANSACTION_INGESTED',
        eventCategory: 'CASH_FLOW',
        severity: 'MEDIUM',
        sourceObjectIds: ['tx_123'],
        metadata: { amount: 50000 },
      });

      expect(event.eventId).toBe(eventId);
      expect(eventStore.getEventCount(orgId)).toBe(1);

      // Verify Immutability: duplicate record attempt must throw error
      expect(() => {
        eventStore.recordEvent({
          eventId,
          organizationId: orgId,
          eventType: 'TRANSACTION_INGESTED',
          eventCategory: 'CASH_FLOW',
          severity: 'HIGH',
        });
      }).toThrow('Immutable Event Violation');
    });

    it('should query events by org and type', () => {
      const orgId = crypto.randomUUID();

      eventStore.recordEvent({
        eventId: crypto.randomUUID(),
        organizationId: orgId,
        eventType: 'INVOICE_CREATED',
        eventCategory: 'REVENUE',
        severity: 'LOW',
      });

      eventStore.recordEvent({
        eventId: crypto.randomUUID(),
        organizationId: orgId,
        eventType: 'TAX_LIABILITY_PROVISIONED',
        eventCategory: 'TAX',
        severity: 'HIGH',
      });

      const invEvents = eventStore.getEventsByType(orgId, 'INVOICE_CREATED');
      expect(invEvents.length).toBe(1);
      expect(invEvents[0].eventCategory).toBe('REVENUE');
    });
  });

  describe('2. Metrics Engine (20 Financial Metrics)', () => {
    it('should compute all 20 standardized financial metrics with zero division safety', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 5000000,
        monthlyExpenses: 1000000,
        monthlyRevenue: 1500000,
        previousMonthlyRevenue: 1200000,
        accountsReceivable: 300000,
        accountsPayable: 200000,
        inventoryValue: 100000,
        cogs: 450000,
      });

      expect(metricsMap.size).toBe(20);

      // Verify specific metric formulas
      expect(metricsMap.get('CASH_BALANCE')?.value).toBe(5000000);
      expect(metricsMap.get('GROSS_BURN')?.value).toBe(1000000);
      expect(metricsMap.get('NET_BURN')?.value).toBe(0); // Rev > Exp -> Net Burn = 0
      expect(metricsMap.get('RUNWAY_MONTHS')?.value).toBe(999); // Sustainable
      expect(metricsMap.get('MRR')?.value).toBe(1500000);
      expect(metricsMap.get('ARR')?.value).toBe(18000000);
      expect(metricsMap.get('REVENUE_GROWTH_PERCENT')?.value).toBe(25); // (1.5M - 1.2M)/1.2M = 25%
      expect(metricsMap.get('CURRENT_RATIO')?.value).toBeGreaterThan(0);
      expect(metricsMap.get('CASH_CONVERSION_CYCLE')?.value).toBeDefined();
    });

    it('should handle zero-revenue edge cases without throwing errors', () => {
      const orgId = crypto.randomUUID();
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 2000000,
        monthlyExpenses: 500000,
        monthlyRevenue: 0,
      });

      expect(metricsMap.get('NET_BURN')?.value).toBe(500000);
      expect(metricsMap.get('RUNWAY_MONTHS')?.value).toBe(4); // 2M / 500k = 4 mos
      expect(metricsMap.get('REVENUE_GROWTH_PERCENT')?.value).toBe(0);
    });
  });

  describe('3. Financial Facts Engine', () => {
    it('should deterministically generate Facts from metrics and events', () => {
      const orgId = crypto.randomUUID();
      
      const metricsMap = metricsEngine.calculateAllMetrics({
        organizationId: orgId,
        cashInBank: 500000,
        monthlyExpenses: 300000,
        monthlyRevenue: 50000, // Net Burn = 250k, Runway = 2 mos (< 3 mos = CRITICAL)
      });

      const facts = factsEngine.evaluateFacts(orgId, [], metricsMap);
      expect(facts.length).toBeGreaterThan(0);

      const runwayFact = facts.find(f => f.factType === 'RUNWAY_REDUCED');
      expect(runwayFact).toBeDefined();
      expect(runwayFact?.severity).toBe('CRITICAL');
      expect(runwayFact?.businessNarrative).toContain('Runway is critically low');
    });
  });

  describe('4. Intelligence Bus', () => {
    it('should publish and trigger topic subscribers', (done) => {
      const orgId = crypto.randomUUID();

      intelligenceBus.subscribe('intelligence.fact.published', (payload: any) => {
        expect(payload.organizationId).toBe(orgId);
        expect(payload.data.factType).toBe('CASH_INCREASED');
        done();
      });

      intelligenceBus.publishFact({
        factId: crypto.randomUUID(),
        organizationId: orgId,
        factType: 'CASH_INCREASED',
        severity: 'LOW',
        confidence: 1.0,
        supportingEvents: [],
        supportingMetrics: {},
        businessNarrative: 'Cash balance increased following funding round.',
        timestamp: new Date(),
      });
    });
  });

  describe('5. Full Intelligence Platform Process Integration', () => {
    it('should execute end-to-end intelligence processing and record execution time', () => {
      const orgId = crypto.randomUUID();

      const result = platformService.processIntelligence(
        {
          organizationId: orgId,
          cashInBank: 8000000,
          monthlyExpenses: 1200000,
          monthlyRevenue: 2000000,
        },
        [
          {
            eventId: crypto.randomUUID(),
            organizationId: orgId,
            eventType: 'TRANSACTION_INGESTED',
            eventCategory: 'REVENUE',
            severity: 'LOW',
          },
        ]
      );

      expect(result.recordedEventsCount).toBe(1);
      expect(result.computedMetricsCount).toBe(20);
      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
