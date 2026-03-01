import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentAnalysisService } from '../ocr/document-analysis.service';
import { AiService } from '../ai/ai.service';
import { TransactionType } from '@prisma/client';

interface ImportResult {
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    transactions: Array<{
        id?: string;
        date: string;
        description: string;
        amount: number;
        type: 'CREDIT' | 'DEBIT';
        category?: string;
        status: 'IMPORTED' | 'DUPLICATE' | 'ERROR';
    }>;
    summary: {
        totalCredits: number;
        totalDebits: number;
        netFlow: number;
        period?: { from: string; to: string };
    };
}

interface InvoiceImportResult {
    success: boolean;
    invoiceId?: string;
    invoiceNumber?: string;
    vendorName?: string;
    amount?: number;
    taxAmount?: number;
    tdsInfo?: {
        applicable: boolean;
        section?: string;
        rate?: number;
        amount?: number;
    };
    errors: string[];
}

@Injectable()
export class DocumentImportService {
    private readonly logger = new Logger(DocumentImportService.name);

    constructor(
        private prisma: PrismaService,
        private documentAnalysisService: DocumentAnalysisService,
        private aiService: AiService,
    ) { }

    /**
     * Import transactions from a bank statement document
     */
    async importBankStatement(
        organizationId: string,
        bankAccountId: string,
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<ImportResult> {
        this.logger.log(`Importing bank statement: ${filename}`);

        const result: ImportResult = {
            success: false,
            imported: 0,
            skipped: 0,
            errors: [],
            transactions: [],
            summary: {
                totalCredits: 0,
                totalDebits: 0,
                netFlow: 0,
            },
        };

        try {
            // Analyze the bank statement
            const analysis = await this.documentAnalysisService.analyzeBankStatement(
                buffer,
                mimeType,
                filename
            );

            if (!analysis.success || analysis.transactions.length === 0) {
                result.errors.push('No transactions found in the document');
                return result;
            }

            result.summary = {
                totalCredits: analysis.summary.totalCredits,
                totalDebits: analysis.summary.totalDebits,
                netFlow: analysis.summary.totalCredits - analysis.summary.totalDebits,
            };

            // Process each transaction
            for (const tx of analysis.transactions) {
                try {
                    // Parse date
                    const parsedDate = this.parseIndianDate(tx.date);
                    if (!parsedDate) {
                        result.transactions.push({
                            ...tx,
                            status: 'ERROR',
                        });
                        result.errors.push(`Invalid date: ${tx.date}`);
                        continue;
                    }

                    // Check for duplicates
                    const existing = await this.prisma.transaction.findFirst({
                        where: {
                            bankAccountId,
                            amount: tx.amount,
                            date: {
                                gte: new Date(parsedDate.getTime() - 86400000), // 1 day before
                                lte: new Date(parsedDate.getTime() + 86400000), // 1 day after
                            },
                            description: {
                                contains: tx.description.substring(0, 20),
                            },
                        },
                    });

                    if (existing) {
                        result.transactions.push({
                            ...tx,
                            status: 'DUPLICATE',
                        });
                        result.skipped++;
                        continue;
                    }

                    // Auto-categorize using AI
                    let category = tx.category || 'Other';
                    if (!tx.category || tx.category === 'Other') {
                        try {
                            const categorization = await this.aiService.categorizeTransaction(
                                organizationId,
                                tx.description,
                                tx.amount
                            );
                            category = categorization.category;
                        } catch (e) {
                            // Use default category on AI failure
                        }
                    }

                    // Create transaction
                    const created = await this.prisma.transaction.create({
                        data: {
                            bankAccountId,
                            amount: tx.amount,
                            type: tx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                            category,
                            description: tx.description,
                            date: parsedDate,
                            metadata: {
                                importedFrom: filename,
                                importedAt: new Date().toISOString(),
                                originalCategory: tx.category,
                            },
                        },
                    });

                    result.transactions.push({
                        ...tx,
                        id: created.id,
                        category,
                        status: 'IMPORTED',
                    });
                    result.imported++;
                } catch (error) {
                    result.transactions.push({
                        ...tx,
                        status: 'ERROR',
                    });
                    result.errors.push(`Failed to import: ${tx.description} - ${error.message}`);
                }
            }

            // Update bank account balance (simplified - in production, reconcile properly)
            if (result.imported > 0) {
                const netChange = result.summary.netFlow;
                await this.prisma.bankAccount.update({
                    where: { id: bankAccountId },
                    data: {
                        balance: { increment: netChange },
                    },
                });
            }

            result.success = result.imported > 0;
            this.logger.log(`Import complete: ${result.imported} imported, ${result.skipped} skipped`);
        } catch (error) {
            result.errors.push(`Import failed: ${error.message}`);
            this.logger.error(`Bank statement import failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Import an invoice from a document
     */
    async importInvoice(
        organizationId: string,
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<InvoiceImportResult> {
        this.logger.log(`Importing invoice: ${filename}`);

        const result: InvoiceImportResult = {
            success: false,
            errors: [],
        };

        try {
            // Analyze the invoice
            const analysis = await this.documentAnalysisService.analyzeInvoice(
                buffer,
                mimeType,
                filename
            );

            if (!analysis.success) {
                result.errors.push('Failed to analyze invoice');
                return result;
            }

            // Find or create vendor
            let vendorId: string | undefined;
            if (analysis.vendorName) {
                let vendor = await this.prisma.vendor.findFirst({
                    where: {
                        organizationId,
                        name: { contains: analysis.vendorName, mode: 'insensitive' },
                    },
                });

                if (!vendor) {
                    vendor = await this.prisma.vendor.create({
                        data: {
                            name: analysis.vendorName,
                            gstin: analysis.gstNumber,
                            organizationId,
                        },
                    });
                }
                vendorId = vendor.id;
            }

            // Create the invoice (as a bill to pay)
            const invoice = await this.prisma.invoice.create({
                data: {
                    invoiceNumber: analysis.invoiceNumber || `INV-${Date.now()}`,
                    amount: analysis.totalAmount || 0,
                    tax: analysis.taxAmount || 0,
                    status: 'DRAFT',
                    dueDate: analysis.dueDate ? new Date(analysis.dueDate) : new Date(Date.now() + 30 * 86400000),
                    organizationId,
                    vendorId: vendorId,
                },
            });

            result.success = true;
            result.invoiceId = invoice.id;
            result.invoiceNumber = analysis.invoiceNumber;
            result.vendorName = analysis.vendorName;
            result.amount = analysis.totalAmount;
            result.taxAmount = analysis.taxAmount;

            if (analysis.tdsApplicable) {
                result.tdsInfo = {
                    applicable: true,
                    section: analysis.tdsSection,
                    rate: analysis.tdsRate,
                    amount: analysis.totalAmount && analysis.tdsRate
                        ? (analysis.totalAmount * analysis.tdsRate / 100)
                        : undefined,
                };
            }

            this.logger.log(`Invoice imported: ${invoice.invoiceNumber}`);
        } catch (error) {
            result.errors.push(`Import failed: ${error.message}`);
            this.logger.error(`Invoice import failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Analyze Balance Sheet
     */
    async analyzeBalanceSheet(
        organizationId: string,
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<{
        success: boolean;
        period?: string;
        assets?: {
            currentAssets: number;
            fixedAssets: number;
            totalAssets: number;
            breakdown: Record<string, number>;
        };
        liabilities?: {
            currentLiabilities: number;
            longTermLiabilities: number;
            totalLiabilities: number;
            breakdown: Record<string, number>;
        };
        equity?: {
            shareCapital: number;
            reserves: number;
            retainedEarnings: number;
            totalEquity: number;
        };
        ratios?: {
            currentRatio: number;
            debtToEquity: number;
            workingCapital: number;
        };
        insights: string[];
        errors: string[];
    }> {
        const analysis = await this.documentAnalysisService.analyzeDocument(
            buffer,
            mimeType,
            filename
        );

        // Extract balance sheet specific data from AI insights
        const result = {
            success: false,
            insights: [] as string[],
            errors: [] as string[],
        };

        if (!analysis.success) {
            result.errors.push('Failed to analyze document');
            return result;
        }

        // Parse amounts for common balance sheet items
        const amounts = analysis.extractedData.amounts || [];
        const text = analysis.aiInsights?.toLowerCase() || '';

        // Try to identify asset values
        const assets = {
            currentAssets: 0,
            fixedAssets: 0,
            totalAssets: 0,
            breakdown: {} as Record<string, number>,
        };

        const liabilities = {
            currentLiabilities: 0,
            longTermLiabilities: 0,
            totalLiabilities: 0,
            breakdown: {} as Record<string, number>,
        };

        const equity = {
            shareCapital: 0,
            reserves: 0,
            retainedEarnings: 0,
            totalEquity: 0,
        };

        // Parse from amounts context
        for (const amt of amounts) {
            const ctx = amt.context.toLowerCase();
            if (ctx.includes('total asset')) {
                assets.totalAssets = amt.value;
            } else if (ctx.includes('current asset')) {
                assets.currentAssets = amt.value;
            } else if (ctx.includes('fixed asset') || ctx.includes('non-current asset')) {
                assets.fixedAssets = amt.value;
            } else if (ctx.includes('total liabilit')) {
                liabilities.totalLiabilities = amt.value;
            } else if (ctx.includes('current liabilit')) {
                liabilities.currentLiabilities = amt.value;
            } else if (ctx.includes('share capital') || ctx.includes('paid-up capital')) {
                equity.shareCapital = amt.value;
            } else if (ctx.includes('reserve')) {
                equity.reserves = amt.value;
            } else if (ctx.includes('retained earning') || ctx.includes('surplus')) {
                equity.retainedEarnings = amt.value;
            }
        }

        // Calculate totals if not found
        if (!assets.totalAssets && (assets.currentAssets || assets.fixedAssets)) {
            assets.totalAssets = assets.currentAssets + assets.fixedAssets;
        }
        if (!liabilities.totalLiabilities && liabilities.currentLiabilities) {
            liabilities.totalLiabilities = liabilities.currentLiabilities + liabilities.longTermLiabilities;
        }
        equity.totalEquity = equity.shareCapital + equity.reserves + equity.retainedEarnings;

        // Calculate ratios
        const ratios = {
            currentRatio: liabilities.currentLiabilities > 0
                ? parseFloat((assets.currentAssets / liabilities.currentLiabilities).toFixed(2))
                : 0,
            debtToEquity: equity.totalEquity > 0
                ? parseFloat((liabilities.totalLiabilities / equity.totalEquity).toFixed(2))
                : 0,
            workingCapital: assets.currentAssets - liabilities.currentLiabilities,
        };

        // Generate insights
        if (ratios.currentRatio < 1) {
            result.insights.push('⚠️ Current ratio below 1 indicates potential liquidity issues');
        } else if (ratios.currentRatio > 2) {
            result.insights.push('✅ Strong current ratio indicates good short-term liquidity');
        }

        if (ratios.debtToEquity > 2) {
            result.insights.push('⚠️ High debt-to-equity ratio suggests heavy reliance on debt financing');
        }

        if (ratios.workingCapital < 0) {
            result.insights.push('🚨 Negative working capital - immediate attention required');
        }

        return {
            success: true,
            assets: assets.totalAssets > 0 ? assets : undefined,
            liabilities: liabilities.totalLiabilities > 0 ? liabilities : undefined,
            equity: equity.totalEquity > 0 ? equity : undefined,
            ratios: assets.totalAssets > 0 ? ratios : undefined,
            insights: result.insights,
            errors: result.errors,
        };
    }

    /**
     * Analyze Profit & Loss Statement
     */
    async analyzeProfitAndLoss(
        organizationId: string,
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<{
        success: boolean;
        period?: { from: string; to: string };
        revenue?: {
            total: number;
            breakdown: Record<string, number>;
        };
        expenses?: {
            total: number;
            breakdown: Record<string, number>;
        };
        profitability?: {
            grossProfit: number;
            grossMargin: number;
            operatingProfit: number;
            operatingMargin: number;
            netProfit: number;
            netMargin: number;
        };
        insights: string[];
        errors: string[];
    }> {
        const analysis = await this.documentAnalysisService.analyzeDocument(
            buffer,
            mimeType,
            filename
        );

        const result = {
            success: false,
            insights: [] as string[],
            errors: [] as string[],
        };

        if (!analysis.success) {
            result.errors.push('Failed to analyze document');
            return result;
        }

        const amounts = analysis.extractedData.amounts || [];

        let revenue = { total: 0, breakdown: {} as Record<string, number> };
        let expenses = { total: 0, breakdown: {} as Record<string, number> };
        let grossProfit = 0;
        let operatingProfit = 0;
        let netProfit = 0;

        // Parse amounts
        for (const amt of amounts) {
            const ctx = amt.context.toLowerCase();
            if (ctx.includes('total revenue') || ctx.includes('total income') || ctx.includes('total sales')) {
                revenue.total = amt.value;
            } else if (ctx.includes('cost of goods') || ctx.includes('cogs')) {
                expenses.breakdown['Cost of Goods Sold'] = amt.value;
            } else if (ctx.includes('gross profit')) {
                grossProfit = amt.value;
            } else if (ctx.includes('operating') && ctx.includes('expense')) {
                expenses.breakdown['Operating Expenses'] = amt.value;
            } else if (ctx.includes('operating profit') || ctx.includes('ebit')) {
                operatingProfit = amt.value;
            } else if (ctx.includes('net profit') || ctx.includes('net income') || ctx.includes('pat')) {
                netProfit = amt.value;
            } else if (ctx.includes('total expense')) {
                expenses.total = amt.value;
            } else if (ctx.includes('salary') || ctx.includes('employee')) {
                expenses.breakdown['Salaries'] = amt.value;
            } else if (ctx.includes('rent')) {
                expenses.breakdown['Rent'] = amt.value;
            } else if (ctx.includes('depreciation')) {
                expenses.breakdown['Depreciation'] = amt.value;
            } else if (ctx.includes('interest')) {
                expenses.breakdown['Interest'] = amt.value;
            }
        }

        // Calculate totals if not found
        if (!expenses.total && Object.keys(expenses.breakdown).length > 0) {
            expenses.total = Object.values(expenses.breakdown).reduce((a, b) => a + b, 0);
        }

        // Calculate margins
        const profitability = {
            grossProfit,
            grossMargin: revenue.total > 0 ? parseFloat(((grossProfit / revenue.total) * 100).toFixed(1)) : 0,
            operatingProfit,
            operatingMargin: revenue.total > 0 ? parseFloat(((operatingProfit / revenue.total) * 100).toFixed(1)) : 0,
            netProfit,
            netMargin: revenue.total > 0 ? parseFloat(((netProfit / revenue.total) * 100).toFixed(1)) : 0,
        };

        // Generate insights
        if (profitability.netMargin < 0) {
            result.insights.push('🚨 Company is operating at a loss');
        } else if (profitability.netMargin < 5) {
            result.insights.push('⚠️ Thin profit margins - consider cost optimization');
        } else if (profitability.netMargin > 15) {
            result.insights.push('✅ Healthy profit margins');
        }

        if (profitability.grossMargin < 30) {
            result.insights.push('⚠️ Low gross margin may indicate pricing or cost issues');
        }

        return {
            success: true,
            revenue: revenue.total > 0 ? revenue : undefined,
            expenses: expenses.total > 0 ? expenses : undefined,
            profitability: revenue.total > 0 ? profitability : undefined,
            insights: result.insights,
            errors: result.errors,
        };
    }

    /**
     * Parse Indian date formats
     */
    private parseIndianDate(dateStr: string): Date | null {
        try {
            // Try DD/MM/YYYY or DD-MM-YYYY
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;

                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }

            // Try "DD Mon YYYY" format
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{2,4})/i);
            if (match) {
                const day = parseInt(match[1], 10);
                const monthIdx = monthNames.findIndex(m => match[2].toLowerCase().startsWith(m));
                let year = parseInt(match[3], 10);
                if (year < 100) year += 2000;

                if (monthIdx >= 0) {
                    const date = new Date(year, monthIdx, day);
                    if (!isNaN(date.getTime())) return date;
                }
            }

            return null;
        } catch {
            return null;
        }
    }
}
