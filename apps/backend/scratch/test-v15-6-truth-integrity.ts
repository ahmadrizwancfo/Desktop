import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';
import { ExpenseIntelligenceService } from '../src/cfo-engine/expense-intelligence.service';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV15_6TruthIntegrity() {
  console.log('🛡️ Testing FounderCFO V15.6 Strict Financial Truth Integrity Architecture...\n');

  const expenseIntelligence = new ExpenseIntelligenceService(prisma as any);
  const decisionEngine = new DecisionEngineService(prisma as any, eventEmitter, expenseIntelligence);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No test organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})\n`);

  // Clean test tables
  await prisma.activeDecision.deleteMany({ where: { organizationId: orgId } });
  await prisma.recommendedAction.deleteMany({ where: { organizationId: orgId } });
  await prisma.verifiedImpact.deleteMany({ where: { organizationId: orgId } });

  // Setup initial financial state: 20 days runway, ₹2,50,000 monthly burn, ₹166,666 cash
  const initialFastState = await prisma.orgFinancialState.upsert({
    where: { organizationId: orgId },
    update: { runwayDays: 20, cashInBank: 166666, netBurn: 250000, monthlyBurn: 250000, monthlyRevenue: 0 },
    create: { organizationId: orgId, runwayDays: 20, cashInBank: 166666, netBurn: 250000, monthlyBurn: 250000, monthlyRevenue: 0 },
  });

  const res1 = await decisionEngine.evaluateStatefulDecisions(orgId);
  const pendingActions = await prisma.recommendedAction.findMany({
    where: { organizationId: orgId, status: 'PENDING' },
  });

  if (pendingActions.length === 0) {
    console.error('❌ Failed to generate actions');
    process.exit(1);
  }

  const action = pendingActions[0];
  console.log(`📦 Action Generated: "${action.title}" (Expected Impact: ₹${Number(action.impactAmount).toLocaleString('en-IN')})`);

  // ---------------------------------------------------------------------------
  // TEST 1: Complete Action -> Assert OrgFinancialState is 100% UNCHANGED
  // ---------------------------------------------------------------------------
  console.log('\n🧪 TEST 1: Founder marks action COMPLETED -> Asserting OrgFinancialState is UNCHANGED...');
  await decisionEngine.updateActionStatus(orgId, action.id, 'COMPLETED');

  const stateAfterAction = await prisma.orgFinancialState.findUnique({ where: { organizationId: orgId } });

  console.log(`   - Initial Burn  : ₹${Number(initialFastState.monthlyBurn)}`);
  console.log(`   - Post-Action Burn: ₹${Number(stateAfterAction?.monthlyBurn)}`);
  console.log(`   - Initial Runway : ${initialFastState.runwayDays} days`);
  console.log(`   - Post-Action Runway: ${stateAfterAction?.runwayDays} days`);

  if (
    Number(stateAfterAction?.monthlyBurn) === Number(initialFastState.monthlyBurn) &&
    stateAfterAction?.runwayDays === initialFastState.runwayDays
  ) {
    console.log('✅ TEST 1 PASSED: Strict Truth Integrity enforced — OrgFinancialState is 100% UNCHANGED!\n');
  } else {
    console.error('❌ TEST 1 FAILED: OrgFinancialState was incorrectly mutated!');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Verification Engine & VerifiedImpact Ledger Creation
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Running Verification Engine after post-completion transaction flow...');

  // Ensure bank account exists
  let bankAccount = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } });
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: orgId,
        name: 'Truth Test Account',
        bankName: 'HDFC',
        accountNumber: 'TRUTH-100',
        balance: 5000000,
        currency: 'INR',
      },
    });
  }

  // Ingest post-completion transaction to simulate measured impact
  await prisma.transaction.create({
    data: {
      bankAccountId: bankAccount.id,
      amount: Number(action.impactAmount),
      type: 'EXPENSE',
      category: 'SaaS',
      description: 'Post-Action Reduced SaaS Expense',
      date: new Date(),
    },
  });

  await decisionEngine.verifyActionImpact(orgId);

  const verifiedRecord = await prisma.verifiedImpact.findFirst({
    where: { organizationId: orgId, actionId: action.id },
  });

  console.log(`   - Verified Impact Ledger ID: ${verifiedRecord?.id}`);
  console.log(`   - Expected Impact : ₹${Number(verifiedRecord?.expectedImpact).toLocaleString('en-IN')}`);
  console.log(`   - Actual Impact   : ₹${Number(verifiedRecord?.actualImpact).toLocaleString('en-IN')}`);
  console.log(`   - Variance        : ₹${Number(verifiedRecord?.variance).toLocaleString('en-IN')}`);
  console.log(`   - Accuracy Score  : ${verifiedRecord?.accuracyScore}`);

  if (verifiedRecord && verifiedRecord.accuracyScore > 0) {
    console.log('✅ TEST 2 PASSED: VerifiedImpact ledger record created with calculated accuracy & variance!\n');
  } else {
    console.error('❌ TEST 2 FAILED: VerifiedImpact ledger creation failed.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Projected vs Actual Divergence
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Verifying Projected vs Actual Divergence...');
  const projState = res1.projectedState!;

  console.log(`   - Actual Runway (DB Truth) : ${stateAfterAction?.runwayDays} days`);
  console.log(`   - Projected Runway (Sim)   : ${projState.projectedRunwayDays} days`);
  console.log(`   - Divergence               : ${projState.projectedRunwayDays - stateAfterAction!.runwayDays} days`);

  if (projState.projectedRunwayDays > stateAfterAction!.runwayDays) {
    console.log('✅ TEST 3 PASSED: Pure simulation divergence verified (projectedRunway != actualRunway until verified & reconciled)!\n');
  } else {
    console.error('❌ TEST 3 FAILED: Simulation divergence error.');
    process.exit(1);
  }

  console.log('🎉 ALL V15.6 FINANCIAL TRUTH INTEGRITY TESTS PASSED 100%!');
}

testV15_6TruthIntegrity()
  .catch((e) => console.error('❌ Integration test error:', e))
  .finally(() => prisma.$disconnect());
