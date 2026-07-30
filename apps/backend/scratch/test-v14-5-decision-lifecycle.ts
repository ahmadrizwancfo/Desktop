import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { ExpenseIntelligenceService } from '../src/cfo-engine/expense-intelligence.service';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV14_5DecisionLifecycle() {
  console.log('🧠 Testing FounderCFO V14.5 Decision Intelligence Engine (Lifecycle + Priority + Math)...\n');

  const expenseIntelligence = new ExpenseIntelligenceService(prisma as any);
  const decisionEngine = new DecisionEngineService(prisma as any, eventEmitter, expenseIntelligence);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No test organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})\n`);

  // Clean initial active decisions for test organization
  await prisma.activeDecision.deleteMany({ where: { organizationId: orgId } });

  // ---------------------------------------------------------------------------
  // TEST 1: Noise Suppression Test (20 Rapid Updates with Same Condition)
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 1: Simulating 20 rapid state updates with DEATH_CLOCK active (20 days runway)...');

  // Set org state to 20 days runway (netBurn = 250,000, cash = 166,666)
  await prisma.orgFinancialState.upsert({
    where: { organizationId: orgId },
    update: { runwayDays: 20, cashInBank: 166666, netBurn: 250000, monthlyBurn: 250000, monthlyRevenue: 0 },
    create: { organizationId: orgId, runwayDays: 20, cashInBank: 166666, netBurn: 250000, monthlyBurn: 250000, monthlyRevenue: 0 },
  });

  // Run 20 rapid evaluations
  for (let i = 0; i < 20; i++) {
    await decisionEngine.evaluateStatefulDecisions(orgId);
  }

  const activeCount = await prisma.activeDecision.count({
    where: { organizationId: orgId, type: 'DEATH_CLOCK', isActive: true },
  });

  console.log(`   - Active DEATH_CLOCK Records in DB: ${activeCount} (Expected: 1)`);

  if (activeCount === 1) {
    console.log('✅ TEST 1 PASSED: Noise suppression verified — 0 duplicate records created!\n');
  } else {
    console.error(`❌ TEST 1 FAILED: Found ${activeCount} duplicate records!`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Actionable Quantitative Math & Priority Scoring Test
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Verifying Priority Scoring & Actionable Quantitative Recommendations...');
  const res2 = await decisionEngine.evaluateStatefulDecisions(orgId);
  const topDecision = res2.topPriority;

  console.log(`   - Top Priority Decision: ${topDecision?.type} (Score: ${topDecision?.priorityScore})`);
  console.log(`   - Actionable Message: "${topDecision?.message}"`);
  console.log(`   - Actionable Recommendation: "${topDecision?.recommendation}"`);

  if (topDecision?.type === 'DEATH_CLOCK' && topDecision?.priorityScore === 100 && topDecision?.recommendation.includes('/month')) {
    console.log('✅ TEST 2 PASSED: Quantitative actionable math & priority scoring verified!\n');
  } else {
    console.error('❌ TEST 2 FAILED: Priority or actionable math incorrect.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Auto-Resolution Test (Runway Restored to 120 Days)
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Restoring runway from 20 days -> 120 days (Testing Auto-Resolution)...');

  // Update org state to healthy 120 days runway
  await prisma.orgFinancialState.update({
    where: { organizationId: orgId },
    data: { runwayDays: 120, cashInBank: 5000000, netBurn: 100000, monthlyBurn: 100000 },
  });

  const res3 = await decisionEngine.evaluateStatefulDecisions(orgId);
  const resolvedDeathClock = await prisma.activeDecision.findFirst({
    where: { organizationId: orgId, type: 'DEATH_CLOCK' },
  });

  console.log(`   - DEATH_CLOCK isActive: ${resolvedDeathClock?.isActive} (Expected: false)`);
  console.log(`   - DEATH_CLOCK resolvedAt: ${resolvedDeathClock?.resolvedAt}`);
  console.log(`   - Diff Resolved Items Count: ${res3.diff.resolved.length}`);

  if (!resolvedDeathClock?.isActive && resolvedDeathClock?.resolvedAt && res3.diff.resolved.length > 0) {
    console.log('✅ TEST 3 PASSED: Auto-resolution lifecycle verified!\n');
  } else {
    console.error('❌ TEST 3 FAILED: Auto-resolution failed.');
    process.exit(1);
  }

  console.log('🎉 ALL V14.5 DECISION INTELLIGENCE LIFECYCLE TESTS PASSED 100%!');
}

testV14_5DecisionLifecycle()
  .catch((e) => console.error('❌ Test error:', e))
  .finally(() => prisma.$disconnect());
