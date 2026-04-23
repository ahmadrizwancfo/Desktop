import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBankingProvider } from './banking.interface';
import { SandboxBankingProvider } from './providers/sandbox.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { CfoBrainService } from '../../cfo-engine/cfo-brain.service';

@Injectable()
export class BankingService {
    private readonly logger = new Logger(BankingService.name);
    private provider: IBankingProvider;

    constructor(
        private configService: ConfigService,
        private sandboxProvider: SandboxBankingProvider,
        private prisma: PrismaService,
        @Optional() @Inject(CfoBrainService) private cfoBrain: CfoBrainService | null,
    ) {
        const mode = this.configService.get<string>('BANKING_MODE') || 'sandbox';

        if (mode === 'sandbox') {
            this.logger.log('Initializing Banking Service in SANDBOX mode');
            this.provider = this.sandboxProvider;
        } else {
            this.logger.warn('Production provider not configured, falling back to sandbox');
            this.provider = this.sandboxProvider;
        }
    }

    async initiateConsent(userId: string, mobile: string) {
        return this.provider.initiateConsent(userId, mobile);
    }

    async getAccounts(consentHandle: string) {
        return this.provider.fetchAccounts(consentHandle);
    }

    /**
     * Sync transactions from provider → database, then recalculate financial metrics.
     *
     * Flow:
     *  1. Fetch raw transactions from banking provider
     *  2. Upsert BankAccount in our DB
     *  3. Deduplicate using externalId and persist new transactions
     *  4. Update bank account balance
     *  5. Recalculate org-wide revenue, expenses, burn, runway in StartupProfile
     */
    async syncTransactions(accountId: string, organizationId: string, userId?: string) {
        this.logger.log(`Syncing transactions for account ${accountId} in org ${organizationId}`);

        // ── 1. Fetch from provider ───────────────────────────────────────────
        const rawTransactions = await this.provider.fetchTransactions(
            accountId,
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // last 90 days
            new Date()
        );

        this.logger.log(`Provider returned ${rawTransactions.length} transactions`);

        // ── 2. Ensure BankAccount exists ─────────────────────────────────────
        const accountNumber = accountId.replace('acc_', 'XXXX');
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId, accountNumber, deletedAt: null }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    organizationId,
                    name: `Linked Account (${accountId})`,
                    bankName: this.inferBankName(accountId),
                    accountNumber,
                    balance: 0,
                }
            });
            this.logger.log(`Created new BankAccount: ${bankAccount.id}`);
        }

        // ── 3. Persist with deduplication ────────────────────────────────────
        let newCount = 0;
        let skippedCount = 0;
        let totalCredits = 0;
        let totalDebits = 0;

        for (const tx of rawTransactions) {
            // Dedup check: skip if this provider transaction was already imported
            const existing = await this.prisma.transaction.findFirst({
                where: {
                    bankAccountId: bankAccount.id,
                    externalId: tx.id,
                    deletedAt: null,
                }
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            const txType = tx.type === 'CREDIT' ? 'INCOME' : 'EXPENSE';
            const amount = Math.abs(tx.amount);

            await this.prisma.transaction.create({
                data: {
                    bankAccountId: bankAccount.id,
                    amount,
                    type: txType,
                    date: new Date(tx.date),
                    description: tx.narration || tx.description || 'Bank Transaction',
                    category: tx.category || this.inferCategory(tx.narration || ''),
                    externalId: tx.id,
                    source: 'BANKING_API_SYNC',
                    metadata: {
                        rawType: tx.type,
                        syncedAt: new Date().toISOString(),
                        provider: this.configService.get('BANKING_MODE') || 'sandbox',
                    },
                }
            });

            if (txType === 'INCOME') totalCredits += amount;
            else totalDebits += amount;

            newCount++;
        }

        this.logger.log(
            `Sync complete: ${newCount} new, ${skippedCount} skipped (duplicates)`
        );

        // ── 4. Update bank account balance ───────────────────────────────────
        // Recalculate from all active transactions
        const balanceAgg = await this.prisma.transaction.aggregate({
            where: { bankAccountId: bankAccount.id, deletedAt: null },
            _sum: { amount: true },
        });

        // Net balance: credits - debits
        const allTxs = await this.prisma.transaction.findMany({
            where: { bankAccountId: bankAccount.id, deletedAt: null },
            select: { amount: true, type: true },
        });

        let computedBalance = 0;
        for (const t of allTxs) {
            const amt = Number(t.amount);
            computedBalance += t.type === 'INCOME' ? amt : -amt;
        }

        await this.prisma.bankAccount.update({
            where: { id: bankAccount.id },
            data: { balance: Math.max(0, computedBalance) },
        });

        // ── 5. Recalculate StartupProfile metrics ────────────────────────────
        if (newCount > 0) {
            await this.recalculateOrgMetrics(organizationId, userId);
        }

        // ── 6. Regenerate CFO Brain insights (non-blocking) ──────────────────
        if (newCount > 0 && this.cfoBrain) {
            this.cfoBrain.generateReport(organizationId, userId).then(report => {
                this.logger.log(`CFO Brain: ${report.insights.length} insights regenerated after sync`);
            }).catch(err => {
                this.logger.warn(`CFO Brain post-sync failed: ${err.message}`);
            });
        }

        return {
            syncedCount: newCount,
            skippedCount,
            totalFound: rawTransactions.length,
            accountId: bankAccount.id,
            bankName: bankAccount.bankName,
            newCredits: totalCredits,
            newDebits: totalDebits,
            updatedBalance: computedBalance,
        };
    }

    /**
     * Recalculate monthly revenue, expenses, burn rate and update the StartupProfile
     * using REAL transaction data from the last 30 days.
     */
    private async recalculateOrgMetrics(organizationId: string, userId?: string): Promise<void> {
        this.logger.log(`Recalculating financial metrics for org ${organizationId}`);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get all org bank accounts
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true },
        });

        if (bankAccounts.length === 0) return;

        const accountIds = bankAccounts.map(a => a.id);

        // Aggregate revenue (INCOME) from last 30 days
        const revenueAgg = await this.prisma.transaction.aggregate({
            where: {
                bankAccountId: { in: accountIds },
                type: 'INCOME',
                date: { gte: thirtyDaysAgo },
                deletedAt: null,
            },
            _sum: { amount: true },
        });

        // Aggregate expenses (EXPENSE) from last 30 days
        const expenseAgg = await this.prisma.transaction.aggregate({
            where: {
                bankAccountId: { in: accountIds },
                type: 'EXPENSE',
                date: { gte: thirtyDaysAgo },
                deletedAt: null,
            },
            _sum: { amount: true },
        });

        const monthlyRevenue = Number(revenueAgg._sum.amount || 0);
        const monthlyExpenses = Number(expenseAgg._sum.amount || 0);
        const netBurn = Math.max(0, monthlyExpenses - monthlyRevenue);

        // Total cash across all bank accounts
        const cashAgg = await this.prisma.bankAccount.aggregate({
            where: { organizationId, deletedAt: null },
            _sum: { balance: true },
        });
        const cashInBank = Number(cashAgg._sum.balance || 0);
        const runwayMonths = netBurn > 0 ? Math.round(cashInBank / netBurn) : 999;

        this.logger.log(
            `Metrics: Revenue ₹${monthlyRevenue} | Expenses ₹${monthlyExpenses} | ` +
            `Burn ₹${netBurn} | Cash ₹${cashInBank} | Runway ${runwayMonths}mo`
        );

        // Update all StartupProfiles for this org (typically 1 per founder)
        await this.prisma.startupProfile.updateMany({
            where: { organizationId },
            data: {
                monthlyRevenue,
                monthlyExpenses,
                cashInBank,
            },
        });

        // Save a FinancialSnapshot for trend tracking
        const resolvedUserId = userId || (await this.getOrgOwner(organizationId));
        if (resolvedUserId) {
            await this.prisma.financialSnapshot.create({
                data: {
                    userId: resolvedUserId,
                    organizationId,
                    revenue: monthlyRevenue,
                    expenses: monthlyExpenses,
                    cashBalance: cashInBank,
                    burn: netBurn,
                },
            });
            this.logger.log('Financial snapshot saved after bank sync');
        }

        // Save metric snapshots for KPI trend graphs
        const period = new Date().toISOString().slice(0, 7); // "2026-04"
        const metricsToSnapshot = [
            { key: 'mrr', value: monthlyRevenue, unit: 'INR' },
            { key: 'burn_rate', value: netBurn, unit: 'INR' },
            { key: 'runway_months', value: runwayMonths, unit: 'months' },
            { key: 'monthly_expenses', value: monthlyExpenses, unit: 'INR' },
        ];

        for (const m of metricsToSnapshot) {
            await this.prisma.metricSnapshot.upsert({
                where: {
                    organizationId_metricKey_period: {
                        organizationId,
                        metricKey: m.key,
                        period,
                    },
                },
                create: {
                    organizationId,
                    metricKey: m.key,
                    value: m.value,
                    unit: m.unit,
                    period,
                    source: 'bank_sync',
                },
                update: {
                    value: m.value,
                    source: 'bank_sync',
                },
            });
        }

        this.logger.log('Metric snapshots updated after bank sync');
    }

    /**
     * Get the first user (owner) for an organization.
     */
    private async getOrgOwner(organizationId: string): Promise<string | null> {
        const user = await this.prisma.user.findFirst({
            where: { organizationId },
            select: { id: true },
        });
        return user?.id || null;
    }

    /**
     * Infer bank name from account ID pattern (sandbox helper).
     */
    private inferBankName(accountId: string): string {
        if (accountId.includes('hdfc')) return 'HDFC Bank';
        if (accountId.includes('sbi')) return 'State Bank of India';
        if (accountId.includes('icici')) return 'ICICI Bank';
        if (accountId.includes('axis')) return 'Axis Bank';
        if (accountId.includes('kotak')) return 'Kotak Mahindra Bank';
        return 'Primary Bank';
    }

    /**
     * Infer category from transaction narration (basic keyword matching).
     */
    private inferCategory(narration: string): string {
        const lower = narration.toLowerCase();
        if (lower.includes('salary') || lower.includes('payroll')) return 'Payroll';
        if (lower.includes('aws') || lower.includes('google') || lower.includes('azure')) return 'Software';
        if (lower.includes('rent') || lower.includes('wework')) return 'Office';
        if (lower.includes('ads') || lower.includes('marketing') || lower.includes('meta')) return 'Marketing';
        if (lower.includes('payment') || lower.includes('client') || lower.includes('invoice')) return 'Revenue';
        if (lower.includes('tax') || lower.includes('gst')) return 'Tax';
        if (lower.includes('insurance')) return 'Insurance';
        return 'General';
    }

    /**
     * Get transaction summary for an organization (used by dashboard).
     */
    async getTransactionSummary(organizationId: string) {
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true, name: true, bankName: true, balance: true },
        });

        const accountIds = bankAccounts.map(a => a.id);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const recentTransactions = await this.prisma.transaction.findMany({
            where: {
                bankAccountId: { in: accountIds },
                date: { gte: thirtyDaysAgo },
                deletedAt: null,
            },
            orderBy: { date: 'desc' },
            take: 50,
            select: {
                id: true,
                amount: true,
                type: true,
                category: true,
                description: true,
                date: true,
                source: true,
            },
        });

        const totalBalance = bankAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

        return {
            accounts: bankAccounts,
            totalBalance,
            recentTransactions,
            transactionCount: recentTransactions.length,
        };
    }
}
