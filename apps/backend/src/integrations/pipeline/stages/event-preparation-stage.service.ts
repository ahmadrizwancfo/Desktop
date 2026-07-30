import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { PipelineStageResult } from '../pipeline-types.interface';

export interface DownstreamIntegrationEvent {
  eventName: string;
  organizationId: string;
  payload: {
    transactionId: string;
    amount: number;
    direction: 'INFLOW' | 'OUTFLOW';
    category: string;
    date: string;
    sourceProvider: string;
    gstAmount?: number;
    tdsAmount?: number;
  };
}

@Injectable()
export class EventPreparationStage {
  private readonly logger = new Logger(EventPreparationStage.name);

  prepareTransactionEvents(tx: CanonicalTransaction): PipelineStageResult<DownstreamIntegrationEvent[]> {
    const events: DownstreamIntegrationEvent[] = [
      {
        eventName: 'live.state.update',
        organizationId: tx.organizationId,
        payload: {
          transactionId: tx.internalTransactionId,
          amount: tx.amount,
          direction: tx.direction,
          category: tx.category,
          date: tx.transactionDate.toISOString(),
          sourceProvider: tx.sourceProvider,
          gstAmount: tx.gstMetadata?.cgstAmount ? (tx.gstMetadata.cgstAmount + tx.gstMetadata.sgstAmount + tx.gstMetadata.igstAmount) : 0,
          tdsAmount: tx.tdsMetadata?.tdsAmount || 0,
        },
      },
      {
        eventName: 'rag.embedding.index',
        organizationId: tx.organizationId,
        payload: {
          transactionId: tx.internalTransactionId,
          amount: tx.amount,
          direction: tx.direction,
          category: tx.category,
          date: tx.transactionDate.toISOString(),
          sourceProvider: tx.sourceProvider,
        },
      },
    ];

    return { success: true, data: events };
  }
}
