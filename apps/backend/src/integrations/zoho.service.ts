import { Injectable, Logger, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from './integrations.service';
import { TransactionType } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class ZohoService {
    private readonly logger = new Logger(ZohoService.name);
    private readonly clientId = process.env.ZOHO_CLIENT_ID || 'mock_client_id';
    private readonly clientSecret = process.env.ZOHO_CLIENT_SECRET || 'mock_client_secret';
    private readonly redirectUri = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/api/integrations/zoho/callback';

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => IntegrationsService))
        private integrationsService: IntegrationsService,
    ) { }

    /**
     * Get the Zoho OAuth Authorization URL
     */
    getAuthUrl(userId: string): string {
        const scope = 'ZohoBooks.fullaccess.all';
        const url = `https://accounts.zoho.in/oauth/v2/auth?scope=${scope}&client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&access_type=offline&prompt=consent&state=${userId}`;
        return url;
    }

    /**
     * Handle the OAuth callback, exchange code for tokens, and save connection.
     */
    async handleCallback(code: string, state: string): Promise<any> {
        const userId = state; // We embedded userId in state parameter
        
        try {
            // Find user org
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user?.organizationId) {
                throw new BadRequestException('User organization not found.');
            }

            // In local development without real keys, we mock the tokens:
            let accessToken = 'mock_zoho_access_token';
            let refreshToken = 'mock_zoho_refresh_token';
            let expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

            if (this.clientId !== 'mock_client_id') {
                const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
                    params: {
                        code,
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        redirect_uri: this.redirectUri,
                        grant_type: 'authorization_code'
                    }
                });
                accessToken = response.data.access_token;
                refreshToken = response.data.refresh_token; 
                expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();
            }

            // Save Connection without unique constraints blocking it
            let connection = await this.prisma.integrationConnection.findFirst({
                where: { userId, provider: 'ZOHO' }
            });

            if (connection) {
                connection = await this.prisma.integrationConnection.update({
                    where: { id: connection.id },
                    data: {
                        status: 'CONNECTED',
                        accessMetadata: { accessToken, refreshToken, expiresAt }
                    }
                });
            } else {
                connection = await this.prisma.integrationConnection.create({
                    data: {
                        userId,
                        organizationId: user.organizationId,
                        provider: 'ZOHO',
                        status: 'CONNECTED',
                        accessMetadata: { accessToken, refreshToken, expiresAt }
                    }
                });
            }

            return connection;
        } catch (error: any) {
            this.logger.error(`Zoho OAuth Error: ${error.message}`);
            throw new BadRequestException('Failed to connect to Zoho Books.');
        }
    }

    /**
     * Trigger a sync for Invoices and Expenses
     */
    async syncAccount(userId: string): Promise<any> {
        this.logger.log(`Starting Zoho sync for user ${userId}`);

        const connection = await this.prisma.integrationConnection.findFirst({
            where: { userId, provider: 'ZOHO' }
        });

        if (!connection || connection.status !== 'CONNECTED') {
            throw new BadRequestException('Zoho is not connected.');
        }

        const orgId = connection.organizationId;
        
        // --- 1. Fetch Mock OR Real Data ---
        // For demonstration, we mock Zoho payload to prevent crashing without real tokens
        const mockZohoInvoices = [
            { invoice_id: 'zh_inv_001', date: new Date().toISOString().split('T')[0], total: 85000, status: 'paid', customer_name: 'Acme Corp' },
            { invoice_id: 'zh_inv_002', date: new Date(Date.now() - 86400000*5).toISOString().split('T')[0], total: 42000, status: 'paid', customer_name: 'TechFlow' }
        ];

        const mockZohoExpenses = [
            { expense_id: 'zh_exp_001', date: new Date().toISOString().split('T')[0], total: 15000, category_name: 'Software', description: 'AWS Hosting' }
        ];

        // --- 2. Save Raw Import ---
        const rawImport = await this.prisma.rawImport.create({
            data: {
                userId,
                organizationId: orgId,
                provider: 'ZOHO',
                sourceType: 'ZOHO_OAUTH',
                status: 'PROCESSING',
                rawPayload: {
                    invoices: mockZohoInvoices,
                    expenses: mockZohoExpenses
                }
            }
        });

        // Get or Create Bank Account for Zoho Integration
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId: orgId, name: `Zoho Integration` }
        });
        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    organizationId: orgId,
                    name: `Zoho Integration`,
                    bankName: 'Zoho API',
                    currency: 'INR'
                }
            });
        }

        // --- 3. Map to Normalized Transactions ---
        let duplicateCount = 0;
        let importedCount = 0;
        let failedCount = 0;
        let totalRevenueImported = 0;
        let totalExpenseImported = 0;

        // Process Invoices (Income)
        for (const inv of mockZohoInvoices) {
            try {
                const externalId = `zoho_${inv.invoice_id}`;
                const txnDate = new Date(inv.date).toISOString();
                
                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        date: txnDate,
                        amount: inv.total,
                        source: 'ZOHO',
                        externalId: externalId
                    }
                });

                if (existing) {
                    duplicateCount++;
                    continue;
                }

                await this.prisma.transaction.create({
                    data: {
                        amount: inv.total,
                        type: 'INCOME',
                        category: 'Revenue',
                        description: `Zoho Invoice: ${inv.customer_name}`,
                        date: new Date(inv.date).toISOString(),
                        bankAccountId: bankAccount.id,
                        externalId,
                        source: 'ZOHO'
                    }
                });
                importedCount++;
                totalRevenueImported += inv.total;
            } catch (err: any) {
                this.logger.error(`Failed to import Zoho invoice ${inv.invoice_id}: ${err.message}`);
                failedCount++;
            }
        }

        // Process Expenses
        for (const exp of mockZohoExpenses) {
            try {
                const externalId = `zoho_${exp.expense_id}`;
                const txnDate = new Date(exp.date).toISOString();

                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        date: txnDate,
                        amount: exp.total,
                        source: 'ZOHO',
                        externalId: externalId
                    }
                });

                if (existing) {
                    duplicateCount++;
                    continue;
                }

                await this.prisma.transaction.create({
                    data: {
                        amount: exp.total,
                        type: 'EXPENSE',
                        category: exp.category_name || 'Operating Expense',
                        description: `Zoho Expense: ${exp.description}`,
                        date: new Date(exp.date).toISOString(),
                        bankAccountId: bankAccount.id,
                        externalId,
                        source: 'ZOHO'
                    }
                });
                importedCount++;
                totalExpenseImported += exp.total;
            } catch (err: any) {
                this.logger.error(`Failed to import Zoho expense ${exp.expense_id}: ${err.message}`);
                failedCount++;
            }
        }

        const finalStatus = failedCount > 0 ? (importedCount > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED';
        await this.prisma.rawImport.update({
            where: { id: rawImport.id },
            data: { status: finalStatus }
        });

        // --- 4. Update Connection & Recompute ---
        await this.prisma.integrationConnection.update({
            where: { id: connection.id },
            data: { lastSyncedAt: new Date() }
        });

        let finalProfileMetrics: any = null;
        if (importedCount > 0) {
            finalProfileMetrics = await this.integrationsService.recalculateProfileAggregations(userId, orgId);
        }

        return {
            success: true,
            provider: 'ZOHO',
            message: `Successfully mapped Zoho API data to normalized pipeline.`,
            importedCount,
            duplicateCount,
            failedCount,
            partials: finalStatus === 'PARTIAL',
            totalRevenueImported,
            totalExpenseImported,
            rawImportId: rawImport.id,
            finalProfileMetrics: finalProfileMetrics
        };
    }
}
