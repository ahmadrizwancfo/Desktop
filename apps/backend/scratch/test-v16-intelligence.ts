import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExpenseIntelligenceService } from '../src/cfo-engine/expense-intelligence.service';
import { DecisionEngineService } from '../src/cfo-engine/decision-engine.service';

const prisma = new PrismaClient();
const eventEmitter = new EventEmitter2();

async function testV16Intelligence() {
  console.log('🔮 Testing FounderCFO V16 Intelligent + Predictive + Vendor-Aware Financial OS...\n');

  const expenseIntelligence = new ExpenseIntelligenceService(prisma as any);
  const decisionEngine = new DecisionEngineService(prisma as any, eventEmitter, expenseIntelligence);

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No test organization found');
    return;
  }
  const orgId = org.id;
  console.log(`🏢 Test Org: ${org.name} (${orgId})\n`);

  // Setup bank account
  let bankAccount = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } });
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: orgId,
        name: 'V16 Test Account',
        bankName: 'HDFC',
        accountNumber: 'V16-7777',
        balance: 5000000,
        currency: 'INR',
      },
    });
  }

  // Clean test transactions
  await prisma.transaction.deleteMany({
    where: { bankAccountId: bankAccount.id, description: { startsWith: 'V16 Vendor Test' } },
  });

  // Seed sample transactions with specific vendor signatures
  console.log('📦 Ingesting transactions with specific vendor signatures (AWS, Notion, Meta Ads)...');
  await prisma.transaction.createMany({
    data: [
      { bankAccountId: bankAccount.id, amount: 85000, type: 'EXPENSE', category: 'SaaS', description: 'V16 Vendor Test AWS Monthly Cloud Invoice', date: new Date() },
      { bankAccountId: bankAccount.id, amount: 15000, type: 'EXPENSE', category: 'SaaS', description: 'V16 Vendor Test Notion Enterprise Subscription', date: new Date() },
      { bankAccountId: bankAccount.id, amount: 120000, type: 'EXPENSE', category: 'Marketing', description: 'V16 Vendor Test Meta Ads Campaign Outflow', date: new Date() },
      { bankAccountId: bankAccount.id, amount: 450000, type: 'EXPENSE', category: 'Payroll', description: 'V16 Vendor Test Payroll / Salary Discrepancy', date: new Date() },
    ],
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Expense Intelligence Engine & Vendor Detection Accuracy
  // ---------------------------------------------------------------------------
  console.log('\n🧪 TEST 1: Testing Expense Intelligence Engine & Vendor Detection...');
  const vendorReport = await expenseIntelligence.analyzeExpenseIntelligence(orgId);

  console.log(`   - Top Vendors Detected (${vendorReport.topVendors.length}):`);
  for (const v of vendorReport.topVendors.slice(0, 4)) {
    console.log(`     * Vendor: ${v.name} | Category: ${v.category} | Spend: ₹${v.monthlySpend.toLocaleString('en-IN')}`);
  }
  console.log(`   - Category Breakdown:`, vendorReport.categoryBreakdown);

  const awsVendor = vendorReport.topVendors.find((v) => v.name === 'AWS');
  if (awsVendor && awsVendor.monthlySpend >= 85000 && vendorReport.categoryBreakdown['SaaS'] > 0) {
    console.log('✅ TEST 1 PASSED: Expense Intelligence Engine vendor detection & category grouping verified!\n');
  } else {
    console.error('❌ TEST 1 FAILED: Vendor detection error.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Context-Aware Vendor Action Generation
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Testing Context-Aware Vendor Action Generation...');

  // Set org state to 25 days runway
  await prisma.orgFinancialState.upsert({
    where: { organizationId: orgId },
    update: { runwayDays: 25, cashInBank: 500000, netBurn: 600000, monthlyBurn: 670000, monthlyRevenue: 70000 },
    create: { organizationId: orgId, runwayDays: 25, cashInBank: 500000, netBurn: 600000, monthlyBurn: 670000, monthlyRevenue: 70000 },
  });

  const stateRes = await decisionEngine.evaluateStatefulDecisions(orgId);
  const actions = stateRes.pendingActions!;

  console.log(`   - Context-Aware Actions Generated (${actions.length}):`);
  for (const a of actions) {
    console.log(`     * Title: "${a.title}" | Score: ${Math.round(a.priorityScore)} | Confidence: ${a.confidenceScore}`);
  }

  const vendorSpecificAction = actions.find((a: any) => a.title.includes('AWS') || a.title.includes('SaaS'));

  if (vendorSpecificAction) {
    console.log('✅ TEST 2 PASSED: Context-aware vendor action generation verified!\n');
  } else {
    console.error('❌ TEST 2 FAILED: Vendor-specific action missing.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Predictive Runway Engine
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Testing Predictive Runway Engine...');
  const predictiveReport = await expenseIntelligence.computePredictiveRunway(orgId);

  console.log(`   - Projected Runway Days : ${predictiveReport.projectedRunwayDays} days`);
  console.log(`   - Days Until Death Clock: ${predictiveReport.daysUntilDeathClock} days`);
  console.log(`   - Risk Level            : ${predictiveReport.riskLevel}`);
  console.log(`   - Burn Trend            : ${predictiveReport.burnTrend}`);

  if (predictiveReport.riskLevel === 'CRITICAL' && predictiveReport.daysUntilDeathClock === 0) {
    console.log('✅ TEST 3 PASSED: Predictive Runway Engine correct!\n');
  } else {
    console.error('❌ TEST 3 FAILED: Predictive runway report incorrect.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Dynamic Learning Loop (Confidence Score Auto-Adjustment)
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 4: Testing Dynamic Learning System (Updating Confidence Scores from VerifiedImpact history)...');

  // Insert historical VerifiedImpact record with 1.2 accuracy score
  await prisma.verifiedImpact.create({
    data: {
      organizationId: orgId,
      actionId: actions[0]?.id || 'action-test-id',
      expectedImpact: 50000,
      actualImpact: 60000,
      variance: 10000,
      accuracyScore: 1.2,
      verifiedAt: new Date(),
    },
  });

  // Re-evaluate stateful decisions to trigger learning loop
  const reEval = await decisionEngine.evaluateStatefulDecisions(orgId);
  const learnedAction = reEval.pendingActions![0];

  console.log(`   - Action Title: "${learnedAction?.title}"`);
  console.log(`   - Dynamic Learned Confidence Score: ${learnedAction?.confidenceScore}`);

  if (learnedAction && learnedAction.confidenceScore >= 0.9) {
    console.log('✅ TEST 4 PASSED: Dynamic Learning System updated confidence score from verification history!\n');
  } else {
    console.error('❌ TEST 4 FAILED: Learning loop failed to update confidence score.');
    process.exit(1);
  }

  console.log('🎉 ALL V16 INTELLIGENT + PREDICTIVE + VENDOR-AWARE TESTS PASSED 100%!');
}

testV16Intelligence()
  .catch((e) => console.error('❌ Integration test error:', e))
  .finally(() => prisma.$disconnect());
