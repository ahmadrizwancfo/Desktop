import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartupProfileService } from '../startup-profile/startup-profile.service';
import * as Papa from 'papaparse';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        private prisma: PrismaService,
        private startupProfileService: StartupProfileService,
    ) { }

    async processCsvUpload(file: Express.Multer.File, importType: string, organizationId: string, userId: string) {
        this.logger.log(`Processing CSV upload (${importType}) for organization ${organizationId}`);

        // 1. Parse CSV
        const csvText = file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

        if (parsed.errors.length > 0) {
            this.logger.warn(`CSV Parse warnings: ${JSON.stringify(parsed.errors)}`);
        }
        
        const rows = parsed.data as Record<string, any>[];
        if (rows.length === 0) {
            throw new BadRequestException('CSV file is empty or invalid format');
        }

        // Validate Headers - look for at least date and amount equivalent columns
        const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
        const hasDate = headers.some(h => h.includes('date'));
        const hasAmount = headers.some(h => h.includes('amount') || h.includes('value'));

        if (!hasDate || !hasAmount) {
            throw new BadRequestException('CSV is missing required columns. Must have at least "Date" and "Amount" (or "Value").');
        }

        // 2. Log Raw Import (Sync History)
        const rawImport = await this.prisma.rawImport.create({
            data: {
                userId,
                organizationId,
                provider: 'CSV_MANUAL',
                sourceType: importType,
                rawPayload: parsed.data as any,
                status: 'PROCESSING',
            }
        });

        // 3. Ensure a Bank Account exists for linking transactions
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId, deletedAt: null }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    name: 'Main Account (Auto-Created)',
                    bankName: 'Manual Integration',
                    organizationId,
                    balance: 0,
                }
            });
        }

        // 4. Map Rows to Transactions
        let importedCount = 0;
        let duplicateCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        let totalRevenueImported = 0;
        let totalExpenseImported = 0;

        for (const row of rows) {
            // Find likely columns regardless of exact casing
            const getDateCol = () => row['Date'] || row['date'] || row['Transaction Date'] || row['transaction_date'];
            const getAmountCol = () => row['Amount'] || row['amount'] || row['Value'] || row['value'];
            const getDescCol = () => row['Description'] || row['description'] || row['Memo'] || row['memo'] || row['Notes'] || row['notes'] || 'CSV Import';
            const getTypeCol = () => row['Type'] || row['type'] || row['Transaction Type'];

            const rawDate = getDateCol();
            const rawAmount = getAmountCol();
            const rawDesc = getDescCol();
            
            if (!rawDate || !rawAmount) {
                failedCount++;
                continue;
            }

            // Parse Date
            const parsedDate = new Date(rawDate);
            if (isNaN(parsedDate.getTime())) {
                failedCount++;
                continue;
            }

            // Parse Amount
            const stringAmount = String(rawAmount).replace(/[^0-9.-]+/g, '');
            const amountVal = parseFloat(stringAmount);
            if (isNaN(amountVal) || amountVal === 0) {
                failedCount++;
                continue;
            }

            // Determine type and absolute amount
            let finalType: 'INCOME' | 'EXPENSE' | 'TRANSFER' = amountVal > 0 ? 'INCOME' : 'EXPENSE';
            if (importType === 'REVENUE') finalType = 'INCOME';
            if (importType === 'EXPENSE') finalType = 'EXPENSE';

            // Some banks provide Type explicitly
            const rawType = getTypeCol();
            if (rawType && typeof rawType === 'string') {
                if (rawType.toLowerCase().includes('credit') || rawType.toLowerCase().includes('cr')) finalType = 'INCOME';
                if (rawType.toLowerCase().includes('debit') || rawType.toLowerCase().includes('dr')) finalType = 'EXPENSE';
            }

            const absAmount = Math.abs(amountVal);
            const category = this.categorize(rawDesc, finalType);

            // Deduplication logic — create externalId hash based on Date + Amount + Description
            const hashString = `${parsedDate.toISOString().split('T')[0]}_${absAmount}_${rawDesc.toLowerCase().trim()}_${finalType}`;
            const externalId = crypto.createHash('md5').update(hashString).digest('hex');

            // Check if exists
            const existing = await this.prisma.transaction.findFirst({
                where: {
                    date: parsedDate,
                    amount: absAmount,
                    source: 'CSV_UPLOAD',
                    externalId: externalId
                }
            });

            if (existing) {
                duplicateCount++;
                continue;
            }

            // Save transaction
            await this.prisma.transaction.create({
                data: {
                    amount: absAmount,
                    type: finalType,
                    category,
                    description: rawDesc,
                    date: parsedDate,
                    bankAccountId: bankAccount.id,
                    source: 'CSV_MANUAL',
                    externalId,
                }
            });

            importedCount++;
            if (finalType === 'INCOME') totalRevenueImported += absAmount;
            if (finalType === 'EXPENSE') totalExpenseImported += absAmount;
        }

        // 5. Compute new StartupProfile constraints and Recompute Engine
        let finalProfileMetrics: any = null;
        if (importedCount > 0) {
            finalProfileMetrics = await this.recalculateProfileAggregations(userId, organizationId);
        }

        // Update import status
        await this.prisma.rawImport.update({
            where: { id: rawImport.id },
            data: { status: 'COMPLETED' }
        });

        // Upsert connection status
        await this.upsertConnectionStatus(userId, organizationId);

        return {
            status: 'success',
            message: `Processed ${rows.length} rows. Imported: ${importedCount}. Duplicates skipped: ${duplicateCount}.`,
            importedCount,
            duplicateCount,
            skippedCount,
            failedCount,
            totalRevenueImported,
            totalExpenseImported,
            finalProfileMetrics
        };
    }

    private categorize(description: string, type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): string {
        if (type === 'INCOME') return 'revenue';

        const desc = description.toLowerCase();
        if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wages')) return 'payroll';
        if (desc.includes('aws') || desc.includes('google') || desc.includes('notion') || desc.includes('github') || desc.includes('software')) return 'software';
        if (desc.includes('ads') || desc.includes('fb ') || desc.includes('meta ') || desc.includes('google ad') || desc.includes('marketing')) return 'marketing';
        if (desc.includes('rent') || desc.includes('wework')) return 'rent';
        if (desc.includes('tax') || desc.includes('gst') || desc.includes('tds')) return 'tax';
        
        return 'misc';
    }

    public async recalculateProfileAggregations(userId: string, organizationId: string) {
        // Find existing profile
        const profile = await this.prisma.startupProfile.findUnique({
            where: { userId }
        });
        
        if (!profile) return null; // Silent skip if no profile exists yet to update

        // Calculate this month's revenue and expenses
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const currentMonthTransactions = await this.prisma.transaction.findMany({
            where: {
                bankAccount: { organizationId },
                date: { gte: firstDayOfMonth },
                deletedAt: null
            }
        });

        const monthlyRevenue = currentMonthTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const monthlyExpenses = currentMonthTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Sum across all active bank accounts for total cash
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null }
        });
        
        // Let's strictly enforce that cash is the difference in all transactions acting as baseline:
        const allTxs = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId }, deletedAt: null }
        });

        // ----------------------------------------------------
        // Single Source of Truth: Auto-seed missing historical cash
        // ----------------------------------------------------
        if (allTxs.length === 0 && Number(profile.cashInBank) > 0) {
            let defaultAccount = await this.prisma.bankAccount.findFirst({ where: { organizationId, deletedAt: null } });
            if (!defaultAccount) {
                 defaultAccount = await this.prisma.bankAccount.create({ data: { name: 'Main Account', bankName: 'Default', currency: 'INR', organizationId, balance: 0 }});
            }
            await this.prisma.transaction.create({
                data: {
                    amount: Number(profile.cashInBank),
                    type: 'INCOME',
                    category: 'Opening Balance',
                    description: 'Auto-generated Initial Balance',
                    date: new Date(),
                    bankAccountId: defaultAccount.id,
                    source: 'SYSTEM_MIGRATION',
                    externalId: `migration_opening_balance_${organizationId}`
                }
            });
            // append to allTxs so it gets counted currently
            allTxs.push({ amount: Number(profile.cashInBank) as any, type: 'INCOME' } as any);
        }

        const allIncome = allTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
        const allExpenses = allTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
        const effectiveCash = allIncome - allExpenses;

        // Route through StartupProfileService upsert so engine + snapshots happen!
        const updatedProfile = await this.startupProfileService.upsert(userId, {
            organizationId,
            companyName: profile.companyName,
            stage: profile.stage as any,
            teamSize: profile.teamSize,
            industry: profile.industry,
            primaryGoal: profile.primaryGoal as any,
            country: profile.country,
            
            // New aggregations
            monthlyRevenue: monthlyRevenue,
            monthlyExpenses: monthlyExpenses,
            cashInBank: effectiveCash,
        });

        return {
            monthlyRevenue,
            monthlyExpenses,
            cashInBank: effectiveCash
        };
    }

    private async upsertConnectionStatus(userId: string, organizationId: string) {
        const existing = await this.prisma.integrationConnection.findFirst({
            where: { organizationId, provider: 'CSV_MANUAL' }
        });

        if (existing) {
            await this.prisma.integrationConnection.update({
                where: { id: existing.id },
                data: {
                    status: 'ACTIVE',
                    lastSyncedAt: new Date(),
                }
            });
        } else {
            await this.prisma.integrationConnection.create({
                data: {
                    userId,
                    organizationId,
                    provider: 'CSV_MANUAL',
                    status: 'ACTIVE',
                    lastSyncedAt: new Date(),
                }
            });
        }
    }
}
