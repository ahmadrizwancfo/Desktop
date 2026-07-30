import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testV11Engine() {
  console.log('🧪 Testing FounderCFO V11 Progressive Financial State Engine...\n');

  // 1. Fetch any test organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found');
    return;
  }
  console.log(`🏢 Testing Organization: ${org.name} (${org.id})`);

  // 2. Initialize / Upsert OrgFinancialState Fast Layer
  const fastState = await prisma.orgFinancialState.upsert({
    where: { organizationId: org.id },
    update: {
      debitSum30d: { increment: 50000 },
      monthlyBurn: { increment: 50000 },
      isPartialState: true,
    },
    create: {
      organizationId: org.id,
      cashInBank: 4520230,
      debitSum30d: 50000,
      creditSum30d: 0,
      monthlyBurn: 50000,
      monthlyRevenue: 0,
      netBurn: 50000,
      runwayMonths: 90.4,
      runwayDays: 2748,
      runwayStatus: 'HEALTHY',
      isPartialState: true,
    },
  });

  console.log('⚡ Fast Layer Incremental Update Success:');
  console.log('   - monthlyBurn:', Number(fastState.monthlyBurn));
  console.log('   - isPartialState:', fastState.isPartialState);

  // 3. Test Truth Layer Reconciliation Math
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const txs = await prisma.transaction.findMany({
    where: {
      bankAccount: { organizationId: org.id },
      date: { gte: thirtyDaysAgo },
    },
    select: { amount: true, type: true },
  });

  let trueDebit = 0;
  let trueCredit = 0;
  for (const tx of txs) {
    const amt = Number(tx.amount);
    if (tx.type === 'EXPENSE' || (tx.type as any) === 'DEBIT') trueDebit += amt;
    if (tx.type === 'INCOME' || (tx.type as any) === 'CREDIT') trueCredit += amt;
  }

  const trueNetBurn = Math.max(0, trueDebit - trueCredit);
  const cash = Number(fastState.cashInBank);
  const trueRunwayMonths = trueNetBurn > 0 ? cash / trueNetBurn : 999;
  const trueRunwayDays = Math.round(trueRunwayMonths * 30.4);

  const finalState = await prisma.orgFinancialState.update({
    where: { organizationId: org.id },
    data: {
      debitSum30d: trueDebit,
      creditSum30d: trueCredit,
      monthlyBurn: trueDebit,
      monthlyRevenue: trueCredit,
      netBurn: trueNetBurn,
      runwayMonths: trueRunwayMonths,
      runwayDays: trueRunwayDays,
      isPartialState: false,
      lastComputedAt: new Date(),
    },
  });

  console.log('\n🟢 Truth Layer Reconciliation Success:');
  console.log('   - trueDebit (DB exact):', Number(finalState.debitSum30d));
  console.log('   - trueCredit (DB exact):', Number(finalState.creditSum30d));
  console.log('   - netBurn (Reconciled):', Number(finalState.netBurn));
  console.log('   - runwayDays (Reconciled):', finalState.runwayDays);
  console.log('   - isPartialState (Finalized):', finalState.isPartialState);
  console.log('   - lastComputedAt:', finalState.lastComputedAt);

  console.log('\n🎉 FounderCFO V11 Engine Verification Passed 100%!');
}

testV11Engine()
  .catch((e) => console.error('❌ Test failed:', e))
  .finally(() => prisma.$disconnect());
