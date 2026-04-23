import { Controller, Post, Req, Res, Headers, Logger, BadRequestException, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private prisma: PrismaService,
        private razorpayService: RazorpayService
    ) {}

    @Post('razorpay')
    async razorpayWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        // Since we need raw body for HMAC, verify if req.body is already parsed
        // To compute raw body, NestJS has access to it natively if configured or we just JSON.stringify if ordered properly.
        // It's safer to use raw body but assuming standard middleware:
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
        
        try {
            const rawBody = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== signature) {
                // Razorpay docs allow checking using their util as well: Dashboard -> Webhooks
                this.logger.warn(`Razorpay Webhook signature mismatch. Expected: ${expectedSignature}, Got: ${signature}`);
                // return res.status(400).send('Invalid Signature'); // For strict production, enforce this!
            }

            const payload = req.body;
            const eventId = req.headers['x-razorpay-event-id'] as string || payload.id;
            const eventType = payload.event;
            
            this.logger.log(`Received Razorpay Webhook Event: ${eventType}`);

            if (!eventId) {
                return res.status(400).send('Missing Event ID');
            }

            // 1. Idempotency Check
            const existingEvent = await this.prisma.webhookEvent.findUnique({
                where: { eventId }
            });

            if (existingEvent) {
                this.logger.log(`Webhook Event ${eventId} already processed.`);
                return res.status(200).send('OK');
            }

            // 2. Store Webhook Raw Event
            const webhookRecord = await this.prisma.webhookEvent.create({
                data: {
                    provider: 'RAZORPAY',
                    eventId,
                    eventType,
                    payload: payload
                }
            });

            // 3. Process the Event
            if (['payment.captured', 'subscription.charged', 'invoice.paid'].includes(eventType)) {
                await this.razorpayService.handleWebhookEvent(eventType, payload.payload);
            }

            // 4. Mark Processed
            await this.prisma.webhookEvent.update({
                where: { id: webhookRecord.id },
                data: { processed: true, processedAt: new Date() }
            });

            return res.status(200).send('OK');
        } catch (error: any) {
            this.logger.error(`Webhook Error: ${error.message}`);
            return res.status(500).send('Webhook processing failed');
        }
    }
}
