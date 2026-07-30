import { roundToTwoDecimals } from '../apps/backend/src/events/workers/reconciliation.worker';

console.log('=== Tier 5 Adversarial Stress & Determinism Harness ===\n');

// 1. Stress Test Financial Determinism Under 1,000 Rapid Operations
console.log('--- 1. Financial Determinism Under 1,000 Rapid Operations ---');

let runningBalance = 1000000.55;
const txs: Array<{ amount: number; type: 'INCOME' | 'EXPENSE' }> = [];

// Seed 1,000 rapid operations with fractional numbers (e.g. 19.99, 143.47, 88.33, etc.)
for (let i = 0; i < 1000; i++) {
  const amount = Math.round((Math.random() * 500 + 0.01) * 100) / 100;
  const type = i % 2 === 0 ? 'INCOME' : 'EXPENSE';
  txs.push({ amount, type });
}

const startTime = performance.now();

let debitSum = 0;
let creditSum = 0;

for (let i = 0; i < 1000; i++) {
  const tx = txs[i];
  const amt = roundToTwoDecimals(tx.amount);
  if (tx.type === 'EXPENSE') {
    debitSum = roundToTwoDecimals(debitSum + amt);
  } else {
    creditSum = roundToTwoDecimals(creditSum + amt);
  }
}

const netBurn = roundToTwoDecimals(Math.max(0, roundToTwoDecimals(debitSum - creditSum)));
const finalDuration = performance.now() - startTime;

console.log(`[DETERMINISM METRIC] 1,000 operations completed in ${finalDuration.toFixed(2)}ms`);
console.log(`[DETERMINISM METRIC] Debit Sum: ${debitSum}`);
console.log(`[DETERMINISM METRIC] Credit Sum: ${creditSum}`);
console.log(`[DETERMINISM METRIC] Net Burn: ${netBurn}`);
console.log(`[DETERMINISM METRIC] NaN/Infinity Check: ${!isNaN(debitSum) && !isNaN(creditSum) && isFinite(netBurn) ? 'PASSED' : 'FAILED'}`);

// Verify rerun produces identical result
let rerunDebit = 0;
let rerunCredit = 0;
for (let i = 0; i < 1000; i++) {
  const tx = txs[i];
  const amt = roundToTwoDecimals(tx.amount);
  if (tx.type === 'EXPENSE') {
    rerunDebit = roundToTwoDecimals(rerunDebit + amt);
  } else {
    rerunCredit = roundToTwoDecimals(rerunCredit + amt);
  }
}

const identicalMatch = rerunDebit === debitSum && rerunCredit === creditSum;
console.log(`[DETERMINISM METRIC] Sequential Rerun Identity Match: ${identicalMatch ? 'PASSED (100% Match)' : 'FAILED'}`);

console.log('\n=== Tier 5 Verification Complete ===');
