import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { CanonicalAccount } from '../../domain/canonical-account.schema';
import { CanonicalInvoice } from '../../domain/canonical-invoice.schema';
import { PipelineStageResult } from '../pipeline-types.interface';

export interface PreparedPrismaTransaction {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  date: Date;
  bankAccountId: string;
  source: string;
  externalId: string;
  metadata: Record<string, any>;
}

@Injectable()
export class PersistencePreparationStage {
  private readonly logger = new Logger(PersistencePreparationStage.name);

  prepareTransaction(tx: CanonicalTransaction): PipelineStageResult<PreparedPrismaTransaction> {
    const prismaType = tx.direction === 'INFLOW' ? 'INCOME' : 'EXPENSE';

    const preparedData: PreparedPrismaTransaction = {
      amount: tx.amount,
      type: prismaType,
      category: tx.category,
      description: tx.description || tx.counterpartyName || 'General Transaction',
      date: new Date(tx.transactionDate),
      bankAccountId: tx.bankAccountId,
      source: tx.sourceProvider,
      externalId: tx.externalTransactionId,
      metadata: {
        idempotencyHash: tx.idempotencyHash,
        counterpartyGstin: tx.counterpartyGstin,
        subCategory: tx.subCategory,
        tags: tx.tags,
        gstMetadata: tx.gstMetadata,
        tdsMetadata: tx.tdsMetadata,
        confidenceScore: tx.confidenceScore,
        reconciliationStatus: tx.reconciliationStatus,
      },
    };

    return { success: true, data: preparedData };
  }
}
