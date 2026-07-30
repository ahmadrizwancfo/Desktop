import { Injectable, Logger, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from './integrations.service';
import axios from 'axios';

@Injectable()
export class QuickbooksService {
    private readonly logger = new Logger(QuickbooksService.name);
    private readonly clientId = process.env.QB_CLIENT_ID || 'mock_qb_client';
    private readonly clientSecret = process.env.QB_CLIENT_SECRET || 'mock_qb_secret';
    private readonly redirectUri = process.env.QB_REDIRECT_URI || 'http://localhost:3001/api/integrations/quickbooks/callback';
    private readonly environment = process.env.QB_ENVIRONMENT || 'sandbox'; // or 'production'

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => IntegrationsService))
        private integrationsService: IntegrationsService,
    ) { }

    /**
     * Get the Intuit OAuth Authorization URL
     */
    getAuthUrl(userId: string): string {
        const discoveryUrl = this.environment === 'sandbox' 
            ? 'https://developer.api.intuit.com/.well-known/openid_sandbox_configuration/'
            : 'https://developer.api.intuit.com/.well-known/openid_configuration/';
        
        // Hardcoding standard Intuit auth host for simplicity
        const authEndpoint = 'https://appcenter.intuit.com/connect/oauth2';
        const scope = 'com.intuit.quickbooks.accounting';
        
        return `${authEndpoint}?client_id=${this.clientId}&response_type=code&scope=${scope}&redirect_uri=${this.redirectUri}&state=${userId}`;
    }

    /**
     * Handle the OAuth callback, exchange code for tokens
     */
    async handleCallback(code: string, realmId: string, state: string): Promise<any> {
        const userId = state;
        
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user?.organizationId) {
                throw new BadRequestException('User organization not found.');
            }

            // Mock Tokens if local dev
            let accessToken = 'mock_qb_access_token';
            let refreshToken = 'mock_qb_refresh_token';
            let expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

            if (this.clientId !== 'mock_qb_client') {
                const tokenEndpoint = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
                const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
                
                const response = await axios.post(tokenEndpoint, new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.redirectUri
                }), {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                
                accessToken = response.data.access_token;
                refreshToken = response.data.refresh_token;
                expiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();
            }

            // Store Connection mapping QUICKBOOKS provider to specific Intuit realmId
            let connection = await this.prisma.integrationConnection.findFirst({
                where: { userId, provider: 'QUICKBOOKS' }
            });

            if (connection) {
                connection = await this.prisma.integrationConnection.update({
                    where: { id: connection.id },
                    data: {
                        status: 'CONNECTED',
                        accessMetadata: { accessToken, refreshToken, expiresAt, realmId }
                    }
                });
            } else {
                connection = await this.prisma.integrationConnection.create({
                    data: {
                        userId,
                        organizationId: user.organizationId,
                        provider: 'QUICKBOOKS',
                        status: 'CONNECTED',
                        accessMetadata: { accessToken, refreshToken, expiresAt, realmId }
                    }
                });
            }

            return connection;
        } catch (error: any) {
            this.logger.error(`QuickBooks OAuth Error: ${error.message}`);
            throw new BadRequestException('Failed to connect to QuickBooks Online.');
        }
    }

    /**
     * Trigger a sync for Invoices, Payments, Purchases
     */
    async syncAccount(userId: string): Promise<any> {
        this.logger.log(`Starting QuickBooks sync for user ${userId}`);

        const connection = await this.prisma.integrationConnection.findFirst({
            where: { userId, provider: 'QUICKBOOKS' }
        });

        if (!connection || connection.status !== 'CONNECTED') {
            throw new BadRequestException('QuickBooks is not connected.');
        }

        const orgId = connection.organizationId;
        const realmId = (connection.accessMetadata as any)?.realmId || '';

        // --- 1. Fetch Live QBO Data or Fallback to Empty Arrays ---
        let qbInvoices: any[] = [];
        let qbPurchases: any[] = [];

        const accessToken = (connection.accessMetadata as any)?.accessToken;

        if (this.clientId !== 'mock_qb_client' && accessToken && realmId) {
            try {
                const baseUrl = this.environment === 'sandbox'
                    ? `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`
                    : `https://quickbooks.api.intuit.com/v3/company/${realmId}`;

                const headers = {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                };

                const [invRes, expRes] = await Promise.all([
                    axios.get(`${baseUrl}/query?query=select * from Invoice`, { headers }),
                    axios.get(`${baseUrl}/query?query=select * from Purchase`, { headers }),
                ]);

                qbInvoices = invRes.data?.QueryResponse?.Invoice || [];
                qbPurchases = expRes.data?.QueryResponse?.Purchase || [];
            } catch (err: any) {
                this.logger.warn(`Failed to fetch live QuickBooks data for user ${userId}: ${err.message}`);
            }
        }

        // --- 2. Save Raw Import ---
        const rawImport = await this.prisma.rawImport.create({
            data: {
                userId,
                organizationId: orgId,
                provider: 'QUICKBOOKS',
                sourceType: 'QBO_OAUTH',
                status: 'PROCESSING',
                rawPayload: {
                    invoices: qbInvoices,
                    purchases: qbPurchases,
                    realmId
                }
            }
        });

        // Get or Create Bank Account for QBO Integration
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId: orgId, name: `QuickBooks Integration` }
        });
        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    organizationId: orgId,
                    name: `QuickBooks Integration`,
                    bankName: 'QuickBooks API',
                    currency: 'INR'
                }
            });
        }

        // --- 3. Normalize to Transactions ---
        let duplicateCount = 0;
        let importedCount = 0;
        let failedCount = 0;
        let totalRevenueImported = 0;
        let totalExpenseImported = 0;

        // Process Invoices (Income)
        for (const inv of qbInvoices) {
            try {
                const externalId = `qb_${inv.Id}`;
                const txnDate = new Date(inv.TxnDate).toISOString();
                
                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        date: txnDate,
                        amount: inv.TotalAmt,
                        source: 'QUICKBOOKS',
                        externalId: externalId
                    }
                });

                if (existing) {
                    duplicateCount++;
                    continue;
                }

                await this.prisma.transaction.create({
                    data: {
                        amount: inv.TotalAmt,
                        type: 'INCOME',
                        category: 'Revenue',
                        description: `QBO Invoice: ${inv.CustomerRef?.name || 'Customer'}`,
                        date: new Date(inv.TxnDate).toISOString(),
                        bankAccountId: bankAccount.id,
                        externalId,
                        source: 'QUICKBOOKS'
                    }
                });
                importedCount++;
                totalRevenueImported += inv.TotalAmt;
            } catch (err: any) {
                this.logger.error(`Failed to import QBO invoice ${inv.Id}: ${err.message}`);
                failedCount++;
            }
        }

        // Process Purchases (Expenses)
        for (const exp of qbPurchases) {
            try {
                const externalId = `qb_${exp.Id}`;
                const txnDate = new Date(exp.TxnDate).toISOString();

                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        date: txnDate,
                        amount: exp.TotalAmt,
                        source: 'QUICKBOOKS',
                        externalId: externalId
                    }
                });

                if (existing) {
                    duplicateCount++;
                    continue;
                }

                await this.prisma.transaction.create({
                    data: {
                        amount: exp.TotalAmt,
                        type: 'EXPENSE',
                        category: exp.AccountRef?.name || 'Operating Expense',
                        description: exp.Line && exp.Line.length > 0 ? `QBO Expense: ${exp.Line[0].Description}` : 'QBO Expense',
                        date: new Date(exp.TxnDate).toISOString(),
                        bankAccountId: bankAccount.id,
                        externalId,
                        source: 'QUICKBOOKS'
                    }
                });
                importedCount++;
                totalExpenseImported += exp.TotalAmt;
            } catch (err: any) {
                this.logger.error(`Failed to import QBO expense ${exp.Id}: ${err.message}`);
                failedCount++;
            }
        }

        const finalStatus = failedCount > 0 ? (importedCount > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED';
        await this.prisma.rawImport.update({
            where: { id: rawImport.id },
            data: { status: finalStatus }
        });

        // --- 4. Update Connection & Trigger Recalculation ---
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
            provider: 'QUICKBOOKS',
            message: `Successfully mapped QuickBooks API data to normalized pipeline.`,
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
