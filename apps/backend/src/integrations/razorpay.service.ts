import { Injectable, Logger, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from './integrations.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
    private readonly logger = new Logger(RazorpayService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => IntegrationsService))
        private integrationsService: IntegrationsService, // We can expose recalculateProfileAggregations publicly
    ) { }

    async connectAndSync(keyId: string, keySecret: string, organizationId: string, userId: string) {
        if (!keyId || !keySecret) {
            throw new BadRequestException('Razorpay Key ID and Secret are required.');
        }

        this.logger.log(`Attempting Razorpay connection for Org ${organizationId}`);

        try {
            const rzpEnvId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SdrsqXPZAUsC2o';
            const rzpEnvSecret = process.env.RAZORPAY_KEY_SECRET || 'RbeZtyx7azmtUfPXEWYqgaTU';
            // 1. Initialize API Client
            const instance = new Razorpay({
                key_id: keyId || rzpEnvId,
                key_secret: keySecret || rzpEnvSecret,
            });

            // 2. Obtain a linked bank account for deposits
            let bankAccount = await this.prisma.bankAccount.findFirst({
                where: { organizationId, deletedAt: null }
            });
    
            if (!bankAccount) {
                bankAccount = await this.prisma.bankAccount.create({
                    data: {
                        name: 'Razorpay Clearing Account',
                        bankName: 'Razorpay Integration',
                        organizationId,
                        balance: 0,
                    }
                });
            }

            let importedCount = 0;
            let duplicateCount = 0;
            let totalRevenueImported = 0;
            let failedCount = 0;

            // 3. Fetch recent payments with pagination
            let hasMore = true;
            let skip = 0;
            const limit = 100;

            while (hasMore) {
                let paymentsResponse;
                try {
                    paymentsResponse = await instance.payments.all({
                        skip: skip,
                        count: limit
                    });
                } catch (apiError: any) {
                    this.logger.warn(`Razorpay pagination failed at skip=${skip}: ${apiError.message}`);
                    break; // Stop fetching gracefully on limit/error
                }

                const payments = paymentsResponse.items;
                
                if (!payments || payments.length === 0) {
                    hasMore = false;
                    break;
                }

                // 4. Map payments to transactions
                for (const payment of payments) {
                    // Only sync successful 'captured' payments
                    if (payment.status !== 'captured') {
                        continue;
                    }

                    // Razorpay amounts are in paise (e.g. 50000 = ₹500.00)
                    const amount = Number(payment.amount) / 100;
                    
                    // Deduplicate explicitly by provider payment ID
                    const externalId = payment.id;
                    const transactionDate = new Date(payment.created_at * 1000); // Unix timestamp
                    
                    try {
                        const existing = await this.prisma.transaction.findFirst({
                            where: {
                                bankAccount: { organizationId },
                                source: 'RAZORPAY',
                                externalId: externalId
                            }
                        });

                        if (existing) {
                            duplicateCount++;
                            continue;
                        }

                        const description = payment.description || `Razorpay settlement for order ${payment.order_id || 'N/A'}`;

                        // Ensure category inference is basic but accurate
                        let inferredCategory = 'Sales';
                        if (description.toLowerCase().includes('subscription')) inferredCategory = 'Subscription Revenue';

                        // Mark as revenue
                        await this.prisma.transaction.create({
                            data: {
                                amount: amount,
                                type: 'INCOME',
                                category: inferredCategory,
                                description: description,
                                date: transactionDate,
                                bankAccountId: bankAccount.id,
                                source: 'RAZORPAY',
                                externalId: externalId
                            }
                        });

                        importedCount++;
                        totalRevenueImported += amount;
                    } catch (txError: any) {
                        this.logger.error(`Failed to ingest Razorpay TX ${externalId}: ${txError.message}`);
                        failedCount++;
                    }
                }

                if (payments.length < limit) {
                    hasMore = false;
                } else {
                    skip += limit;
                }

                // Safety limit for MVP to prevent infinite loops (max 2000 transactions roughly 20 limits)
                if (skip >= 2000) hasMore = false;
            }

            if (importedCount === 0 && duplicateCount === 0) {
                 return {
                    status: 'success',
                    message: 'Connected to Razorpay successfully, but no captured payments found to sync.',
                    importedCount: 0,
                    duplicateCount: 0,
                    failedCount: 0
                };
            }

            // 5. Save the integration connection with masked secret
            const maskedSecret = keySecret.substring(0, 4) + '***' + keySecret.substring(keySecret.length - 4);
            const connectionExists = await this.prisma.integrationConnection.findFirst({
                where: { organizationId, provider: 'RAZORPAY' }
            });

            if (connectionExists) {
                await this.prisma.integrationConnection.update({
                    where: { id: connectionExists.id },
                    data: {
                        status: 'ACTIVE',
                        lastSyncedAt: new Date(),
                        accessMetadata: { keyId, keySecretMasked: maskedSecret }
                    }
                });
            } else {
                await this.prisma.integrationConnection.create({
                    data: {
                        userId,
                        organizationId,
                        provider: 'RAZORPAY',
                        status: 'ACTIVE',
                        lastSyncedAt: new Date(),
                        accessMetadata: { keyId, keySecretMasked: maskedSecret }
                    }
                });
            }

            // 6. Compute new constraints and emit update hook
            let finalProfileMetrics: any = null;
            if (importedCount > 0) {
                 finalProfileMetrics = await this.integrationsService.recalculateProfileAggregations(userId, organizationId);
            }

            return {
                status: 'success',
                message: `Successfully connected and synced ${importedCount} payments from Razorpay.`,
                importedCount,
                duplicateCount,
                failedCount: 0,
                totalRevenueImported,
                totalExpenseImported: 0,
                finalProfileMetrics
            };
        } catch (error: any) {
            this.logger.error(`Razorpay connection failed: ${error.message}`);
            throw new BadRequestException('Failed to connect to Razorpay. Invalid keys or API error.');
        }
    }

    async syncAccount(organizationId: string, userId: string, deepSync: boolean = false) {
        const connection = await this.prisma.integrationConnection.findFirst({
            where: { organizationId, provider: 'RAZORPAY' }
        });

        if (!connection || connection.status !== 'ACTIVE') {
            throw new BadRequestException('Razorpay is not connected.');
        }

        const access = connection.accessMetadata as any;
        const keyId = access?.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_SdrsqXPZAUsC2o';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'RbeZtyx7azmtUfPXEWYqgaTU'; // Use ENV or metadata

        const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId, name: 'Razorpay Clearing Account', deletedAt: null }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: { name: 'Razorpay Clearing Account', bankName: 'Razorpay Integration', organizationId, balance: 0 }
            });
        }

        let importedCount = 0;
        let hasMore = true;
        let skip = 0;
        const limit = 100;
        let lastSyncTimeUnix = 0;

        if (!deepSync && connection.lastSyncedAt) {
            // Razorpay uses UNIX timestamps for 'from' parameter
            lastSyncTimeUnix = Math.floor(connection.lastSyncedAt.getTime() / 1000);
        }

        while (hasMore) {
            let paymentsResponse;
            try {
                const params: any = { skip, count: limit };
                if (!deepSync && lastSyncTimeUnix > 0) {
                    params.from = lastSyncTimeUnix;
                }
                paymentsResponse = await instance.payments.all(params);
            } catch (err: any) {
                this.logger.warn(`Razorpay sync pagination failed: ${err.message}`);
                break;
            }

            const payments = paymentsResponse.items;
            if (!payments || payments.length === 0) break;

            for (const payment of payments) {
                if (payment.status !== 'captured') continue;
                const externalId = payment.id;
                const existing = await this.prisma.transaction.findFirst({
                    where: { bankAccount: { organizationId }, source: 'RAZORPAY', externalId }
                });

                if (!existing) {
                    await this.prisma.transaction.create({
                        data: {
                            amount: Number(payment.amount) / 100,
                            type: 'INCOME',
                            category: payment.description?.toLowerCase().includes('subscription') ? 'Subscription Revenue' : 'Sales',
                            description: payment.description || `Razorpay settlement ${payment.order_id || 'N/A'}`,
                            date: new Date(payment.created_at * 1000),
                            bankAccountId: bankAccount.id,
                            source: 'RAZORPAY',
                            externalId
                        }
                    });
                    importedCount++;
                }
            }

            if (payments.length < limit || skip >= 3000) hasMore = false;
            else skip += limit;
        }

        if (importedCount > 0) {
            await this.integrationsService.recalculateProfileAggregations(userId, organizationId);
        }

        return { importedCount };
    }

    async handleWebhookEvent(eventType: string, payload: any) {
        // Find organization logic: webhooks do not inherently carry organizationId 
        // unless passed in notes or retrieved via account matching if multiple orgs are supported.
        // For FounderCFO, we can find the connection matching the webhook key, or assume single tenant during MVP:
        const connection = await this.prisma.integrationConnection.findFirst({
            where: { provider: 'RAZORPAY', status: 'ACTIVE' }
        });

        if (!connection) {
            throw new Error(`Integration missing for Razorpay Webhook ${eventType}`);
        }

        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId: connection.organizationId, name: 'Razorpay Clearing Account', deletedAt: null }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: { name: 'Razorpay Clearing Account', bankName: 'Razorpay Integration', organizationId: connection.organizationId, balance: 0 }
            });
        }

        const entityWrapper = payload.payment || payload.subscription || payload.invoice;
        if (!entityWrapper || !entityWrapper.entity) {
            this.logger.warn(`Unknown Razorpay webhook payload structure for ${eventType}`);
            return;
        }

        const entity = entityWrapper.entity;
        const externalId = entity.id;
        
        let type: any = 'INCOME';
        let category = 'Sales';
        let amount = entity.amount ? (Number(entity.amount) / 100) : 0;
        let description = entity.description || `Razorpay Webhook ${eventType} ${entity.order_id || 'N/A'}`;

        if (eventType === 'payment.captured') {
            category = 'Sales';
        } else if (eventType === 'subscription.charged') {
            category = 'Subscription Revenue';
        } else if (eventType === 'invoice.paid') {
            category = 'Sales';
        } else if (eventType === 'payment.failed') {
            category = 'Failed Payment';
            type = 'FAILED';
        } else if (eventType === 'subscription.cancelled') {
            category = 'Subscription Cancelled';
            type = 'EVENT';
            amount = 0;
        } else {
            // Unsupported event type mapped to system, ignore processing
            return;
        }
        
        const existing = await this.prisma.transaction.findFirst({
            where: { bankAccount: { organizationId: connection.organizationId }, source: 'RAZORPAY', externalId }
        });

        if (!existing) {
            await this.prisma.transaction.create({
                data: {
                    amount,
                    type,
                    category,
                    description,
                    date: new Date((entity.created_at || Math.floor(Date.now() / 1000)) * 1000),
                    bankAccountId: bankAccount.id,
                    source: 'RAZORPAY',
                    externalId
                }
            });
            
            // Only recalculate metrics if it's an actionable income hitting cash balances
            if (['payment.captured', 'subscription.charged', 'invoice.paid'].includes(eventType)) {
                setTimeout(() => {
                    this.integrationsService.recalculateProfileAggregations(connection.userId, connection.organizationId)
                        .catch(err => this.logger.error(`Webhook profile recalc failed: ${err.message}`));
                }, 0);
            }
        }
    }
}
