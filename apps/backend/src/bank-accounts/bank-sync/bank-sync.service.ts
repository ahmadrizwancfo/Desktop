import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockICICIProvider } from '../../integrations/banking/mock-icici.provider';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BankSyncService {
    private readonly logger = new Logger(BankSyncService.name);
    private readonly iciciProvider = new MockICICIProvider();

    constructor(private prisma: PrismaService) { }

    async syncAccount(bankAccountId: string) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id: bankAccountId }
        });

        if (!account) {
            throw new Error('Bank account not found');
        }

        this.logger.log(`Starting sync for account: ${account.name} (${account.accountNumber})`);

        // In a real app, we'd choose the provider based on account metadata
        const provider = this.iciciProvider;

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30); // Last 30 days
        const toDate = new Date();

        const externalTxs = await provider.getTransactions(account.accountNumber || '', fromDate, toDate);

        let syncedCount = 0;
        for (const tx of externalTxs) {
            // Check if transaction already exists (idempotency)
            // Using metadata or reference number if we had it in schema
            const exists = await this.prisma.transaction.findFirst({
                where: {
                    bankAccountId,
                    amount: tx.amount,
                    date: tx.date,
                    description: tx.description
                }
            });

            if (!exists) {
                await this.prisma.transaction.create({
                    data: {
                        amount: tx.amount,
                        type: tx.type as TransactionType,
                        category: tx.category || 'Uncategorized',
                        description: tx.description,
                        date: tx.date,
                        bankAccountId: account.id,
                        metadata: { reference: tx.referenceNumber, source: 'icici_sync' }
                    }
                });
                syncedCount++;
            }
        }

        // Update balance from real-time source
        const latestBalance = await provider.getBalance(account.accountNumber || '');
        await this.prisma.bankAccount.update({
            where: { id: bankAccountId },
            data: { balance: latestBalance }
        });

        this.logger.log(`Sync complete. Synced ${syncedCount} new transactions.`);
        return { syncedCount, balance: latestBalance };
    }
}
