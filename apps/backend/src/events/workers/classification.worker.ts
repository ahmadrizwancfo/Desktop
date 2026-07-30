import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ClassificationWorker {
  private readonly logger = new Logger(ClassificationWorker.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Idempotent & Atomic Fast-Layer Classification Worker:
   * Prevents double-counting under retries, duplicate events, and concurrent race conditions.
   */
  @OnEvent('transaction.ingested')
  async handleTransactionIngested(payload: {
    transactionId?: string;
    organizationId: string;
    amount?: number;
    type?: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME';
    transactions?: Array<{ id?: string; transactionId?: string; amount: number; type: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME' }>;
    eventId?: string;
  }) {
    const { organizationId } = payload;

    // Handle batch by converting to per-transaction processing calls
    if (payload.transactions && payload.transactions.length > 0) {
      for (const tx of payload.transactions) {
        await this.processSingleTransaction({
          transactionId: tx.id || tx.transactionId || randomUUID(),
          organizationId,
          amount: Number(tx.amount),
          type: tx.type,
        });
      }
      return;
    }

    if (!payload.transactionId || payload.amount === undefined || !payload.type) {
      return;
    }

    await this.processSingleTransaction({
      transactionId: payload.transactionId,
      organizationId,
      amount: Number(payload.amount),
      type: payload.type,
    });
  }

  /**
   * Atomic Prisma transaction executing Idempotency Check + Incremental State Update + Processed Marker Insertion.
   */
  public async processSingleTransaction(item: {
    transactionId: string;
    organizationId: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME';
  }) {
    const { transactionId, organizationId, amount, type } = item;
    const isDebit = type === 'DEBIT' || type === 'EXPENSE';
    const isCredit = type === 'CREDIT' || type === 'INCOME';

    try {
      const result = await this.prisma.$transaction(async (txDb) => {
        // 1. Idempotency Check (Prevent Double Counting)
        const alreadyProcessed = await txDb.processedTransaction.findUnique({
          where: {
            transactionId_organizationId: {
              transactionId,
              organizationId,
            },
          },
        });

        if (alreadyProcessed) {
          this.logger.warn(`🛡️ Idempotent Skip: Transaction ${transactionId} already processed for org ${organizationId}`);
          return null;
        }

        // 2. Atomic Incremental Update with Version Counter
        const updatedState = await txDb.orgFinancialState.upsert({
          where: { organizationId },
          update: {
            debitSum30d: isDebit ? { increment: amount } : undefined,
            creditSum30d: isCredit ? { increment: amount } : undefined,
            monthlyBurn: isDebit ? { increment: amount } : undefined,
            monthlyRevenue: isCredit ? { increment: amount } : undefined,
            version: { increment: 1 },
            isPartialState: true,
          },
          create: {
            organizationId,
            debitSum30d: isDebit ? amount : 0,
            creditSum30d: isCredit ? amount : 0,
            monthlyBurn: isDebit ? amount : 0,
            monthlyRevenue: isCredit ? amount : 0,
            version: 1,
            isPartialState: true,
          },
        });

        // 3. Insert Processed Marker
        await txDb.processedTransaction.create({
          data: {
            transactionId,
            organizationId,
          },
        });

        return updatedState;
      });

      if (result) {
        // Emit state.partial_updated with version tracking
        this.eventEmitter.emit('state.partial_updated', {
          eventId: randomUUID(),
          timestamp: Date.now(),
          organizationId,
          transactionId,
          version: result.version,
          updatedFields: ['monthlyBurn', 'monthlyRevenue'],
          monthlyBurn: Number(result.monthlyBurn),
          monthlyRevenue: Number(result.monthlyRevenue),
          isPartialState: true,
        });
      }

    } catch (error) {
      this.logger.error(`❌ Atomic classification error for tx ${transactionId}: ${error.message}`);
      throw error;
    }
  }

  @OnEvent('transaction.classified')
  async handleSingleClassification(payload: {
    transactionId?: string;
    organizationId: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME';
  }) {
    await this.processSingleTransaction({
      transactionId: payload.transactionId || randomUUID(),
      organizationId: payload.organizationId,
      amount: payload.amount,
      type: payload.type,
    });
  }
}
