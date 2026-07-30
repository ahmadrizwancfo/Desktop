import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { PipelineStageResult } from '../pipeline-types.interface';

@Injectable()
export class NormalizationStage {
  private readonly logger = new Logger(NormalizationStage.name);

  // Static Reference Exchange Rates to INR for Multi-Currency Normalization
  private readonly exchangeRatesToInr: Record<string, number> = {
    INR: 1.0,
    USD: 83.5,
    EUR: 90.2,
    GBP: 106.4,
    AED: 22.7,
    SGD: 62.1,
  };

  normalizeTransaction(tx: CanonicalTransaction): PipelineStageResult<CanonicalTransaction> {
    const warnings: string[] = [];

    // 1. Timezone & Date Normalization
    const normalizedTxDate = new Date(tx.transactionDate);
    const normalizedSettlementDate = tx.settlementDate ? new Date(tx.settlementDate) : undefined;

    // 2. Currency Normalization (Convert foreign currency to INR base amount)
    let normalizedAmount = tx.amount;
    const currencyUpper = (tx.currency || 'INR').toUpperCase();
    
    if (currencyUpper !== 'INR') {
      const rate = this.exchangeRatesToInr[currencyUpper] || 1.0;
      normalizedAmount = Number((tx.amount * rate).toFixed(2));
      warnings.push(`Converted foreign currency ${currencyUpper} ${tx.amount} to INR ${normalizedAmount} at rate ${rate}`);
    }

    // 3. Direction & Type Alignment
    let direction = tx.direction;
    if (!direction) {
      direction = tx.transactionType === 'CREDIT' || tx.transactionType === 'REFUND' ? 'INFLOW' : 'OUTFLOW';
    }

    // 4. Description, Merchant & Narration Sanitization
    const rawDesc = tx.description || tx.counterpartyName || '';
    const cleanedDesc = this.cleanNarrationText(rawDesc);
    const cleanedCounterparty = this.cleanMerchantName(tx.counterpartyName, rawDesc);

    // 5. Internal Bank-to-Bank Transfer Detection
    let transactionType = tx.transactionType;
    const descUpper = rawDesc.toUpperCase();
    if (
      descUpper.includes('SELF TRANSFER') ||
      descUpper.includes('OWN ACCOUNT') ||
      descUpper.includes('SWEEP IN') ||
      descUpper.includes('SWEEP OUT') ||
      descUpper.includes('INTER-ACCOUNT')
    ) {
      transactionType = 'INTERNAL_TRANSFER';
      warnings.push('Detected internal bank-to-bank account transfer');
    }

    const normalizedTx: CanonicalTransaction = {
      ...tx,
      amount: normalizedAmount,
      currency: 'INR',
      direction,
      transactionType,
      transactionDate: normalizedTxDate,
      settlementDate: normalizedSettlementDate,
      description: cleanedDesc,
      counterpartyName: cleanedCounterparty,
      updatedAt: new Date(),
    };

    return { success: true, data: normalizedTx, warnings };
  }

  /**
   * Cleans Indian bank transaction narrations by stripping raw UPI IDs, NEFT/IMPS reference numbers.
   * e.g. "UPI/412398129/PAYTM/ACME CORP/ICICI" -> "ACME CORP"
   */
  cleanNarrationText(narration: string): string {
    if (!narration) return 'General Transaction';

    let clean = narration
      .replace(/UPI\/\d+\/[^\/]+\/([^\/]+)\/.*/i, '$1') // Extract merchant from UPI string
      .replace(/NEFT-[A-Z0-9]+-/i, '')
      .replace(/IMPS\/\d+\//i, '')
      .replace(/POS\s+\d+\s+/i, '')
      .replace(/ACH\s+D-/i, '')
      .replace(/INB\/[A-Z0-9]+\//i, '')
      .trim();

    // Remove multiple consecutive spaces
    clean = clean.replace(/\s+/g, ' ');
    return clean || narration;
  }

  /**
   * Derives a clean human-readable merchant/counterparty name.
   */
  cleanMerchantName(counterparty: string, narration: string): string {
    if (counterparty && counterparty !== 'UNKNOWN' && counterparty.trim().length > 0) {
      return counterparty.trim();
    }
    return this.cleanNarrationText(narration);
  }
}
