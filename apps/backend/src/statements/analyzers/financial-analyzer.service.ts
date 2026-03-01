import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedDocument } from '../parsers/parsed-document.interface';
import { FinancialMetrics } from './financial-metrics.interface';

@Injectable()
export class FinancialAnalyzerService {
    private readonly logger = new Logger(FinancialAnalyzerService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        }
    }

    async analyze(parsedDoc: ParsedDocument): Promise<FinancialMetrics> {
        if (!this.model || !parsedDoc.rawText || parsedDoc.rawText.length < 50) {
            return this.getFallbackAnalysis(parsedDoc);
        }

        try {
            const prompt = this.buildAnalysisPrompt(parsedDoc);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI did not return valid JSON');
            }

            const metrics: FinancialMetrics = JSON.parse(jsonMatch[0]);
            this.logger.log(`Successfully extracted ${metrics.extractedFields?.length || 0} fields from ${metrics.documentType}`);
            return metrics;

        } catch (error) {
            this.logger.error(`AI analysis failed: ${error.message}`);
            return this.getFallbackAnalysis(parsedDoc);
        }
    }

    private buildAnalysisPrompt(parsedDoc: ParsedDocument): string {
        return `You are a financial analyst AI. Analyze this financial document and extract ALL available metrics.

DOCUMENT CONTENT:
${parsedDoc.rawText.substring(0, 15000)}

INSTRUCTIONS:
1. Detect the document type(s): Balance Sheet, P&L, Cash Flow, Bank Statement, GST Return, Invoice List, or Multiple
2. Extract ALL financial metrics you can find (use exact numbers from document)
3. Calculate derived metrics where possible (ratios, margins, runway)
4. Return data in strict JSON format
5. Use null for missing/unavailable data
6. Currency should be INR for Indian documents, USD otherwise

IMPORTANT: Return ONLY valid JSON, no additional text or explanations.

REQUIRED OUTPUT FORMAT:
{
  "documentType": "Balance Sheet | P&L | Cash Flow | Bank Statement | GST Return | Invoices | Multiple",
  "period": "FY2024 | Q1 2024 | Jan 2024 | etc" or null,
  "currency": "INR | USD",
  
  "totalAssets": number or null,
  "totalLiabilities": number or null,
  "totalEquity": number or null,
  "currentAssets": number or null,
  "currentLiabilities": number or null,
  "currentRatio": number or null,
  "debtToEquity": number or null,
  
  "revenue": number or null,
  "totalExpenses": number or null,
  "netProfit": number or null,
  "grossProfit": number or null,
  "ebitda": number or null,
  "profitMargin": number or null,
  
  "operatingCashFlow": number or null,
  "investingCashFlow": number or null,
  "financingCashFlow": number or null,
  "netCashFlow": number or null,
  
  "monthlyBurn": number or null,
  "cashRunway": number or null,
  
  "openingBalance": number or null,
  "closingBalance": number or null,
  "totalCredits": number or null,
  "totalDebits": number or null,
  
  "gstLiability": number or null,
  "inputTaxCredit": number or null,
  "netGstPayable": number or null,
  
  "totalInvoiceValue": number or null,
  "pendingReceivables": number or null,
  
  "confidence": "high | medium | low",
  "extractedFields": ["revenue", "totalExpenses", ...]  /* list field names with non-null values */,
  "warnings": []  /* list any issues or limitations */
}`;
    }

    private getFallbackAnalysis(parsedDoc: ParsedDocument): FinancialMetrics {
        // If Gemini API is not available, return empty structure
        this.logger.warn('Gemini API not configured or document empty, returning fallback analysis');

        // Check if it's a scanned document issue
        const isScanned = parsedDoc.metadata?.isScanned || (parsedDoc.rawText && parsedDoc.rawText.length < 50);

        const warnings = isScanned
            ? ['This appears to be a scanned document or image-based PDF. Please upload the original image file (JPG/PNG) for better results.']
            : ['AI analysis unavailable. Please check your API key.'];

        return {
            documentType: 'Unknown',
            period: null,
            currency: 'INR',
            confidence: 'low',
            totalAssets: null,
            totalLiabilities: null,
            totalEquity: null,
            currentAssets: null,
            currentLiabilities: null,
            currentRatio: null,
            debtToEquity: null,
            revenue: null,
            totalExpenses: null,
            netProfit: null,
            grossProfit: null,
            ebitda: null,
            profitMargin: null,
            operatingCashFlow: null,
            investingCashFlow: null,
            financingCashFlow: null,
            netCashFlow: null,
            monthlyBurn: null,
            cashRunway: null,
            openingBalance: null,
            closingBalance: null,
            totalCredits: null,
            totalDebits: null,
            gstLiability: null,
            inputTaxCredit: null,
            netGstPayable: null,
            totalInvoiceValue: null,
            pendingReceivables: null,
            extractedFields: [],
            warnings: warnings
        };
    }
}
