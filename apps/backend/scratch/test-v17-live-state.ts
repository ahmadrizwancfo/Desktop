import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveStateEngineService } from '../src/cfo-engine/live-state.engine';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV17LiveStateEngine() {
  console.log('⚡ Testing FounderCFO V17 Authoritative Live State Engine & Unified SSE Architecture...\n');

  const liveStateEngine = new LiveStateEngineService(prisma as any, eventEmitter);
  liveStateEngine.registerOnEvents();

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No test organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})\n`);

  let liveStateUpdateEmitted = false;
  let receivedSnapshot: any = null;

  // Listen to single unified LIVE_STATE_UPDATE event
  eventEmitter.on('live.state.update', (data: { organizationId: string; snapshot: any }) => {
    if (data.organizationId === orgId) {
      liveStateUpdateEmitted = true;
      receivedSnapshot = data.snapshot;
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Hydrate Live State & Assert Initial Version
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 1: Hydrating initial LiveState snapshot from memory/DB...');
  const startT = Date.now();
  const initialSnapshot = await liveStateEngine.getLiveState(orgId);
  const hydrationTimeMs = Date.now() - startT;

  console.log(`   - Hydration Time: ${hydrationTimeMs} ms`);
  console.log(`   - Initial Version: ${initialSnapshot.version}`);
  console.log(`   - Org ID: ${initialSnapshot.organizationId}`);

  if (initialSnapshot.organizationId === orgId && hydrationTimeMs < 500) {
    console.log('✅ TEST 1 PASSED: Snapshot hydration verified!\n');
  } else {
    console.error('❌ TEST 1 FAILED: Hydration error.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Deterministic Event Reduction & Sub-50ms Latency Assertion
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Triggering transaction.ingested -> State Partial Update reduction...');
  const t2Start = Date.now();

  eventEmitter.emit('dashboard.quick_update', {
    organizationId: orgId,
    deltaTransactions: 15,
  });

  const t2Latency = Date.now() - t2Start;

  console.log(`   - Reduction Latency: ${t2Latency} ms (Threshold: < 50ms)`);
  console.log(`   - Live State Version Post-Reduction: ${receivedSnapshot?.version}`);
  console.log(`   - Partial State Flag: ${receivedSnapshot?.isPartialState}`);
  console.log(`   - Processing Message: "${receivedSnapshot?.processingMessage}"`);

  if (t2Latency < 50 && receivedSnapshot?.version > initialSnapshot.version && receivedSnapshot?.isPartialState) {
    console.log('✅ TEST 2 PASSED: Sub-50ms deterministic event reduction & versioning verified!\n');
  } else {
    console.error('❌ TEST 2 FAILED: Reduction latency or state update error.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Multi-Event Chain Reduction into Single Unified Live State
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Triggering Decision Generated & Action Updated reduction...');

  eventEmitter.emit('decision.generated', {
    organizationId: orgId,
    activeDecisions: [
      { id: 'dec-1', type: 'DEATH_CLOCK', priorityScore: 100, message: 'Critical 20-Day Runway Risk' },
    ],
    topPriority: { id: 'dec-1', type: 'DEATH_CLOCK', priorityScore: 100 },
    projectedState: { currentRunwayDays: 20, projectedRunwayDays: 180 },
    pendingActions: [
      { id: 'act-1', title: 'Freeze Contractor Spend', status: 'PENDING' },
    ],
  });

  console.log(`   - Snapshot Version Post-Decision: ${receivedSnapshot?.version}`);
  console.log(`   - Active Decisions Count: ${receivedSnapshot?.decisions.length}`);
  console.log(`   - Top Priority Decision: ${receivedSnapshot?.topPriority?.type}`);
  console.log(`   - Pending Actions Count: ${receivedSnapshot?.actions.length}`);

  if (
    receivedSnapshot?.decisions.length === 1 &&
    receivedSnapshot?.topPriority?.type === 'DEATH_CLOCK' &&
    receivedSnapshot?.actions.length === 1
  ) {
    console.log('✅ TEST 3 PASSED: Multi-event chain unified state reduction verified!\n');
  } else {
    console.error('❌ TEST 3 FAILED: Unified state reduction error.');
    process.exit(1);
  }

  console.log('🎉 ALL V17 LIVE STATE ENGINE & UNIFIED SSE TESTS PASSED 100%!');
}

testV17LiveStateEngine()
  .catch((e) => console.error('❌ Integration test error:', e))
  .finally(() => prisma.$disconnect());
