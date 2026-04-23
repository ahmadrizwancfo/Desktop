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
    private readonly redirectUri = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/integrations/zoho/callback';

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
    async syncAccount(userId: string, deepSync: boolean = false): Promise<any> {
        this.logger.log(`Starting Zoho sync for user ${userId} | Deep Sync: ${deepSync}`);

        const connection = await this.prisma.integrationConnection.findFirst({
            where: { userId, provider: 'ZOHO' }
        });

        if (!connection || connection.status !== 'CONNECTED') {
            throw new BadRequestException('Zoho is not connected.');
        }

        const orgId = connection.organizationId;
        
        const accessMetadata: any = connection.accessMetadata || {};
        let accessToken = accessMetadata.accessToken;
        const refreshToken = accessMetadata.refreshToken;
        let expiresAt = accessMetadata.expiresAt ? new Date(accessMetadata.expiresAt) : new Date(0);

        // 1. Handle Token Refresh if Expired
        if (new Date() >= expiresAt && this.clientId !== 'mock_client_id') {
            try {
                const tokenRes = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
                    params: {
                        refresh_token: refreshToken,
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'refresh_token'
                    }
                });
                accessToken = tokenRes.data.access_token;
                expiresAt = new Date(Date.now() + tokenRes.data.expires_in * 1000);
                
                await this.prisma.integrationConnection.update({
                    where: { id: connection.id },
                    data: { accessMetadata: { ...accessMetadata, accessToken, expiresAt: expiresAt.toISOString() } }
                });
            } catch (authErr: any) {
                this.logger.error(`Zoho Token Refresh Error: ${authErr.message}`);
                throw new BadRequestException('Zoho authentication expired. Please reconnect.');
            }
        }

        // 2. Fetch Real Data from Zoho API
        let realInvoices: any[] = [];
        let realExpenses: any[] = [];
        let realBankAccounts: any[] = [];

        if (this.clientId !== 'mock_client_id') {
            try {
                // Get Organization ID first
                const orgRes = await axios.get('https://www.zohoapis.in/books/v3/organizations', {
                    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
                });
                
                const orgs = orgRes.data.organizations;
                if (!orgs || orgs.length === 0) throw new Error('No Zoho Books organization found.');
                const zohoOrgId = orgs[0].organization_id;

                const queryParams: any = { organization_id: zohoOrgId };
                if (!deepSync && connection.lastSyncedAt) {
                    // Zoho uses ISO strings, e.g., 2023-11-20T12:00:00+0530
                    let iso = connection.lastSyncedAt.toISOString();
                    // Strip the Z and append +0000 for strict Zoho parsing, or just let Zoho parse ISO8601
                    queryParams.last_modified_time = connection.lastSyncedAt.toISOString();
                }

                // Fetch Invoices with Pagination
                let hasMoreInvoices = true;
                let pageInvoices = 1;
                while (hasMoreInvoices) {
                    const invRes = await axios.get('https://www.zohoapis.in/books/v3/invoices', {
                        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                        params: { ...queryParams, status: 'paid', page: pageInvoices }
                    });
                    
                    const batch = invRes.data.invoices || [];
                    realInvoices.push(...batch);
                    
                    if (invRes.data.page_context?.has_more_page && pageInvoices < 20) {
                        pageInvoices++;
                    } else {
                        hasMoreInvoices = false;
                    }
                }

                // Fetch Expenses with Pagination
                let hasMoreExpenses = true;
                let pageExpenses = 1;
                while (hasMoreExpenses) {
                    const expRes = await axios.get('https://www.zohoapis.in/books/v3/expenses', {
                        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                        params: { ...queryParams, page: pageExpenses }
                    });
                    
                    const batch = expRes.data.expenses || [];
                    realExpenses.push(...batch);
                    
                    if (expRes.data.page_context?.has_more_page && pageExpenses < 20) {
                        pageExpenses++;
                    } else {
                        hasMoreExpenses = false;
                    }
                }
                // Fetch Bank Accounts safely (no pagination needed since count is low)
                try {
                    const bankRes = await axios.get('https://www.zohoapis.in/books/v3/bankaccounts', {
                        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
                        params: { ...queryParams }
                    });
                    realBankAccounts = bankRes.data.bankaccounts || [];
                } catch (bErr: any) {
                    this.logger.warn(`Failed to fetch bank accounts from Zoho: ${bErr.message}`);
                }
                
            } catch (apiErr: any) {
                if (apiErr.response?.status === 429) {
                    this.logger.error('Zoho API Rate Limit Exceeded!');
                    throw new BadRequestException('Zoho Rate Limit Hit. Sync queued for next cycle.');
                }
                this.logger.error(`Zoho API Error: ${apiErr.message}`);
                throw new BadRequestException('Failed to pull data from Zoho API.');
            }
        }

        if (realInvoices.length === 0 && realExpenses.length === 0) {
            return {
                success: true,
                provider: 'ZOHO',
                message: 'Connected to Zoho successfully, but found 0 invoices and 0 expenses.',
                importedCount: 0,
                duplicateCount: 0,
                failedCount: 0
            };
        }

        // --- 3. Save Raw Import ---
        const rawImport = await this.prisma.rawImport.create({
            data: {
                userId,
                organizationId: orgId,
                provider: 'ZOHO',
                sourceType: 'ZOHO_OAUTH',
                status: 'PROCESSING',
                rawPayload: {
                    invoices: realInvoices,
                    expenses: realExpenses
                }
            }
        });

        // Upsert true Zoho Bank Accounts to capture LIVE Cash Balance properly
        for (const account of realBankAccounts) {
            try {
                await this.prisma.bankAccount.upsert({
                    where: {
                        organizationId_provider_externalId: {
                            organizationId: orgId,
                            provider: 'zoho',
                            externalId: account.account_id
                        }
                    },
                    update: {
                        balance: account.balance || account.bcy_balance || 0,
                        accountNumber: account.account_number || null,
                        lastSyncedAt: new Date(),
                    },
                    create: {
                        name: account.account_name,
                        bankName: account.bank_name || 'Zoho Bank',
                        balance: account.balance || account.bcy_balance || 0,
                        accountNumber: account.account_number || null,
                        currency: account.currency_code || 'INR',
                        organizationId: orgId,
                        provider: 'zoho',
                        externalId: account.account_id,
                        lastSyncedAt: new Date()
                    }
                });
            } catch (err: any) {
                this.logger.warn(`Failed to map Zoho bank account ${account.account_name}: ${err.message}`);
            }
        }

        // Get or Create Bank Account for generic Zoho Transactions unlinked map
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
        for (const inv of realInvoices) {
            try {
                const externalId = `zoho_${inv.invoice_id}`;
                const txnDate = new Date(inv.date).toISOString();
                
                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        bankAccount: { organizationId: orgId },
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
        for (const exp of realExpenses) {
            try {
                const externalId = `zoho_${exp.expense_id}`;
                const txnDate = new Date(exp.date).toISOString();

                const existing = await this.prisma.transaction.findFirst({
                    where: {
                        bankAccount: { organizationId: orgId },
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
                        description: `Zoho Expense: ${exp.description || 'N/A'}`,
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
