import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { PipelineStageResult } from '../pipeline-types.interface';
import crypto from 'crypto';

export interface DuplicateDetectionResult extends PipelineStageResult<CanonicalTransaction> {
  isDuplicate: boolean;
  duplicateConfidenceScore: number;
  existingId?: string;
  reason?: string;
}

@Injectable()
export class DuplicateDetectionStage {
  private readonly logger = new Logger(DuplicateDetectionStage.name);

  /**
   * Generates a deterministic SHA-256 idempotency hash for a transaction.
   */
  generateHash(tx: Partial<CanonicalTransaction>): string {
    const rawStr = `${tx.organizationId}:${tx.sourceProvider}:${tx.externalTransactionId}:${tx.amount}:${tx.transactionDate?.toISOString().slice(0, 10)}`;
    return crypto.createHash('sha256').update(rawStr).digest('hex');
  }

  /**
   * Detect duplicates against an optional array of previously processed or existing DB transactions.
   */
  detectDuplicates(
    tx: CanonicalTransaction,
    existingTransactions: CanonicalTransaction[] = []
  ): DuplicateDetectionResult {
    // 1. Ensure idempotencyHash is populated
    const hash = tx.idempotencyHash || this.generateHash(tx);
    const txWithHash = { ...tx, idempotencyHash: hash };

    // 2. Exact Idempotency Hash or External ID Match (100% Confidence)
    const exactMatch = existingTransactions.find(
      e => e.idempotencyHash === hash || (e.externalTransactionId && e.externalTransactionId === tx.externalTransactionId)
    );

    if (exactMatch) {
      return {
        success: true,
        data: txWithHash,
        isDuplicate: true,
        duplicateConfidenceScore: 1.0,
        existingId: exactMatch.internalTransactionId,
        reason: `Exact match found for externalId: ${tx.externalTransactionId} or idempotencyHash: ${hash}`,
      };
    }

    // 3. Near-Duplicate Detection (Date within +/- 1 day, exact amount, matching counterparty)
    const txTime = new Date(tx.transactionDate).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const nearMatch = existingTransactions.find(e => {
      const eTime = new Date(e.transactionDate).getTime();
      const isDateClose = Math.abs(txTime - eTime) <= oneDayMs;
      const isAmountEqual = Math.abs(e.amount - tx.amount) < 0.01;
      const isPartySimilar = e.counterpartyName?.toUpperCase() === tx.counterpartyName?.toUpperCase();
      return isDateClose && isAmountEqual && isPartySimilar;
    });

    if (nearMatch) {
      return {
        success: true,
        data: txWithHash,
        isDuplicate: true,
        duplicateConfidenceScore: 0.85,
        existingId: nearMatch.internalTransactionId,
        reason: `Near duplicate detected (Same amount ${tx.amount}, date within 24h, matching counterparty ${tx.counterpartyName})`,
      };
    }

    return {
      success: true,
      data: txWithHash,
      isDuplicate: false,
      duplicateConfidenceScore: 0.0,
    };
  }
}
