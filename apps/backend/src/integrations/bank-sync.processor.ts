import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SyncEngineService } from './sync-engine.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface BankSyncJobData {
    connectionId?: string;
    organizationId: string;
    userId: string;
    syncType: 'HOURLY' | 'DAILY_DEEP' | 'MANUAL';
}

@Processor('bank-sync-queue')
export class BankSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(BankSyncProcessor.name);

    constructor(
        private readonly syncEngineService: SyncEngineService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super();
    }

    async process(job: Job<BankSyncJobData>): Promise<{ success: boolean; connectionId?: string }> {
        this.logger.log(`Starting Bank Sync Job ${job.id} for Org ${job.data.organizationId} [SyncType: ${job.data.syncType}]`);
        const { syncType, connectionId, organizationId } = job.data;

        await this.syncEngineService.runSyncPipeline(syncType, connectionId);

        // Emit push event to trigger SSE push stream updates
        this.eventEmitter.emit('bank.sync.completed', {
            organizationId,
            syncType,
            jobId: job.id,
            timestamp: new Date().toISOString(),
        });

        return { success: true, connectionId };
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<BankSyncJobData>) {
        this.logger.log(`Bank Sync Job ${job.id} for Org ${job.data.organizationId} completed successfully.`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<BankSyncJobData> | undefined, error: Error) {
        this.logger.error(
            `Bank Sync Job ${job?.id || 'unknown'} FAILED (Attempt ${job?.attemptsMade || 0}/${job?.opts?.attempts || 3}): ${error.message}`,
            error.stack
        );
    }
}
