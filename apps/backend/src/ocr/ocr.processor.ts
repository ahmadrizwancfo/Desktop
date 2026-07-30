import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OcrService, OcrResult } from './ocr.service';
import { OcrReviewService } from './ocr-review.service';
import * as fs from 'fs';

export interface OcrJobData {
    filePath: string;
    filename: string;
    mimeType: string;
    isPdf: boolean;
    organizationId: string;
    userId: string;
}

@Processor('ocr-queue')
export class OcrProcessor extends WorkerHost {
    private readonly logger = new Logger(OcrProcessor.name);

    constructor(
        private readonly ocrService: OcrService,
        private readonly ocrReviewService: OcrReviewService,
    ) {
        super();
    }

    async process(job: Job<OcrJobData>): Promise<any> {
        this.logger.log(`Starting OCR Job ${job.id} (Attempt ${job.attemptsMade + 1}) for file ${job.data.filename} [Org: ${job.data.organizationId}]`);
        const { filePath, isPdf, filename, organizationId, userId } = job.data;

        if (!fs.existsSync(filePath)) {
            throw new Error(`OCR storage file not found at path: ${filePath}`);
        }

        try {
            let result: OcrResult;
            if (isPdf) {
                result = await this.ocrService.extractTextFromPdf(filePath);
            } else {
                result = await this.ocrService.extractTextFromImage(filePath);
            }

            // Route through OCR Review Service Ingestion Gate (Confidence <0.85 -> Review Queue)
            const gateResult = await this.ocrReviewService.processIngestionGate({
                organizationId,
                userId,
                filename,
                rawText: result.text,
            });

            return {
                ocrResult: result,
                gateResult,
            };
        } finally {
            // Clean up temporary disk storage file after processing
            this.cleanupTempFile(filePath);
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<OcrJobData>, result: any) {
        this.logger.log(`OCR Job ${job.id} completed successfully (Gate Status: ${result?.gateResult?.status})`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<OcrJobData> | undefined, error: Error) {
        this.logger.error(
            `OCR Job ${job?.id || 'unknown'} FAILED (Attempt ${job?.attemptsMade || 0}/${job?.opts?.attempts || 3}): ${error.message}`,
            error.stack
        );
        if (job?.data?.filePath) {
            this.cleanupTempFile(job.data.filePath);
        }
    }

    private cleanupTempFile(filePath: string) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`Cleaned up temp OCR file: ${filePath}`);
            }
        } catch (err: any) {
            this.logger.warn(`Failed to clean up temp OCR file ${filePath}: ${err.message}`);
        }
    }
}
