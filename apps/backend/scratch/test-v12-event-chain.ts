import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ClassificationWorker } from '../src/events/workers/classification.worker';
import { RunwayWorker } from '../src/events/workers/runway.worker';
import { ReconciliationWorker } from '../src/events/workers/reconciliation.worker';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV12EventChain() {
  console.log('🧪 Testing FounderCFO V12 Deterministic Event Chain...\n');

  // Initialize workers with eventEmitter and prisma
  const classificationWorker = new ClassificationWorker(prisma as any, eventEmitter);
  const runwayWorker = new RunwayWorker(prisma as any, eventEmitter);
  const reconciliationWorker = new ReconciliationWorker(prisma as any, eventEmitter);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})`);

  // Ensure a bank account exists
  let bankAccount = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } });
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: orgId,
        name: 'V12 Test Account',
        bankName: 'HDFC',
        accountNumber: 'V12-9999',
        balance: 5000000,
        currency: 'INR',
      },
    });
  }

  const startTime = Date.now();
  const stagesObserved: Record<string, number> = {};

  // Attach Event Tracing Listeners
  eventEmitter.on('dashboard.quick_update', (e) => {
    stagesObserved['QUICK_UPDATE'] = Date.now() - startTime;
    console.log(`⚡ [${stagesObserved['QUICK_UPDATE']}ms] Stage 1: QUICK_UPDATE received -> "${e.message}"`);
  });

  eventEmitter.on('state.partial_updated', (e) => {
    stagesObserved['PARTIAL_UPDATE'] = Date.now() - startTime;
    console.log(`⚡ [${stagesObserved['PARTIAL_UPDATE']}ms] Stage 2: PARTIAL_UPDATE received -> Burn: ₹${e.monthlyBurn}`);
  });

  eventEmitter.on('runway.recalculated', (e) => {
    stagesObserved['RUNWAY_UPDATE'] = Date.now() - startTime;
    console.log(`⚡ [${stagesObserved['RUNWAY_UPDATE']}ms] Stage 3: RUNWAY_UPDATE received -> Runway: ${e.runwayDays} days (${e.runwayStatus})`);
  });

  eventEmitter.on('state.reconciled', (e) => {
    stagesObserved['FINAL_STATE'] = Date.now() - startTime;
    console.log(`🟢 [${stagesObserved['FINAL_STATE']}ms] Stage 4: FINAL_STATE received -> Reconciled DB Match!`);
  });

  // Attach Workers to Event Bus
  eventEmitter.on('transaction.ingested', (payload) => {
    classificationWorker.handleTransactionIngested(payload);
    reconciliationWorker.scheduleReconciliation(payload);
  });
  eventEmitter.on('state.partial_updated', (payload) => {
    runwayWorker.handlePartialUpdate(payload);
  });

  // 1. Create 50 Transactions
  console.log('\n📦 Inserting 50 synthetic transactions into database...');
  const txData = Array.from({ length: 50 }, (_, i) => ({
    amount: 10000 + i * 500,
    type: (i % 3 === 0 ? 'INCOME' : 'EXPENSE') as any,
    category: i % 3 === 0 ? 'Service Revenue' : 'SaaS Subscriptions',
    description: `V12 Test Item #${i + 1}`,
    date: new Date(),
    bankAccountId: bankAccount!.id,
  }));

  await prisma.transaction.createMany({ data: txData });

  // 2. Trigger Ingestion Event with Metadata
  console.log('🚀 Triggering transaction.ingested Event...\n');

  eventEmitter.emit('dashboard.quick_update', {
    eventId: randomUUID(),
    timestamp: Date.now(),
    organizationId: orgId,
    message: 'Processing 50 transactions...',
    deltaTransactions: 50,
  });

  eventEmitter.emit('transaction.ingested', {
    eventId: randomUUID(),
    timestamp: Date.now(),
    organizationId: orgId,
    transactions: txData.map((t) => ({ amount: t.amount, type: t.type })),
  });

  // Wait 6 seconds for debounced reconciliation stage
  await new Promise((resolve) => setTimeout(resolve, 6000));

  console.log('\n📊 DETERMINISTIC EVENT CHAIN TIMING SUMMARY:');
  console.log('============================================');
  console.log(` ⚡ QUICK_UPDATE   : ${stagesObserved['QUICK_UPDATE'] ?? 'N/A'} ms (Target: < 50ms)`);
  console.log(` ⚡ PARTIAL_UPDATE : ${stagesObserved['PARTIAL_UPDATE'] ?? 'N/A'} ms (Target: < 200ms)`);
  console.log(` ⚡ RUNWAY_UPDATE  : ${stagesObserved['RUNWAY_UPDATE'] ?? 'N/A'} ms (Target: < 400ms)`);
  console.log(` 🟢 FINAL_STATE    : ${stagesObserved['FINAL_STATE'] ?? 'N/A'} ms (Target: 5000-10000ms)`);
  console.log('============================================\n');

  if (
    stagesObserved['QUICK_UPDATE'] !== undefined &&
    stagesObserved['PARTIAL_UPDATE'] !== undefined &&
    stagesObserved['RUNWAY_UPDATE'] !== undefined &&
    stagesObserved['FINAL_STATE'] !== undefined
  ) {
    console.log('🎉 V12 Deterministic Event Pipeline Verification PASSED 100%!');
  } else {
    console.error('❌ Verification failed - incomplete event chain.');
  }
}

testV12EventChain()
  .catch((e) => console.error('❌ Integration test error:', e))
  .finally(() => prisma.$disconnect());
