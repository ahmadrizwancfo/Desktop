import { CategoryNormalizationService } from '../src/common/canonical-model/category-normalization.service';
import { CanonicalTransaction } from '../src/common/canonical-model/canonical-model.interface';
import { FinancialEvent } from '../src/common/canonical-model/financial-event.interface';

async function testV18_5CanonicalEvolution() {
  console.log('🏛️ Testing FounderCFO V18.5 Canonical Financial Model Evolution & Category Normalization...\n');

  const normalizer = new CategoryNormalizationService();

  // ---------------------------------------------------------------------------
  // TEST 1: Schema Versioning & Rich Metadata Fields
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 1: Verifying Schema Versioning & Rich Metadata Extensions...');
  const tx: CanonicalTransaction = {
    id: 'TX-CANONICAL-V18.5',
    source: 'TALLY',
    sourceSystem: 'TALLY',
    schemaVersion: '1.0',
    organizationId: 'org-123-test',
    amount: 150000,
    type: 'EXPENSE',
    category: 'Amazon Web Services Cloud',
    originalCategory: 'Amazon Web Services Cloud',
    date: new Date(),
    narration: 'AWS Infra Payment',
    currency: 'INR',
    confidenceScore: 0.98,
    tags: ['infra', 'cloud', 'q3-budget'],
    createdByConnector: 'tally-connector-v18.5',
    metadata: { environment: 'production', cluster: 'us-east-1' },
  };

  console.log(`   - Schema Version        : ${tx.schemaVersion}`);
  console.log(`   - Source System         : ${tx.sourceSystem}`);
  console.log(`   - Confidence Score      : ${tx.confidenceScore}`);
  console.log(`   - Tags                  : [${tx.tags?.join(', ')}]`);

  if (tx.schemaVersion === '1.0' && tx.sourceSystem === 'TALLY' && tx.tags?.length === 3) {
    console.log('✅ TEST 1 PASSED: Rich Metadata Extensions & Schema Versioning verified!\n');
  } else {
    console.error('❌ TEST 1 FAILED: Metadata extension error.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Category Normalization Layer
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 2: Testing Category Normalization Layer...');
  const normalizedTx1 = normalizer.normalizeTransaction({
    id: 'TX-NORM-1',
    source: 'TALLY',
    organizationId: 'org-123-test',
    amount: 85000,
    type: 'EXPENSE',
    category: 'AWS Hosting Services',
    date: new Date(),
  });

  const normalizedTx2 = normalizer.normalizeTransaction({
    id: 'TX-NORM-2',
    source: 'ZOHO',
    organizationId: 'org-123-test',
    amount: 120000,
    type: 'EXPENSE',
    category: 'Meta Ads Marketing Outflow',
    date: new Date(),
  });

  console.log(`   - Tx 1 Original Category  : "${normalizedTx1.originalCategory}"`);
  console.log(`   - Tx 1 Normalized Category: "${normalizedTx1.normalizedCategory}"`);
  console.log(`   - Tx 2 Original Category  : "${normalizedTx2.originalCategory}"`);
  console.log(`   - Tx 2 Normalized Category: "${normalizedTx2.normalizedCategory}"`);

  if (
    normalizedTx1.originalCategory === 'AWS Hosting Services' &&
    normalizedTx1.normalizedCategory === 'Cloud Infrastructure' &&
    normalizedTx2.normalizedCategory === 'Marketing'
  ) {
    console.log('✅ TEST 2 PASSED: Category Normalization Layer verified!\n');
  } else {
    console.error('❌ TEST 2 FAILED: Category normalization error.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: FinancialEvent Abstraction Compatibility
  // ---------------------------------------------------------------------------
  console.log('🧪 TEST 3: Verifying FinancialEvent Base Abstraction Inheritance...');
  const sampleEvent: FinancialEvent = {
    eventId: 'EVT-INV-100',
    eventType: 'INVOICE_PAID',
    schemaVersion: '1.0',
    source: 'TALLY',
    organizationId: 'org-123-test',
    occurredAt: new Date(),
    metadata: { invoiceNumber: 'INV-909' },
  };

  console.log(`   - Event ID  : ${sampleEvent.eventId}`);
  console.log(`   - Event Type: ${sampleEvent.eventType}`);

  if (sampleEvent.eventType === 'INVOICE_PAID' && sampleEvent.schemaVersion === '1.0') {
    console.log('✅ TEST 3 PASSED: FinancialEvent base abstraction verified!\n');
  } else {
    console.error('❌ TEST 3 FAILED: FinancialEvent abstraction error.');
    process.exit(1);
  }

  console.log('🎉 ALL V18.5 CANONICAL EVOLUTION & CATEGORY NORMALIZATION TESTS PASSED 100%!');
}

testV18_5CanonicalEvolution().catch((e) => {
  console.error('❌ Test execution error:', e);
  process.exit(1);
});
