import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentParserService, ParsedFinancialDocument } from '../ai/parsing/document-parser.service';

@Injectable()
export class OcrReviewService {
    private readonly logger = new Logger(OcrReviewService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly parserService: DocumentParserService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Evaluates OCR document confidence score.
     * If confidenceScore < 0.85 -> Stores in OcrReviewItem table and requires manual review.
     * If confidenceScore >= 0.85 -> Automatically emits ocr.completed event.
     */
    async processIngestionGate(params: {
        organizationId: string;
        userId: string;
        filename: string;
        rawText: string;
    }) {
        const { organizationId, userId, filename, rawText } = params;
        this.logger.log(`Evaluating OCR Ingestion Gate for Org ${organizationId} (File: ${filename})`);

        const parsedDoc: ParsedFinancialDocument = this.parserService.parseOcrText(rawText, filename);

        if (parsedDoc.confidenceScore < 0.85) {
            this.logger.warn(`⚠️ Low Confidence Score (${parsedDoc.confidenceScore} < 0.85) for ${filename}. Sending to Review Queue...`);
            
            const reviewItem = await this.prisma.ocrReviewItem.create({
                data: {
                    organizationId,
                    userId,
                    filename,
                    rawText,
                    parsedData: parsedDoc as any,
                    confidenceScore: parsedDoc.confidenceScore,
                    status: 'REVIEW_REQUIRED',
                },
            });

            return {
                status: 'REVIEW_REQUIRED',
                message: 'OCR confidence score is below 85%. Document routed to manual review queue.',
                reviewItemId: reviewItem.id,
                parsedDoc,
            };
        }

        // High Confidence (>= 0.85): Direct Automation Pipeline Execution
        this.logger.log(`✅ High Confidence Score (${parsedDoc.confidenceScore} >= 0.85). Triggering ocr.completed event...`);
        this.eventEmitter.emit('ocr.completed', {
            organizationId,
            userId,
            filename,
            result: { text: rawText, parsedDoc },
        });

        return {
            status: 'AUTO_APPROVED',
            message: 'Document automatically approved and ingested into financial intelligence pipeline.',
            parsedDoc,
        };
    }

    /**
     * Lists pending OCR review items for tenant organization.
     */
    async getReviewQueue(organizationId: string) {
        return await this.prisma.ocrReviewItem.findMany({
            where: { organizationId, status: 'REVIEW_REQUIRED' },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Manually approves a document in review queue, pushing it into the vector embedding & AI pipeline.
     */
    async approveReviewItem(id: string, organizationId: string) {
        const item = await this.prisma.ocrReviewItem.findFirst({
            where: { id, organizationId },
        });

        if (!item) {
            throw new NotFoundException('Review item not found');
        }

        if (item.status !== 'REVIEW_REQUIRED') {
            throw new BadRequestException(`Item status is already ${item.status}`);
        }

        const updated = await this.prisma.ocrReviewItem.update({
            where: { id },
            data: { status: 'APPROVED' },
        });

        this.logger.log(`Manual Approval granted for OCR Item ${id} (Org ${organizationId}). Triggering pipeline...`);
        this.eventEmitter.emit('ocr.completed', {
            organizationId: item.organizationId,
            userId: item.userId,
            filename: item.filename,
            result: { text: item.rawText, parsedDoc: item.parsedData },
        });

        return { success: true, status: 'APPROVED', item: updated };
    }

    /**
     * Manually rejects a document in review queue.
     */
    async rejectReviewItem(id: string, organizationId: string) {
        const item = await this.prisma.ocrReviewItem.findFirst({
            where: { id, organizationId },
        });

        if (!item) {
            throw new NotFoundException('Review item not found');
        }

        const updated = await this.prisma.ocrReviewItem.update({
            where: { id },
            data: { status: 'REJECTED' },
        });

        this.logger.log(`Manual Rejection logged for OCR Item ${id} (Org ${organizationId}).`);
        return { success: true, status: 'REJECTED', item: updated };
    }
}
