import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface AiProcessingJobData {
    taskType: 'GENERATE_DAILY_BRIEF' | 'RECALCULATE_METRICS' | 'ANALYZE_STATEMENTS';
    organizationId: string;
    userId?: string;
    payload?: any;
}

@Processor('ai-processing-queue')
export class AiProcessingProcessor extends WorkerHost {
    private readonly logger = new Logger(AiProcessingProcessor.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) {
        super();
    }

    async process(job: Job<AiProcessingJobData>): Promise<{ success: boolean; taskType: string }> {
        this.logger.log(`Starting AI Processing Job ${job.id} [Task: ${job.data.taskType}] for Org ${job.data.organizationId}`);
        const { taskType, organizationId } = job.data;

        // Emit push event to trigger SSE push stream updates
        this.eventEmitter.emit('ai.processing.completed', {
            organizationId,
            taskType,
            jobId: job.id,
            timestamp: new Date().toISOString(),
        });

        return { success: true, taskType };
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<AiProcessingJobData>) {
        this.logger.log(`AI Processing Job ${job.id} (${job.data.taskType}) completed successfully.`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<AiProcessingJobData> | undefined, error: Error) {
        this.logger.error(
            `AI Processing Job ${job?.id || 'unknown'} FAILED (Attempt ${job?.attemptsMade || 0}/${job?.opts?.attempts || 3}): ${error.message}`,
            error.stack
        );
    }
}
