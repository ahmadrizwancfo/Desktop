import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { OcrService, ExtractedFinancialData } from './ocr.service';
import * as fs from 'fs';

export interface DocumentAnalysisResult {
    success: boolean;
    documentType: string;
    summary: string;
    extractedData: ExtractedFinancialData;
    aiInsights: string;
    confidence: number;
    suggestedActions: string[];
    processingTimeMs: number;
}

@Injectable()
export class DocumentAnalysisService {
    private readonly logger = new Logger(DocumentAnalysisService.name);
    private genAI: GoogleGenerativeAI | null = null;
    private visionModel: GenerativeModel | null = null;

    constructor(
        private configService: ConfigService,
        private ocrService: OcrService,
    ) {
        this.initializeVisionModel();
    }

    private initializeVisionModel(): void {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            this.logger.warn('GEMINI_API_KEY not configured. Vision features will use OCR fallback.');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.visionModel = this.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash', // Vision-capable model
            });
            this.logger.log('Gemini Vision model initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Gemini Vision: ${error.message}`);
        }
    }

    /**
     * Analyze a document using Gemini Vision + OCR
     */
    async analyzeDocument(
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<DocumentAnalysisResult> {
        const startTime = Date.now();

        // First, try extracting text based on file type
        let ocrResult;
        try {
            if (mimeType === 'text/csv' || mimeType === 'application/csv') {
                const text = buffer.toString('utf-8');
                ocrResult = { text, confidence: 100, pages: 1, extractedData: {} };
            } else if (
                mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                mimeType === 'application/vnd.ms-excel'
            ) {
                // Dynamic import to avoid build issues if not used
                const XLSX = require('xlsx');
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                let text = '';
                workbook.SheetNames.forEach((name: string) => {
                    const sheet = workbook.Sheets[name];
                    text += XLSX.utils.sheet_to_csv(sheet) + '\n';
                });
                ocrResult = { text, confidence: 100, pages: workbook.SheetNames.length, extractedData: {} };
            } else {
                // Default to OCR service for PDF/Images
                ocrResult = await this.ocrService.extractTextFromBuffer(buffer, mimeType, filename);
            }
        } catch (error) {
            this.logger.warn(`Text extraction failed: ${error.message}`);
            ocrResult = { text: '', confidence: 0, pages: 1, extractedData: {} };
        }

        // If we have vision model and it's an image, use Gemini Vision for enhanced analysis
        if (this.visionModel && mimeType.startsWith('image/')) {
            try {
                const visionResult = await this.analyzeWithVision(buffer, mimeType, ocrResult);
                return {
                    ...visionResult,
                    processingTimeMs: Date.now() - startTime,
                };
            } catch (error) {
                this.logger.warn(`Vision analysis failed, falling back to OCR: ${error.message}`);
            }
        }

        // Fallback to OCR-only analysis
        return this.createOcrOnlyResult(ocrResult, Date.now() - startTime);
    }

    /**
     * Analyze image using Gemini Vision API
     */
    private async analyzeWithVision(
        buffer: Buffer,
        mimeType: string,
        ocrResult: any
    ): Promise<Omit<DocumentAnalysisResult, 'processingTimeMs'>> {
        if (!this.visionModel) {
            throw new Error('Vision model not initialized');
        }

        const base64Image = buffer.toString('base64');

        const imagePart: Part = {
            inlineData: {
                mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
            },
        };

        const prompt = `You are an expert Indian financial document analyzer. Analyze this financial document image and extract structured data.

Context from OCR (may have errors):
${ocrResult.text?.substring(0, 2000) || 'No OCR text available'}

Please analyze the document and respond with a JSON object containing:
{
    "documentType": "INVOICE|BANK_STATEMENT|RECEIPT|GST_RETURN|TDS_CERTIFICATE|BALANCE_SHEET|P&L|OTHER",
    "summary": "Brief 2-3 sentence summary of the document",
    "extractedData": {
        "vendorName": "Name if visible",
        "totalAmount": numeric_value,
        "taxAmount": numeric_value,
        "gstNumbers": ["array of GST numbers found"],
        "panNumbers": ["array of PAN numbers found"],
        "invoiceNumbers": ["array of invoice numbers found"],
        "accountNumbers": ["array of account numbers found"],
        "dates": [{"value": "date string", "context": "what this date represents"}],
        "amounts": [{"value": numeric, "currency": "INR", "context": "what this amount is for"}],
        "lineItems": [{"description": "item", "quantity": 1, "rate": 100, "amount": 100}],
        "rawTransactions": [{"date": "DD/MM/YYYY", "description": "...", "amount": 100, "type": "CREDIT|DEBIT"}]
    },
    "insights": "Key observations and any discrepancies or important notes",
    "suggestedActions": ["Action 1", "Action 2"],
    "confidence": 0-100
}

Important:
- For amounts, parse Indian number format (1,00,000 = 100000)
- GST numbers follow format: 29AABCT1332Q1ZS (2 digits + 5 letters + 4 digits + 1 letter + 1 digit + 1 letter + 1 digit + 1 letter)
- PAN numbers follow format: ABCDE1234F (5 letters + 4 digits + 1 letter)
- Provide actionable insights relevant to Indian tax compliance (GST, TDS, etc.)

Respond ONLY with valid JSON, no markdown or explanation.`;

        const result = await this.visionModel.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        try {
            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                return {
                    success: true,
                    documentType: parsed.documentType || 'UNKNOWN',
                    summary: parsed.summary || 'Document analyzed successfully',
                    extractedData: {
                        ...ocrResult.extractedData,
                        ...parsed.extractedData,
                        documentType: parsed.documentType,
                    },
                    aiInsights: parsed.insights || '',
                    confidence: parsed.confidence || 80,
                    suggestedActions: parsed.suggestedActions || [],
                };
            }
        } catch (parseError) {
            this.logger.warn(`Failed to parse vision response: ${parseError.message}`);
        }

        // Return basic result if parsing fails
        return {
            success: true,
            documentType: ocrResult.extractedData?.documentType || 'UNKNOWN',
            summary: 'Document analyzed with vision AI',
            extractedData: ocrResult.extractedData || {},
            aiInsights: text.substring(0, 500),
            confidence: 70,
            suggestedActions: ['Review extracted data manually'],
        };
    }

    /**
     * Create result from OCR-only analysis
     */
    private createOcrOnlyResult(
        ocrResult: any,
        processingTimeMs: number
    ): DocumentAnalysisResult {
        const extractedData = ocrResult.extractedData || {};

        // Generate basic insights from extracted data
        const insights: string[] = [];
        if (extractedData.gstNumbers?.length > 0) {
            insights.push(`Found ${extractedData.gstNumbers.length} GST number(s)`);
        }
        if (extractedData.totalAmount) {
            insights.push(`Total amount: ₹${extractedData.totalAmount.toLocaleString('en-IN')}`);
        }
        if (extractedData.taxAmount) {
            insights.push(`Tax amount: ₹${extractedData.taxAmount.toLocaleString('en-IN')}`);
        }
        if (extractedData.rawTransactions?.length > 0) {
            insights.push(`Found ${extractedData.rawTransactions.length} transaction(s)`);
        }

        // Generate suggested actions
        const actions: string[] = [];
        if (extractedData.documentType === 'INVOICE') {
            actions.push('Verify GST input credit eligibility');
            if (extractedData.totalAmount && extractedData.totalAmount > 30000) {
                actions.push('Check TDS applicability (Section 194C/J)');
            }
        }
        if (extractedData.documentType === 'BANK_STATEMENT') {
            actions.push('Reconcile transactions with books');
            actions.push('Categorize expenses for tax filing');
        }

        return {
            success: ocrResult.confidence > 50,
            documentType: extractedData.documentType || 'UNKNOWN',
            summary: `Extracted ${ocrResult.text?.length || 0} characters with ${ocrResult.confidence?.toFixed(0) || 0}% confidence`,
            extractedData,
            aiInsights: insights.join('. '),
            confidence: ocrResult.confidence || 0,
            suggestedActions: actions.length > 0 ? actions : ['Review extracted data manually'],
            processingTimeMs,
        };
    }

    /**
     * Analyze a bank statement and extract transactions
     */
    async analyzeBankStatement(
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<{
        success: boolean;
        bankName?: string;
        accountNumber?: string;
        period?: { from: string; to: string };
        openingBalance?: number;
        closingBalance?: number;
        transactions: Array<{
            date: string;
            description: string;
            amount: number;
            type: 'CREDIT' | 'DEBIT';
            balance?: number;
            category?: string;
        }>;
        summary: {
            totalCredits: number;
            totalDebits: number;
            transactionCount: number;
        };
    }> {
        const analysis = await this.analyzeDocument(buffer, mimeType, filename);

        const transactions = analysis.extractedData.rawTransactions || [];

        // Calculate summary
        const totalCredits = transactions
            .filter(t => t.type === 'CREDIT')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebits = transactions
            .filter(t => t.type === 'DEBIT')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            success: analysis.success,
            accountNumber: analysis.extractedData.accountNumbers?.[0],
            transactions: transactions.map(t => ({
                ...t,
                category: this.categorizeTransaction(t.description),
            })),
            summary: {
                totalCredits,
                totalDebits,
                transactionCount: transactions.length,
            },
        };
    }

    /**
     * Simple transaction categorization based on description
     */
    private categorizeTransaction(description: string): string {
        const desc = description.toLowerCase();

        if (desc.includes('salary') || desc.includes('payroll')) return 'Salary & Wages';
        if (desc.includes('rent')) return 'Rent';
        if (desc.includes('electricity') || desc.includes('power')) return 'Utilities';
        if (desc.includes('internet') || desc.includes('broadband')) return 'Utilities';
        if (desc.includes('aws') || desc.includes('azure') || desc.includes('google cloud')) return 'Cloud Infrastructure';
        if (desc.includes('uber') || desc.includes('ola') || desc.includes('cab')) return 'Travel & Conveyance';
        if (desc.includes('swiggy') || desc.includes('zomato')) return 'Food & Beverages';
        if (desc.includes('gst') || desc.includes('tax')) return 'Taxes';
        if (desc.includes('insurance')) return 'Insurance';
        if (desc.includes('subscription') || desc.includes('saas')) return 'SaaS Subscriptions';

        return 'Other';
    }

    /**
     * Analyze an invoice and extract details
     */
    async analyzeInvoice(
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<{
        success: boolean;
        vendorName?: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        dueDate?: string;
        subtotal?: number;
        taxAmount?: number;
        totalAmount?: number;
        gstNumber?: string;
        lineItems: Array<{
            description: string;
            quantity?: number;
            rate?: number;
            amount: number;
        }>;
        tdsApplicable: boolean;
        tdsSection?: string;
        tdsRate?: number;
    }> {
        const analysis = await this.analyzeDocument(buffer, mimeType, filename);

        // Determine TDS applicability
        let tdsApplicable = false;
        let tdsSection: string | undefined;
        let tdsRate: number | undefined;

        const totalAmount = analysis.extractedData.totalAmount || 0;

        if (totalAmount > 30000) {
            const desc = (analysis.summary + ' ' + (analysis.extractedData.vendorName || '')).toLowerCase();

            if (desc.includes('consult') || desc.includes('profession') || desc.includes('legal') || desc.includes('technical')) {
                tdsApplicable = true;
                tdsSection = '194J';
                tdsRate = 10;
            } else if (desc.includes('contractor') || desc.includes('works contract')) {
                tdsApplicable = true;
                tdsSection = '194C';
                tdsRate = 2;
            } else if (desc.includes('rent')) {
                tdsApplicable = true;
                tdsSection = '194I';
                tdsRate = 10;
            } else if (desc.includes('commission') || desc.includes('brokerage')) {
                tdsApplicable = true;
                tdsSection = '194H';
                tdsRate = 5;
            }
        }

        return {
            success: analysis.success,
            vendorName: analysis.extractedData.vendorName,
            invoiceNumber: analysis.extractedData.invoiceNumbers?.[0],
            invoiceDate: analysis.extractedData.dates?.[0]?.value,
            subtotal: analysis.extractedData.totalAmount
                ? analysis.extractedData.totalAmount - (analysis.extractedData.taxAmount || 0)
                : undefined,
            taxAmount: analysis.extractedData.taxAmount,
            totalAmount: analysis.extractedData.totalAmount,
            gstNumber: analysis.extractedData.gstNumbers?.[0],
            lineItems: (analysis.extractedData as any).lineItems || [],
            tdsApplicable,
            tdsSection,
            tdsRate,
        };
    }
}
