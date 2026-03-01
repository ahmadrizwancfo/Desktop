
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialMetricsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardMetrics(organizationId: string) {
        // 1. Get Real-Time Data from Transactions & Bank Accounts
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        // Total Balance (Cash on Hand)
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
            select: { balance: true }
        });

        const totalBalance = bankAccounts.reduce((sum, account) => sum + Number(account.balance), 0);

        // Last 30 Days Transactions
        const transactions = await this.prisma.transaction.findMany({
            where: {
                bankAccount: { organizationId },
                date: { gte: thirtyDaysAgo }
            },
            select: { amount: true, type: true }
        });

        // Calculate Burn and Revenue directly from transactions
        let monthlyBurn = 0;
        let monthlyRevenue = 0;

        for (const tx of transactions) {
            const amount = Number(tx.amount);
            if (tx.type === 'EXPENSE' || tx.type === 'DEBIT' as any) { // Handle stored strings if enum mapping varies
                monthlyBurn += amount;
            } else if (tx.type === 'INCOME' || tx.type === 'CREDIT' as any) {
                monthlyRevenue += amount;
            }
        }

        // 2. Fallback to Latest Document Snapshot if no real transactions found
        // This is useful for users who just uploaded a PDF but haven't synced bank feeds
        const latestSnapshot = await this.prisma.financialMetrics.findFirst({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' }
        });

        // Use snapshot data if real-time data is insufficient (e.g. 0 burn calculated but snapshot has it)
        const effectiveBurn = monthlyBurn > 0 ? monthlyBurn : (Number(latestSnapshot?.monthlyBurn) || 0);
        const effectiveRevenue = monthlyRevenue > 0 ? monthlyRevenue : (Number(latestSnapshot?.revenue) || 0);

        // Use totalBalance if available, otherwise snapshot cash
        // Note: Snapshot cash is from the time of upload, bankAccount balance is live if linked
        const effectiveCash = totalBalance > 0 ? totalBalance : (Number(latestSnapshot?.currentAssets) || 0); // Using currentAssets as proxy if no balance

        // 3. Calculate Derived Metrics
        const runwayInfo = this.calculateRunway(effectiveCash, effectiveBurn);

        const netProfit = effectiveRevenue - effectiveBurn;
        const profitMargin = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;

        // 4. Return Combined Data
        const hasRealData = totalBalance > 0 || transactions.length > 0;
        const hasSnapshotData = !!latestSnapshot;

        // Message logic
        let message = null;
        if (!hasRealData && !hasSnapshotData) {
            return { hasData: false, message: 'No financial data found. Sync bank accounts or upload statements.' };
        }

        return {
            hasData: true,
            totalRevenue: effectiveRevenue,
            monthlyBurn: effectiveBurn,
            cashRunway: `${runwayInfo.months.toFixed(1)} Months`,
            runwayStatus: runwayInfo.status, // "CRITICAL", "LOW", "HEALTHY"
            profitMargin: `${profitMargin.toFixed(1)}%`,
            totalAssets: effectiveCash, // Showing Cash/Assets
            netProfit: netProfit,

            // Metadata for UI
            counts: {
                transactions: transactions.length,
                bankAccounts: bankAccounts.length
            },
            dataSource: hasRealData ? 'Real-time Transactions' : (latestSnapshot?.sourceFile || 'Manual Upload'),
            lastUpdated: hasRealData ? new Date() : latestSnapshot?.uploadedAt
        };
    }

    private calculateRunway(cash: number, monthlyBurn: number) {
        if (monthlyBurn <= 0) return { months: 120, status: 'HEALTHY' }; // Infinite/High runway

        const months = cash / monthlyBurn;
        let status = 'HEALTHY';
        if (months < 3) status = 'CRITICAL';
        else if (months < 6) status = 'LOW';

        return { months, status };
    }
}
