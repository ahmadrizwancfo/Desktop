import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartupProfileService } from '../startup-profile/startup-profile.service';
import * as Papa from 'papaparse';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        private prisma: PrismaService,
        private startupProfileService: StartupProfileService,
    ) { }

    async processCsvUpload(file: Express.Multer.File, importType: string, organizationId: string, userId: string) {
        this.logger.log(`Processing file upload (${importType}) for organization ${organizationId}`);

        // 1. Parse file — CSV or Excel
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        let rows: Record<string, any>[];

        if (extension === 'xlsx' || extension === 'xls') {
            // Parse Excel with the xlsx library
            const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new BadRequestException('Excel file has no sheets');
            }
            const sheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        } else {
            // Parse CSV with PapaParse
            const csvText = file.buffer.toString('utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsed.errors.length > 0) {
                this.logger.warn(`CSV Parse warnings: ${JSON.stringify(parsed.errors)}`);
            }
            rows = parsed.data as Record<string, any>[];
        }
        if (rows.length === 0) {
            throw new BadRequestException('File is empty or has no data rows');
        }

        // ── Schema Detection ────────────────────────────────────────────────────
        // Auto-detect what kind of financial data this file contains and route
        // to the correct processing pipeline.
        const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
        this.logger.log(`Detected columns: [${headers.join(', ')}]`);

        const hasCol = (...synonyms: string[]) =>
            headers.some(h => synonyms.some(s => h === s || h.includes(s)));

        // Balance-sheet / financial-metrics fingerprint
        const isBalanceSheet = hasCol('total_assets', 'total assets', 'totalassets')
            || hasCol('equity', 'total_equity', 'shareholders equity')
            || hasCol('total_liabilities', 'total liabilities', 'totalliabilities')
            || (hasCol('cash', 'accounts_receivable', 'fixed_assets') && !hasCol('date', 'txn date'));

        // Transaction / bank-statement fingerprint
        const DATE_SYNONYMS   = ['date', 'txn date', 'transaction date', 'value date', 'trans date', 'posting date', 'entry date'];
        const AMOUNT_SYNONYMS = ['amount', 'value', 'net amount', 'transaction amount', 'txn amount'];
        const DEBIT_SYNONYMS  = ['debit', 'dr', 'withdrawal', 'withdrawal amt', 'debit amount'];
        const CREDIT_SYNONYMS = ['credit', 'cr', 'deposit', 'deposit amt', 'credit amount'];

        const hasDate   = hasCol(...DATE_SYNONYMS);
        const hasAmount = hasCol(...AMOUNT_SYNONYMS)
                       || (hasCol(...DEBIT_SYNONYMS) && hasCol(...CREDIT_SYNONYMS));
        const isTransactionFile = hasDate && hasAmount;

        // ── Route to correct pipeline ────────────────────────────────────────────
        if (isBalanceSheet) {
            this.logger.log('Detected Balance Sheet / Financial Metrics file — routing to balance-sheet pipeline');
            return this.processBalanceSheetRows(rows, organizationId, userId, file.originalname);
        }

        if (!isTransactionFile) {
            throw new BadRequestException(
                `Unrecognised file format. Detected columns: [${headers.join(', ')}]. ` +
                `Supported formats: (1) Bank statements with Date + Amount/Debit/Credit columns, ` +
                `(2) Balance sheets with Assets/Liabilities/Equity columns.`
            );
        }

        // 2. Log Raw Import (Sync History)
        const rawImport = await this.prisma.rawImport.create({
            data: {
                userId,
                organizationId,
                provider: 'CSV_MANUAL',
                sourceType: importType,
                rawPayload: rows as any,
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
            // Resolve column value by trying multiple name aliases (case-insensitive)
            const resolveCol = (...aliases: string[]): any => {
                const rowKeys = Object.keys(row);
                for (const alias of aliases) {
                    const key = rowKeys.find(k => k.toLowerCase().trim() === alias.toLowerCase().trim()
                                               || k.toLowerCase().trim().includes(alias.toLowerCase().trim()));
                    if (key !== undefined && row[key] !== '' && row[key] !== null && row[key] !== undefined) {
                        return row[key];
                    }
                }
                return undefined;
            };

            const getDateCol   = () => resolveCol('date', 'txn date', 'transaction date', 'value date', 'trans date', 'posting date', 'entry date');
            const getDescCol   = () => resolveCol('description', 'narration', 'particulars', 'memo', 'remarks', 'notes', 'details', 'chq/ref no', 'ref no', 'reference') ?? 'Import';
            const getTypeCol   = () => resolveCol('type', 'transaction type', 'txn type', 'dr/cr', 'cr/dr');

            // Amount resolution: prefer unified Amount column; fall back to separate Debit/Credit columns
            const getAmountCol = (): number | undefined => {
                const unified = resolveCol('amount', 'net amount', 'transaction amount', 'txn amount', 'value', 'net');
                if (unified !== undefined && unified !== '') return Number(String(unified).replace(/[^0-9.-]+/g, '')) || undefined;

                const debit  = Number(String(resolveCol('debit', 'withdrawal', 'withdrawal amt', 'dr', 'debit amount', 'dr amount') ?? '').replace(/[^0-9.]+/g, '')) || 0;
                const credit = Number(String(resolveCol('credit', 'deposit', 'deposit amt', 'cr', 'credit amount', 'cr amount') ?? '').replace(/[^0-9.]+/g, '')) || 0;
                if (debit === 0 && credit === 0) return undefined;
                // Return signed: credit = positive (INCOME), debit = negative (EXPENSE)
                return credit > 0 ? credit : -debit;
            };

            const rawDate   = getDateCol();
            const rawAmount = getAmountCol();
            const rawDesc   = getDescCol();
            
            if (!rawDate || rawAmount === undefined) {
                failedCount++;
                continue;
            }

            // Parse Date — also handles Excel serial date numbers
            let parsedDate: Date;
            if (typeof rawDate === 'number') {
                // Excel serial date: days since 1899-12-30 (Excel epoch)
                const excelEpoch = new Date(1899, 11, 30);
                parsedDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
            } else if (rawDate instanceof Date) {
                // xlsx with cellDates:true returns a real JS Date
                parsedDate = rawDate;
            } else {
                parsedDate = new Date(rawDate);
            }
            if (isNaN(parsedDate.getTime())) {
                failedCount++;
                continue;
            }

            // Amount is already a number from getAmountCol()
            const amountVal = typeof rawAmount === 'number' ? rawAmount
                            : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
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

    // ── Balance Sheet / Financial Metrics Pipeline ───────────────────────────────
    // Maps rows with columns like Cash, Total_Assets, Equity, etc. into the
    // FinancialMetrics table. Each row = one snapshot/period.
    private async processBalanceSheetRows(
        rows: Record<string, any>[],
        organizationId: string,
        userId: string,
        sourceFile: string,
    ) {
        // Flexible column resolver (case/underscore insensitive)
        const resolve = (row: Record<string, any>, ...aliases: string[]): number | null => {
            const keys = Object.keys(row);
            for (const alias of aliases) {
                const key = keys.find(k =>
                    k.toLowerCase().replace(/_/g, ' ').trim() === alias.toLowerCase().replace(/_/g, ' ').trim()
                    || k.toLowerCase().trim() === alias.toLowerCase().trim()
                );
                if (key !== undefined && row[key] !== '' && row[key] !== null && row[key] !== undefined) {
                    const num = Number(String(row[key]).replace(/[^0-9.-]/g, ''));
                    return isNaN(num) ? null : num;
                }
            }
            return null;
        };

        let importedCount = 0;
        let failedCount   = 0;

        for (const row of rows) {
            try {
                // Map all common balance-sheet column names
                const cash                = resolve(row, 'cash', 'cash and equivalents', 'cash & equivalents');
                const accountsReceivable  = resolve(row, 'accounts_receivable', 'accounts receivable', 'receivables', 'trade receivables');
                const inventory           = resolve(row, 'inventory', 'inventories', 'stock');
                const fixedAssets         = resolve(row, 'fixed_assets', 'fixed assets', 'property plant equipment', 'ppe', 'non current assets');
                const totalAssets         = resolve(row, 'total_assets', 'total assets', 'assets total');
                const accountsPayable     = resolve(row, 'accounts_payable', 'accounts payable', 'trade payables', 'payables');
                const shortTermDebt       = resolve(row, 'short_term_debt', 'short term debt', 'current liabilities', 'current portion of debt');
                const longTermDebt        = resolve(row, 'long_term_debt', 'long term debt', 'long-term liabilities', 'non current liabilities');
                const totalLiabilities    = resolve(row, 'total_liabilities', 'total liabilities', 'liabilities total');
                const equity              = resolve(row, 'equity', 'total_equity', 'shareholders equity', "stockholders' equity", 'net worth');
                const revenue             = resolve(row, 'revenue', 'total_revenue', 'sales', 'net revenue', 'turnover');
                const netProfit           = resolve(row, 'net_profit', 'net profit', 'net income', 'profit after tax', 'pat');
                const grossProfit         = resolve(row, 'gross_profit', 'gross profit', 'gross margin');
                const totalExpenses       = resolve(row, 'total_expenses', 'total expenses', 'operating expenses', 'opex');
                const operatingCashFlow   = resolve(row, 'operating_cash_flow', 'operating cash flow', 'cash from operations', 'cfo');
                const period              = resolve(row, 'period', 'year', 'month', 'quarter', 'record_id') ?? importedCount + 1;

                // Compute derived ratios where possible
                const currentAssets       = cash !== null && accountsReceivable !== null && inventory !== null
                                          ? (cash + accountsReceivable + inventory) : null;
                const currentLiabilities  = shortTermDebt ?? accountsPayable;
                const currentRatio        = currentAssets && currentLiabilities && currentLiabilities > 0
                                          ? currentAssets / currentLiabilities : null;
                const debtToEquity        = totalLiabilities && equity && equity > 0
                                          ? totalLiabilities / equity : null;

                await this.prisma.financialMetrics.create({
                    data: {
                        organizationId,
                        documentType:       'BALANCE_SHEET',
                        period:             String(period),
                        sourceFile,
                        confidence:         'HIGH',
                        // Assets
                        currentAssets:      currentAssets       ?? undefined,
                        totalAssets:        totalAssets         ?? undefined,
                        // Liabilities
                        currentLiabilities: currentLiabilities  ?? undefined,
                        totalLiabilities:   totalLiabilities    ?? undefined,
                        // Equity
                        totalEquity:        equity              ?? undefined,
                        // P&L
                        revenue:            revenue             ?? undefined,
                        netProfit:          netProfit           ?? undefined,
                        grossProfit:        grossProfit         ?? undefined,
                        totalExpenses:      totalExpenses       ?? undefined,
                        // Cash flow
                        operatingCashFlow:  operatingCashFlow   ?? undefined,
                        // Liquidity
                        closingBalance:     cash                ?? undefined,
                        // Computed ratios
                        currentRatio:       currentRatio        ?? undefined,
                        debtToEquity:       debtToEquity        ?? undefined,
                        // Keep full raw row for auditability
                        extractedFields:    Object.keys(row),
                    }
                });

                importedCount++;
            } catch (err) {
                this.logger.warn(`Failed to import balance-sheet row: ${JSON.stringify(err)}`);
                failedCount++;
            }
        }

        await this.upsertConnectionStatus(userId, organizationId);

        return {
            status:         'success',
            dataType:       'BALANCE_SHEET',
            message:        `Imported ${importedCount} financial metric snapshot(s) from ${rows.length} rows.`,
            importedCount,
            failedCount,
            duplicateCount: 0,
            skippedCount:   0,
        };
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
