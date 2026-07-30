import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiFeedbackService {
    private readonly logger = new Logger(AiFeedbackService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Stores 👍 / 👎 user feedback on AI decisions for compounding intelligence & learning loops.
     */
    async logFeedback(params: {
        organizationId: string;
        userId?: string;
        decisionId?: string;
        rating: 'THUMBS_UP' | 'THUMBS_DOWN';
        feedbackText?: string;
        promptText: string;
        responseText: string;
        metadata?: any;
    }) {
        this.logger.log(`Logging AI Feedback [${params.rating}] for Org ${params.organizationId}`);

        return await this.prisma.aiFeedback.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                decisionId: params.decisionId,
                rating: params.rating,
                feedbackText: params.feedbackText,
                promptText: params.promptText,
                responseText: params.responseText,
                metadata: params.metadata || {},
            },
        });
    }

    /**
     * Tracks user actions, UI interactions, and command executions for compounding personalization.
     */
    async logUserEvent(params: {
        organizationId: string;
        userId?: string;
        action: string;
        component: string;
        metadata?: any;
    }) {
        return await this.prisma.userEventLog.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                action: params.action,
                component: params.component,
                metadata: params.metadata || {},
            },
        });
    }
}
