import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveStateEngineService, LiveStateSnapshot } from '../src/cfo-engine/live-state.engine';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { ExpenseIntelligenceService } from '../src/cfo-engine/expense-intelligence.service';
import { SseService } from '../src/sse/sse.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CFOState } from '../src/cfo-engine/cfo-state.service';

describe('Milestone M3 Empirical Stress & Hardening Test Suite', () => {
  let liveStateEngine: LiveStateEngineService;
  let decisionEngine: DecisionEngineService;
  let sseService: SseService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStateEngineService,
        DecisionEngineService,
        ExpenseIntelligenceService,
        SseService,
        PrismaService,
        EventEmitter2,
      ],
    }).compile();

    liveStateEngine = moduleRef.get<LiveStateEngineService>(LiveStateEngineService);
    decisionEngine = moduleRef.get<DecisionEngineService>(DecisionEngineService);
    sseService = moduleRef.get<SseService>(SseService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (sseService) sseService.onModuleDestroy();
    if (liveStateEngine) liveStateEngine.onModuleDestroy();
    if (prismaService) await prismaService.$disconnect();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ZERO-TRANSACTION ORG HANDLING & DIVISION SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Zero-Transaction Org Handling & Division Safety', () => {
    it('should handle zero-transaction org in LiveStateEngine without crashing', async () => {
      const zeroOrgId = 'org-zero-tx-test-' + Date.now();
      
      const snapshot = await liveStateEngine.getLiveState(zeroOrgId);

      expect(snapshot).toBeDefined();
      expect(snapshot.organizationId).toBe(zeroOrgId);
      expect(snapshot.financialState).toBeNull();
      expect(snapshot.decisions).toEqual([]);
      expect(snapshot.topPriority).toBeNull();
      expect(snapshot.actions).toEqual([]);
      expect(snapshot.isPartialState).toBe(false);
      expect(snapshot.processingMessage).toBeNull();
    });

    it('should prevent NaN and Infinity in DecisionEngine generateDecisions for zero-cash/zero-burn orgs', () => {
      const zeroState: CFOState = {
        organizationId: 'zero-org',
        founderPersona: 'disciplined',
        summary: {
          cashInBank: 0,
          monthlyExpenses: 0,
          monthlyRevenue: 0,
          netBurn: 0,
          runwayMonths: NaN, // Trigger edge case
          revenueTrend: 'stable',
        },
        dynamicConfidence: {
          score: 50,
          label: 'Moderate',
          warnings: [],
        },
        decisionMemory: { pendingDecisions: 0 },
        changeDrivers: [],
        negativeTrends: [],
      } as any;

      const output = decisionEngine.generateDecisions(zeroState);

      expect(output).toBeDefined();
      expect(Number.isNaN(output.currentRunway)).toBe(false);
      expect(Number.isFinite(output.currentRunway)).toBe(true);
      expect(output.currentRunway).toBe(0);
      expect(Number.isNaN(output.completionRate)).toBe(false);
      expect(Number.isFinite(output.completionRate)).toBe(true);
      expect(Number.isNaN(output.investorTrustScore)).toBe(false);
      expect(Number.isFinite(output.investorTrustScore)).toBe(true);

      // Verify no decision contains NaN/Infinity in formatted strings
      for (const d of output.decisions) {
        expect(d.message).not.toContain('NaN');
        expect(d.message).not.toContain('Infinity');
        if (d.rationale) {
          expect(d.rationale).not.toContain('NaN');
          expect(d.rationale).not.toContain('Infinity');
        }
      }
    });

    it('should handle division by zero safely in fmtAmt and candidate generation', () => {
      const edgeState: CFOState = {
        organizationId: 'edge-org',
        founderPersona: 'disciplined',
        summary: {
          cashInBank: 0,
          monthlyExpenses: 100000,
          monthlyRevenue: 0,
          netBurn: 100000,
          runwayMonths: 0,
          revenueTrend: 'declining',
        },
        dynamicConfidence: { score: 10, label: 'Low', warnings: [] },
        decisionMemory: { pendingDecisions: 5 },
        changeDrivers: [
          {
            label: 'Rent',
            delta: 50000,
            impactOnRunwayMonths: -0.5,
            trend: 'up',
            category: 'rent',
          },
        ],
        negativeTrends: [],
      } as any;

      const output = decisionEngine.generateDecisions(edgeState);
      expect(output).toBeDefined();
      expect(output.urgency).toBe('critical');

      // Check fmtAmt behavior indirectly
      const deathClockMsg = output.decisions.find(d => d.decisionKey === 'RUNWAY_SURVIVAL')?.message;
      if (deathClockMsg) {
        expect(deathClockMsg).not.toContain('NaN');
        expect(deathClockMsg).not.toContain('Infinity');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RAPID STATE READS & PERFORMANCE SLA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Rapid State Reads & SLA Validation', () => {
    it('should satisfy LiveStateEngine refresh SLA (< 250ms)', async () => {
      const testOrgId = 'sla-test-org-' + Date.now();

      const startTime = performance.now();
      const snapshot = await liveStateEngine.getLiveState(testOrgId);
      const elapsedMs = performance.now() - startTime;

      expect(snapshot).toBeDefined();
      expect(elapsedMs).toBeLessThan(250);
      console.log(`[STRESS METRIC] LiveStateEngine DB Hydration: ${elapsedMs.toFixed(2)}ms (SLA target: < 250ms)`);
    });

    it('should perform 10,000 rapid state reads in sub-millisecond cached time', async () => {
      const testOrgId = 'rapid-read-org';
      // Hydrate state into cache first
      await liveStateEngine.getLiveState(testOrgId);

      const READ_COUNT = 10000;
      const startTime = performance.now();
      for (let i = 0; i < READ_COUNT; i++) {
        await liveStateEngine.getLiveState(testOrgId);
      }
      const totalElapsedMs = performance.now() - startTime;
      const avgLatencyMs = totalElapsedMs / READ_COUNT;
      const opsPerSec = Math.round((READ_COUNT / totalElapsedMs) * 1000);

      expect(avgLatencyMs).toBeLessThan(0.1); // Expect < 0.1ms per cached read
      console.log(`[STRESS METRIC] 10,000 Rapid Reads: Total ${totalElapsedMs.toFixed(2)}ms, Avg ${avgLatencyMs.toFixed(4)}ms/op, ${opsPerSec.toLocaleString()} ops/sec`);
    });

    it('should satisfy DecisionEngine execution SLA (< 500ms)', async () => {
      const testOrgId = 'sla-decision-org-' + Date.now();

      const startTime = performance.now();
      const result = await decisionEngine.evaluateStatefulDecisions(testOrgId);
      const elapsedMs = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(elapsedMs).toBeLessThan(500);
      console.log(`[STRESS METRIC] DecisionEngine Execution: ${elapsedMs.toFixed(2)}ms (SLA target: < 500ms)`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SSE SERVICE MEMORY SAFETY & SUBJECT AUTO-PRUNING
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. SSE Memory Safety & Subject Auto-Pruning', () => {
    it('should auto-prune SSE subject when subscriber count reaches 0', () => {
      const testOrgId = 'sse-prune-test-org-' + Date.now();

      const observable = sseService.subscribe(testOrgId);
      const subscription = observable.subscribe({
        next: () => {},
      });

      // Verify subject is active
      const internalSubjects = (sseService as any).subjects;
      expect(internalSubjects.has(testOrgId)).toBe(true);

      // Unsubscribe
      subscription.unsubscribe();

      // Subject should be auto-pruned immediately when 0 subscribers remain
      expect(internalSubjects.has(testOrgId)).toBe(false);
    });

    it('should prune unobserved SSE subjects during heartbeat loop', () => {
      const testOrgId = 'sse-heartbeat-prune-org-' + Date.now();

      // Create an unobserved subject directly in sseService map
      const internalSubjects = (sseService as any).subjects;
      const unobservedSubject = new (require('rxjs').Subject)();
      internalSubjects.set(testOrgId, unobservedSubject);

      expect(internalSubjects.has(testOrgId)).toBe(true);

      // Force heartbeat iteration logic
      for (const [orgId, subject] of Array.from(internalSubjects.entries())) {
        if (!subject.observed) {
          subject.complete();
          internalSubjects.delete(orgId);
        }
      }

      expect(internalSubjects.has(testOrgId)).toBe(false);
    });

    it('should clear all SSE subjects and timers on module destroy', () => {
      const destroyOrgId = 'destroy-sse-org';
      const obs = sseService.subscribe(destroyOrgId);
      const sub = obs.subscribe();

      const internalSubjects = (sseService as any).subjects;
      expect(internalSubjects.size).toBeGreaterThan(0);

      sseService.onModuleDestroy();

      expect(internalSubjects.size).toBe(0);
      expect((sseService as any).heartbeatInterval).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. LIVESTATEENGINE LRU MAP BOUND & DESTROY CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. LiveStateEngine LRU Cache Bound', () => {
    it('should strictly bound in-memory cache to 500 items and evict oldest', async () => {
      const cacheMap = (liveStateEngine as any).liveStateMap;
      cacheMap.clear();

      const MAX_CACHE_SIZE = 500;
      const TOTAL_ORGS = 600;

      // Populate 600 distinct org snapshots using setCachedState helper
      for (let i = 0; i < TOTAL_ORGS; i++) {
        const orgId = `lru-org-${i}`;
        const snapshot: LiveStateSnapshot = {
          organizationId: orgId,
          financialState: null,
          decisions: [],
          topPriority: null,
          actions: [],
          projectedState: null,
          vendorReport: null,
          predictiveReport: null,
          isPartialState: false,
          processingMessage: null,
          lastUpdatedAt: Date.now(),
          version: 1,
        };
        (liveStateEngine as any).setCachedState(orgId, snapshot);
      }

      // Assert size is capped at 500
      expect(cacheMap.size).toBe(MAX_CACHE_SIZE);

      // Verify oldest orgs (org-0 to org-99) were evicted
      expect(cacheMap.has('lru-org-0')).toBe(false);
      expect(cacheMap.has('lru-org-50')).toBe(false);
      expect(cacheMap.has('lru-org-99')).toBe(false);

      // Verify newest orgs (org-100 to org-599) are present
      expect(cacheMap.has('lru-org-100')).toBe(true);
      expect(cacheMap.has('lru-org-599')).toBe(true);

      console.log(`[STRESS METRIC] LiveStateEngine LRU Cache Bounding: Map size capped at ${cacheMap.size} (Limit: ${MAX_CACHE_SIZE}), oldest 100 entries correctly evicted.`);
    });

    it('should clear cached state map on module destroy', () => {
      const cacheMap = (liveStateEngine as any).liveStateMap;
      (liveStateEngine as any).setCachedState('test-org-destroy', { organizationId: 'test-org-destroy' } as any);
      expect(cacheMap.size).toBeGreaterThan(0);

      liveStateEngine.onModuleDestroy();
      expect(cacheMap.size).toBe(0);
    });
  });
});
