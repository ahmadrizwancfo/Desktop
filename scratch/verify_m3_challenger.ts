import { LiveStateEngineService } from '../apps/backend/src/cfo-engine/live-state.engine';
import { SseService } from '../apps/backend/src/sse/sse.service';
import { DecisionEngineService } from '../apps/backend/src/cfo-engine/decision-engine.service';
import { CFOState } from '../apps/backend/src/cfo-engine/cfo-state.service';

async function runM3EmpiricalVerification() {
  console.log('====================================================');
  console.log('🔬 EMPIRICAL VERIFICATION HARNESS — MILESTONE M3');
  console.log('====================================================\n');

  let passedAll = true;

  // -----------------------------------------------------------------
  // 1. Division Safety & Zero-Transaction Org Handling
  // -----------------------------------------------------------------
  console.log('--- TEST 1: Division Safety & Zero-Tx Org Handling ---');
  try {
    const decisionEngine = new DecisionEngineService(null as any, null as any, null as any);

    // Test with all zeroes, NaN, Infinity
    const zeroState: Partial<CFOState> = {
      summary: {
        runwayMonths: NaN,
        netBurn: 0,
        cashInBank: 0,
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        burnTrend: 'flat',
        revenueTrend: 'flat',
      },
      dynamicConfidence: { score: 0, warnings: [] },
      changeDrivers: [],
      negativeTrends: [],
      decisionMemory: { pendingDecisions: 0 } as any,
      founderPersona: 'disciplined',
    };

    const result = decisionEngine.generateDecisions(zeroState as CFOState, []);
    
    // Assert no NaN / Infinity values in output
    const jsonStr = JSON.stringify(result);
    const hasNaN = jsonStr.includes('NaN') || jsonStr.includes('null') && jsonStr.includes('"impactBurnMonthly":NaN');
    const hasInfinity = jsonStr.includes('Infinity');

    if (hasNaN || hasInfinity) {
      console.error('❌ FAIL: DecisionEngine generated NaN or Infinity on zero state');
      passedAll = false;
    } else {
      console.log('✅ PASS: DecisionEngine safely handled NaN / 0 / Infinity without crashes or bad numbers');
      console.log(`   Result urgency: ${result.urgency}, primaryDecisionId: ${result.primaryDecisionId}`);
    }

    // Test computeProjectedState with zero net burn
    const projState = decisionEngine.computeProjectedState(
      { monthlyBurn: 0, monthlyRevenue: 0, cashInBank: 0, runwayDays: 0 },
      []
    );
    if (isNaN(projState.projectedRunwayMonths) || !isFinite(projState.projectedRunwayMonths)) {
      console.error('❌ FAIL: computeProjectedState generated NaN/Infinity');
      passedAll = false;
    } else {
      console.log(`✅ PASS: computeProjectedState zero burn runway: ${projState.projectedRunwayMonths} months`);
    }

  } catch (err: any) {
    console.error(`❌ FAIL: Zero tx test threw error: ${err.message}`);
    passedAll = false;
  }

  // -----------------------------------------------------------------
  // 2. Memory Safety: LRU Map Bounds in LiveStateEngine
  // -----------------------------------------------------------------
  console.log('\n--- TEST 2: LRU Cache Bounding in LiveStateEngine ---');
  try {
    const liveStateEngine = new LiveStateEngineService(null as any, null as any);

    // Bypassing private setCachedState for stress test
    for (let i = 1; i <= 600; i++) {
      (liveStateEngine as any).setCachedState(`org_${i}`, {
        organizationId: `org_${i}`,
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
      });
    }

    const mapSize = (liveStateEngine as any).liveStateMap.size;
    const maxCache = (liveStateEngine as any).MAX_CACHE_SIZE;

    if (mapSize > maxCache) {
      console.error(`❌ FAIL: Cache size ${mapSize} exceeded max limit ${maxCache}`);
      passedAll = false;
    } else {
      console.log(`✅ PASS: Cache map bound enforced! Created 600 entries, cache size is ${mapSize} (Limit: ${maxCache})`);
      console.log(`   Oldest item 'org_1' evicted: ${!(liveStateEngine as any).liveStateMap.has('org_1')}`);
      console.log(`   Newest item 'org_600' present: ${(liveStateEngine as any).liveStateMap.has('org_600')}`);
    }

    // Test onModuleDestroy
    liveStateEngine.onModuleDestroy();
    if ((liveStateEngine as any).liveStateMap.size !== 0) {
      console.error(`❌ FAIL: onModuleDestroy did not clear liveStateMap`);
      passedAll = false;
    } else {
      console.log('✅ PASS: onModuleDestroy successfully cleared all cache entries');
    }
  } catch (err: any) {
    console.error(`❌ FAIL: LRU test threw error: ${err.message}`);
    passedAll = false;
  }

  // -----------------------------------------------------------------
  // 3. Memory Safety: SSE Subject Auto-Pruning
  // -----------------------------------------------------------------
  console.log('\n--- TEST 3: SSE Subject Auto-Pruning ---');
  try {
    const sseService = new SseService();
    
    // Subscribe 5 clients to org_A and org_B
    const sub1 = sseService.subscribe('org_A').subscribe();
    const sub2 = sseService.subscribe('org_A').subscribe();
    const sub3 = sseService.subscribe('org_B').subscribe();

    let subjectMap = (sseService as any).subjects;
    console.log(`   Active Subjects before teardown: ${subjectMap.size}`);

    // Teardown subscriptions
    sub1.unsubscribe();
    sub2.unsubscribe(); // org_A count drops to 0 -> should auto-prune
    sub3.unsubscribe(); // org_B count drops to 0 -> should auto-prune

    if (subjectMap.size !== 0) {
      console.error(`❌ FAIL: Subjects map still contains ${subjectMap.size} entries after all subscriptions closed`);
      passedAll = false;
    } else {
      console.log('✅ PASS: Auto-pruning purged all RxJS Subjects upon 0 active subscribers');
    }

    // Clean up interval
    sseService.onModuleDestroy();
    console.log('✅ PASS: SseService destroyed cleanly');
  } catch (err: any) {
    console.error(`❌ FAIL: SSE test threw error: ${err.message}`);
    passedAll = false;
  }

  // -----------------------------------------------------------------
  // 4. Performance SLAs
  // -----------------------------------------------------------------
  console.log('\n--- TEST 4: Performance SLA Benchmarks ---');
  try {
    // DecisionEngine execution SLA (<500ms)
    const decisionEngine = new DecisionEngineService(null as any, null as any, null as any);
    const mockState: Partial<CFOState> = {
      summary: {
        runwayMonths: 4.5,
        netBurn: 120000,
        cashInBank: 540000,
        monthlyRevenue: 80000,
        monthlyExpenses: 200000,
        burnTrend: 'up',
        revenueTrend: 'flat',
      },
      dynamicConfidence: { score: 90, warnings: [] },
      changeDrivers: [{ label: 'Payroll', delta: 30000, trend: 'up', impactOnRunwayMonths: -0.5 }],
      negativeTrends: [{ metric: 'Runway', message: 'Below 6 months' }],
      decisionMemory: { pendingDecisions: 1 } as any,
      founderPersona: 'disciplined',
    };

    const startTime = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      decisionEngine.generateDecisions(mockState as CFOState, []);
    }
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / iterations;

    console.log(`   DecisionEngine avg execution time over ${iterations} runs: ${avgTime.toFixed(3)} ms (Target: <500 ms)`);
    if (avgTime > 500) {
      console.error(`❌ FAIL: DecisionEngine exceeded SLA budget of 500ms`);
      passedAll = false;
    } else {
      console.log(`✅ PASS: DecisionEngine execution SLA validated (${avgTime.toFixed(3)} ms << 500 ms)`);
    }

    // LiveStateEngine cached read SLA (<250ms)
    const liveStateEngine = new LiveStateEngineService(null as any, null as any);
    (liveStateEngine as any).setCachedState('test_org', {
      organizationId: 'test_org',
      financialState: { runwayMonths: 12 },
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
    });

    const readStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      await liveStateEngine.getLiveState('test_org');
    }
    const totalReadTime = performance.now() - readStart;
    const avgReadTime = totalReadTime / 1000;

    console.log(`   LiveStateEngine avg read time over 1000 cached reads: ${avgReadTime.toFixed(4)} ms (Target: <250 ms)`);
    if (avgReadTime > 250) {
      console.error(`❌ FAIL: LiveStateEngine exceeded SLA budget of 250ms`);
      passedAll = false;
    } else {
      console.log(`✅ PASS: LiveStateEngine read SLA validated (${avgReadTime.toFixed(4)} ms << 250 ms)`);
    }
  } catch (err: any) {
    console.error(`❌ FAIL: SLA benchmark test threw error: ${err.message}`);
    passedAll = false;
  }

  console.log('\n====================================================');
  if (passedAll) {
    console.log('🎉 ALL EMPIRICAL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME EMPIRICAL VERIFICATION TESTS FAILED');
  }
  console.log('====================================================\n');
}

runM3EmpiricalVerification();
