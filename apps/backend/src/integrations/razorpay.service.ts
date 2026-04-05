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
            // 1. Initialize API Client
            const instance = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });

            // 2. Fetch recent payments (default fetches last 30 days or so, we do pagination for recent ones)
            const paymentsResponse = await instance.payments.all({
                count: 100 // Fetching the most recent 100 payments for the demo
            });

            const payments = paymentsResponse.items;
            
            if (!payments || payments.length === 0) {
                 return {
                    status: 'success',
                    message: 'Connected to Razorpay successfully, but no recent payments found to sync.',
                    importedCount: 0,
                    duplicateCount: 0,
                    failedCount: 0
                };
            }

            // 3. Obtain a linked bank account for deposits
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

            // 4. Map payments to transactions
            for (const payment of payments) {
                // Razorpay amounts are in paise (e.g. 50000 = ₹500.00)
                const amount = Number(payment.amount) / 100;
                
                // Only sync successful 'captured' payments
                if (payment.status !== 'captured') {
                    continue;
                }

                // Deduplicate explicitly by provider payment ID
                const externalId = payment.id;
                const transactionDate = new Date(payment.created_at * 1000); // Unix timestamp
                
                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        date: transactionDate,
                        amount: amount,
                        source: 'RAZORPAY',
                        externalId: externalId
                    }
                });

                if (existing) {
                    duplicateCount++;
                    continue;
                }
                const description = payment.description || `Razorpay settlement for order ${payment.order_id || 'N/A'}`;

                // Mark as revenue
                await this.prisma.transaction.create({
                    data: {
                        amount: amount,
                        type: 'INCOME',
                        category: 'revenue',
                        description: description,
                        date: transactionDate,
                        bankAccountId: bankAccount.id,
                        source: 'RAZORPAY',
                        externalId: externalId
                    }
                });

                importedCount++;
                totalRevenueImported += amount;
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
}
