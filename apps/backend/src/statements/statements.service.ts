import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UniversalParserService } from './parsers/universal-parser.service';
import { FinancialAnalyzerService } from './analyzers/financial-analyzer.service';
import * as xml2js from 'xml2js';
import { TransactionType } from '@prisma/client';

@Injectable()
export class StatementsService {
    private readonly logger = new Logger(StatementsService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private universalParser: UniversalParserService,
        private financialAnalyzer: FinancialAnalyzerService,
    ) { }

    async processUpload(file: Express.Multer.File, organizationId: string, userId: string) {
        this.logger.log(`Processing file upload: ${file.originalname} for org: ${organizationId}`);

        const extension = file.originalname.split('.').pop()?.toLowerCase();

        // Handle Tally XML separately (maintains existing functionality)
        if (extension === 'xml') {
            return this.processTallyXml(file, organizationId, userId);
        }

        // For PDF, Excel, CSV, and Image files - use AI-powered universal analysis

        try {
            // Step 1: Parse document
            const parsedDoc = await this.universalParser.parse(file.buffer, file.originalname, organizationId);
            this.logger.log(`Successfully parsed ${extension} file`);

            // Step 2: AI Analysis to extract financial metrics
            const analysis = await this.financialAnalyzer.analyze(parsedDoc);
            this.logger.log(`AI extracted ${analysis.extractedFields.length} fields with ${analysis.confidence} confidence`);

            // Step 3: Store metrics in database
            const metrics = await this.prisma.financialMetrics.create({
                data: {
                    organizationId,
                    documentType: analysis.documentType,
                    period: analysis.period,
                    currency: analysis.currency,
                    sourceFile: file.originalname,
                    confidence: analysis.confidence,

                    // Balance Sheet
                    totalAssets: analysis.totalAssets,
                    totalLiabilities: analysis.totalLiabilities,
                    totalEquity: analysis.totalEquity,
                    currentAssets: analysis.currentAssets,
                    currentLiabilities: analysis.currentLiabilities,
                    currentRatio: analysis.currentRatio,
                    debtToEquity: analysis.debtToEquity,

                    // P&L
                    revenue: analysis.revenue,
                    totalExpenses: analysis.totalExpenses,
                    netProfit: analysis.netProfit,
                    grossProfit: analysis.grossProfit,
                    ebitda: analysis.ebitda,
                    profitMargin: analysis.profitMargin,

                    // Cash Flow
                    operatingCashFlow: analysis.operatingCashFlow,
                    investingCashFlow: analysis.investingCashFlow,
                    financingCashFlow: analysis.financingCashFlow,
                    netCashFlow: analysis.netCashFlow,

                    // Burn & Runway
                    monthlyBurn: analysis.monthlyBurn,
                    cashRunway: analysis.cashRunway,

                    // Bank Statement
                    openingBalance: analysis.openingBalance,
                    closingBalance: analysis.closingBalance,
                    totalCredits: analysis.totalCredits,
                    totalDebits: analysis.totalDebits,

                    // GST
                    gstLiability: analysis.gstLiability,
                    inputTaxCredit: analysis.inputTaxCredit,
                    netGstPayable: analysis.netGstPayable,

                    // Invoices
                    totalInvoiceValue: analysis.totalInvoiceValue,
                    pendingReceivables: analysis.pendingReceivables,

                    extractedFields: analysis.extractedFields,
                    warnings: analysis.warnings,
                }
            });

            // Step 4: Create success notification
            await this.prisma.notification.create({
                data: {
                    userId,
                    title: `${analysis.documentType} Analyzed`,
                    message: `Extracted ${analysis.extractedFields.length} metrics with ${analysis.confidence} confidence from ${file.originalname}`,
                    type: 'SUCCESS'
                }
            });

            // Step 5: Get AI summary
            const summary = await this.aiService.generateSummary(
                `Document Type: ${analysis.documentType}\nExtracted Fields: ${analysis.extractedFields.join(', ')}\nKey Metrics: ${JSON.stringify({
                    revenue: analysis.revenue,
                    expenses: analysis.totalExpenses,
                    profit: analysis.netProfit,
                    burn: analysis.monthlyBurn,
                    runway: analysis.cashRunway
                })}`
            );

            return {
                success: true,
                message: 'File analyzed successfully',
                metrics,
                aiAnalysis: summary,
                extractedFields: analysis.extractedFields,
                warnings: analysis.warnings,
                confidence: analysis.confidence
            };

        } catch (error) {
            this.logger.error(`Analysis failed: ${error.message}`);

            // Create error notification
            await this.prisma.notification.create({
                data: {
                    userId,
                    title: 'Analysis Failed',
                    message: error.message || 'Failed to analyze document',
                    type: 'ERROR'
                }
            });

            throw new BadRequestException(
                error.message || 'Failed to analyze document. Ensure it contains valid financial data.'
            );
        }
    }

    private async processTallyXml(file: Express.Multer.File, organizationId: string, userId: string) {
        const xmlContent = file.buffer.toString();
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlContent);

        const vouchers = this.findVouchers(result);

        if (vouchers.length === 0) {
            throw new BadRequestException('No vouchers found in Tally XML');
        }

        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId, name: 'Tally Import' }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    organizationId,
                    name: 'Tally Import',
                    accountNumber: 'TALLY-' + Date.now().toString().slice(-4),
                    bankName: 'Tally Virtual Bank',
                    balance: 0,
                    currency: 'INR'
                }
            });
        }

        let totalAmount = 0;
        let count = 0;

        for (const voucher of vouchers) {
            try {
                const dateStr = voucher.DATE?.[0];
                const amountStr = voucher['ALLLEDGERENTRIES.LIST']?.[0]?.AMOUNT?.[0] || '0';
                const narration = voucher.NARRATION?.[0] || 'Imported from Tally';
                const partyName = voucher.PARTYLEDGERNAME?.[0] || 'Unknown Party';
                const voucherType = voucher.VOUCHERTYPENAME?.[0];

                const amount = Math.abs(parseFloat(amountStr));

                let type: TransactionType = 'EXPENSE';
                if (['Receipt', 'Sales'].includes(voucherType)) {
                    type = 'INCOME';
                }

                if (amount > 0 && dateStr) {
                    const date = new Date(
                        parseInt(dateStr.substring(0, 4)),
                        parseInt(dateStr.substring(4, 6)) - 1,
                        parseInt(dateStr.substring(6, 8))
                    );

                    await this.prisma.transaction.create({
                        data: {
                            bankAccountId: bankAccount.id,
                            amount,
                            type,
                            date,
                            description: `${partyName} - ${narration}`,
                            category: voucherType,
                            metadata: { reference: voucher.VOUCHERNUMBER?.[0] }
                        }
                    });

                    totalAmount += amount;
                    count++;
                }
            } catch (e) {
                this.logger.warn(`Failed to parse voucher: ${e.message}`);
                continue;
            }
        }

        await this.prisma.notification.create({
            data: {
                userId,
                title: 'Tally Import Complete',
                message: `Imported ${count} transactions totaling ₹${(totalAmount / 100000).toFixed(2)}L`,
                type: 'SUCCESS'
            }
        });

        const analysis = await this.aiService.getChatResponse(
            organizationId,
            `I just imported ${count} Tally vouchers totaling ₹${(totalAmount / 100000).toFixed(2)}L. Summarize key insights.`
        );

        // Normalize response to match other parsers
        return {
            success: true,
            message: 'Tally XML processed successfully',
            metrics: {
                documentType: 'Tally Import',
                period: 'Imported Data',
                currency: 'INR',
                confidence: 'high',
                totalAssets: null,
                totalLiabilities: null,
                revenue: vouchers.filter(v => v.VOUCHERTYPENAME?.[0] === 'Sales').reduce((sum, v) => sum + Math.abs(parseFloat(v['ALLLEDGERENTRIES.LIST']?.[0]?.AMOUNT?.[0] || '0')), 0),
                totalExpenses: vouchers.filter(v => v.VOUCHERTYPENAME?.[0] === 'Payment' || v.VOUCHERTYPENAME?.[0] === 'Purchase').reduce((sum, v) => sum + Math.abs(parseFloat(v['ALLLEDGERENTRIES.LIST']?.[0]?.AMOUNT?.[0] || '0')), 0),
                extractedFields: ['Revenue', 'Expenses', 'Vouchers'],
                warnings: []
            },
            aiAnalysis: analysis
        };
    }

    private findVouchers(obj: any): any[] {
        let vouchers: any[] = [];

        if (obj && typeof obj === 'object') {
            if (obj.VOUCHER) {
                if (Array.isArray(obj.VOUCHER)) {
                    vouchers.push(...obj.VOUCHER);
                } else {
                    vouchers.push(obj.VOUCHER);
                }
            }

            for (const key in obj) {
                if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
                    vouchers.push(...this.findVouchers(obj[key]));
                }
            }
        }

        return vouchers;
    }
}
