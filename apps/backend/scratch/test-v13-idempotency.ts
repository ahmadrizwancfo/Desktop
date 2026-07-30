import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ClassificationWorker } from '../src/events/workers/classification.worker';
import { ReconciliationWorker } from '../src/events/workers/reconciliation.worker';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV13Idempotency() {
  console.log('🛡️ Testing FounderCFO V13 Financially Trusted (Idempotent + Safe) Engine...\n');

  const classificationWorker = new ClassificationWorker(prisma as any, eventEmitter);
  const reconciliationWorker = new ReconciliationWorker(prisma as any, eventEmitter);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No test organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})\n`);

  // Clean initial state for test run
  await prisma.processedTransaction.deleteMany({ where: { organizationId: orgId } });
  await prisma.orgFinancialState.upsert({
    where: { organizationId: orgId },
    update: { debitSum30d: 0, creditSum30d: 0, monthlyBurn: 0, monthlyRevenue: 0, version: 0, isPartialState: true },
    create: { organizationId: orgId, cashInBank: 5000000, debitSum30d: 0, creditSum30d: 0, monthlyBurn: 0, monthlyRevenue: 0, version: 0, isPartialState: true },
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Send SAME transaction 3 times (Idempotency Test)
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 1: Sending exact SAME transaction (₹25,000 EXPENSE) 3 times...');
  const duplicateTxId = `tx-duplicate-${Date.now()}`;

  await classificationWorker.processSingleTransaction({
    transactionId: duplicateTxId,
    organizationId: orgId,
    amount: 25000,
    type: 'EXPENSE',
  });
  await classificationWorker.processSingleTransaction({
    transactionId: duplicateTxId,
    organizationId: orgId,
    amount: 25000,
    type: 'EXPENSE',
  });
  await classificationWorker.processSingleTransaction({
    transactionId: duplicateTxId,
    organizationId: orgId,
    amount: 25000,
    type: 'EXPENSE',
  });

  const stateAfterDup = await prisma.orgFinancialState.findUnique({ where: { organizationId: orgId } });
  const processedCount = await prisma.processedTransaction.count({ where: { transactionId: duplicateTxId } });

  console.log(`   - monthlyBurn: ₹${Number(stateAfterDup?.monthlyBurn)} (Expected: ₹25,000)`);
  console.log(`   - Processed Markers in DB: ${processedCount} (Expected: 1)`);
  console.log(`   - State Version: ${stateAfterDup?.version} (Expected: 1)`);

  if (Number(stateAfterDup?.monthlyBurn) === 25000 && processedCount === 1) {
    console.log('✅ TEST 1 PASSED: Zero double counting under retries/duplicates!\n');
  } else {
    console.error('❌ TEST 1 FAILED: Double counting detected!');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Send 100 Parallel Transactions Concurrently (Concurrency Test)
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Sending 100 parallel transactions concurrently via Promise.all...');
  const parallelTxs = Array.from({ length: 100 }, (_, i) => ({
    transactionId: `tx-parallel-${Date.now()}-${i}`,
    organizationId: orgId,
    amount: 1000, // 100 * ₹1000 = ₹100,000 total debit
    type: 'EXPENSE' as const,
  }));

  const startBurn = Number(stateAfterDup?.monthlyBurn);

  await Promise.all(
    parallelTxs.map((tx) => classificationWorker.processSingleTransaction(tx))
  );

  const stateAfterParallel = await prisma.orgFinancialState.findUnique({ where: { organizationId: orgId } });
  const expectedBurn = startBurn + 100 * 1000;

  console.log(`   - monthlyBurn: ₹${Number(stateAfterParallel?.monthlyBurn)} (Expected: ₹${expectedBurn})`);
  console.log(`   - Final State Version: ${stateAfterParallel?.version}`);

  if (Number(stateAfterParallel?.monthlyBurn) === expectedBurn) {
    console.log('✅ TEST 2 PASSED: 100 parallel transactions processed atomically with 0 race condition corruption!\n');
  } else {
    console.error(`❌ TEST 2 FAILED: Race condition corruption! Burn was ₹${Number(stateAfterParallel?.monthlyBurn)}, expected ₹${expectedBurn}`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Smart Reconciliation Delta Verification
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Executing Smart Delta Reconciliation...');
  const reconciledState = await reconciliationWorker.reconcileOrgState(orgId);

  console.log(`   - Smart Reconciled Version: v${reconciledState.version}`);
  console.log(`   - isPartialState: ${reconciledState.isPartialState} (Expected: false)`);
  console.log(`   - lastComputedAt: ${reconciledState.lastComputedAt}`);

  if (!reconciledState.isPartialState && reconciledState.lastComputedAt) {
    console.log('✅ TEST 3 PASSED: Smart Delta Reconciliation succeeded!\n');
  } else {
    console.error('❌ TEST 3 FAILED: Reconciliation state invalid.');
    process.exit(1);
  }

  console.log('🎉 ALL V13 FINANCIAL SAFETY & IDEMPOTENCY TESTS PASSED 100%!');
}

testV13Idempotency()
  .catch((e) => console.error('❌ Test error:', e))
  .finally(() => prisma.$disconnect());
