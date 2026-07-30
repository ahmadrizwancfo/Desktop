import {
    Controller,
    Post,
    Get,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    NotFoundException,
    Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { OcrReviewService } from './ocr-review.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Controller('ocr')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OcrController {
    private readonly uploadDir: string;

    constructor(
        @InjectQueue('ocr-queue') private readonly ocrQueue: Queue,
        private readonly ocrReviewService: OcrReviewService,
    ) {
        this.uploadDir = path.join(process.cwd(), 'scratch', 'uploads', 'ocr');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Enqueue image or PDF file for async OCR processing using disk storage reference pattern
     */
    @Post('extract')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard limit
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/tiff',
                'application/pdf',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, TIFF, PDF.`), false);
            }
        },
    }))
    async enqueueExtractJob(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const fileExt = path.extname(file.originalname) || '.bin';
        const tempFileName = `ocr_${user.organizationId}_${randomUUID()}${fileExt}`;
        const tempFilePath = path.join(this.uploadDir, tempFileName);

        fs.writeFileSync(tempFilePath, file.buffer);

        const isPdf = file.mimetype === 'application/pdf';

        const job = await this.ocrQueue.add(
            'extract-text',
            {
                filePath: tempFilePath,
                filename: file.originalname,
                mimeType: file.mimetype,
                isPdf,
                organizationId: user.organizationId,
                userId: user.id,
            },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400, count: 1000 },
            }
        );

        return {
            success: true,
            jobId: job.id,
            status: 'queued',
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };
    }

    /**
     * Track status & result of an OCR processing job
     */
    @Get('status/:jobId')
    @Throttle({ default: { limit: 60, ttl: 60000 } })
    async getJobStatus(@Param('jobId') jobId: string, @GetUser() user: any) {
        const job = await this.ocrQueue.getJob(jobId);
        if (!job) {
            throw new NotFoundException(`OCR Job ${jobId} not found or expired`);
        }

        if (job.data.organizationId !== user.organizationId || job.data.userId !== user.id) {
            throw new NotFoundException(`OCR Job ${jobId} not found`);
        }

        const state = await job.getState();
        const returnvalue = job.returnvalue;
        const failedReason = job.failedReason;

        return {
            jobId: job.id,
            status: state,
            progress: job.progress,
            attemptsMade: job.attemptsMade,
            result: state === 'completed' ? returnvalue : null,
            error: state === 'failed' ? failedReason : null,
            createdTimestamp: job.timestamp,
            finishedTimestamp: job.finishedOn,
        };
    }

    /**
     * Manual OCR Review Queue Endpoint (Fetch low-confidence items)
     */
    @Get('review-queue')
    async getReviewQueue(@GetUser() user: any) {
        const items = await this.ocrReviewService.getReviewQueue(user.organizationId);
        return { success: true, count: items.length, items };
    }

    /**
     * Approve a low-confidence OCR item, pushing it into vector embeddings & AI pipeline
     */
    @Post('review/:id/approve')
    async approveReviewItem(@Param('id') id: string, @GetUser() user: any) {
        return await this.ocrReviewService.approveReviewItem(id, user.organizationId);
    }

    /**
     * Reject a low-confidence OCR item
     */
    @Post('review/:id/reject')
    async rejectReviewItem(@Param('id') id: string, @GetUser() user: any) {
        return await this.ocrReviewService.rejectReviewItem(id, user.organizationId);
    }
}
