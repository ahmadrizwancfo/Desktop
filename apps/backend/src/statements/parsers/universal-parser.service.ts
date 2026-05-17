import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { ParsedDocument, ParsedTransaction, ParsingIssue, ParsingQuality } from './parsed-document.interface';
import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ═══════════════════════════════════════════════════════════════════════════════
// INDIAN CONTEXT CATEGORY MAPPING (CTO Mandate #2)
// AI can suggest new categories but must map to these first.
// ═══════════════════════════════════════════════════════════════════════════════
export const INDIAN_CATEGORY_MAP: Record<string, string[]> = {
    'Salary & Payroll': ['salary', 'payroll', 'wages', 'stipend', 'bonus', 'pf contribution', 'esic', 'gratuity'],
    'TDS Deducted': ['tds', 'tax deducted', 'tds payment', 'tds deposit'],
    'GST Paid': ['gst', 'cgst', 'sgst', 'igst', 'gst payment', 'gst challan'],
    'Marketing & Ads': ['marketing', 'advertising', 'google ads', 'meta ads', 'facebook', 'campaign', 'promotion'],
    'Rent & Utilities': ['rent', 'electricity', 'water', 'internet', 'broadband', 'phone bill', 'utility'],
    'Vendor Payments': ['vendor', 'supplier', 'purchase', 'raw material', 'inventory'],
    'Travel': ['travel', 'flight', 'hotel', 'cab', 'uber', 'ola', 'conveyance', 'fuel', 'petrol', 'diesel'],
    'Software & Tools': ['saas', 'software', 'subscription', 'aws', 'azure', 'gcp', 'cloud', 'hosting', 'domain'],
    'Professional Fees': ['professional', 'consultant', 'legal', 'ca fees', 'audit', 'advisory', 'lawyer'],
    'Founder Draw': ['founder', 'director', 'draw', 'remuneration'],
    'Tax Payments': ['income tax', 'advance tax', 'self assessment', 'tax challan'],
    'Others': [],
};

/**
 * Attempt to auto-categorize a transaction description using the Indian category map.
 */
export function categorizeTransaction(description: string): string {
    const lower = (description || '').toLowerCase();
    for (const [category, keywords] of Object.entries(INDIAN_CATEGORY_MAP)) {
        if (category === 'Others') continue;
        if (keywords.some(kw => lower.includes(kw))) return category;
    }
    return 'Others';
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL PARSER SERVICE v2
// Fallback chain: pdf-parse → Tesseract OCR → Gemini Vision
// Post-processing: balance verification, duplicate detection, date normalization
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class UniversalParserService {
    private readonly logger = new Logger(UniversalParserService.name);
    private ocrWorker: Worker | null = null;
    private genAI: GoogleGenerativeAI | null = null;

    // Vision usage tracking per org (CTO Mandate #1: max 5/day free tier)
    private visionUsageToday: Map<string, { count: number; date: string }> = new Map();
    private readonly VISION_DAILY_LIMIT = 5;
    private readonly VISION_WARN_THRESHOLD = 3;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    // ── Main Entry ────────────────────────────────────────────────────────────

    async parse(buffer: Buffer, filename: string, organizationId?: string): Promise<ParsedDocument> {
        const ext = filename.split('.').pop()?.toLowerCase();
        this.logger.log(`Parsing ${ext} file: ${filename}`);

        let doc: ParsedDocument;

        switch (ext) {
            case 'pdf':
                doc = await this.parsePdfWithFallback(buffer, organizationId);
                break;
            case 'xlsx':
            case 'xls':
                doc = await this.parseExcel(buffer);
                break;
            case 'csv':
                doc = await this.parseCsv(buffer);
                break;
            case 'jpg': case 'jpeg': case 'png': case 'gif':
            case 'webp': case 'tiff': case 'tif': case 'bmp':
                doc = await this.parseImage(buffer, ext);
                break;
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }

        // Post-process: extract transactions, validate, score quality
        doc = this.postProcess(doc);
        return doc;
    }

    // ── PDF Fallback Chain ────────────────────────────────────────────────────

    private async parsePdfWithFallback(buffer: Buffer, organizationId?: string): Promise<ParsedDocument> {
        // Step 1: Try pdf-parse
        const pdfResult = await this.tryPdfParse(buffer);
        if (pdfResult && !pdfResult.metadata?.isScanned) {
            this.logger.log('PDF parsed successfully via pdf-parse');
            return pdfResult;
        }

        // Step 2: Try Tesseract OCR on the raw buffer
        this.logger.log('pdf-parse insufficient, falling back to Tesseract OCR...');
        const ocrResult = await this.tryTesseractOnPdf(buffer);
        if (ocrResult && ocrResult.rawText.length > 100) {
            this.logger.log('PDF parsed via Tesseract OCR fallback');
            return ocrResult;
        }

        // Step 3: Try Gemini Vision (rate-limited)
        if (this.genAI && organizationId) {
            const canUseVision = this.checkVisionLimit(organizationId);
            if (canUseVision) {
                this.logger.log('OCR insufficient, falling back to Gemini Vision...');
                const visionResult = await this.tryGeminiVision(buffer, organizationId);
                if (visionResult) {
                    this.logger.log('PDF parsed via Gemini Vision fallback');
                    return visionResult;
                }
            } else {
                this.logger.warn(`Vision daily limit reached for org ${organizationId}`);
            }
        }

        // Return whatever we got with warnings
        return pdfResult || {
            type: 'pdf',
            rawText: '',
            metadata: {
                isScanned: true,
                parseError: true,
                parserUsed: 'none',
                warning: 'Could not extract text. Try uploading as image (JPG/PNG) or a text-based PDF.',
            },
        };
    }

    private async tryPdfParse(buffer: Buffer): Promise<ParsedDocument | null> {
        try {
            // @ts-ignore - pdf-parse has inconsistent type definitions
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(buffer, { max: 0, version: 'v2.0.550' });
            const textContent = data.text?.trim() || '';
            const hasText = textContent.length > 100;

            return {
                type: 'pdf',
                rawText: hasText ? data.text : textContent,
                metadata: {
                    pages: data.numpages,
                    isScanned: !hasText,
                    parserUsed: 'pdf-parse',
                    warning: hasText ? undefined : 'PDF appears to be scanned or image-based.',
                },
            };
        } catch (error: any) {
            this.logger.warn(`pdf-parse failed: ${error.message}`);
            return null;
        }
    }

    private async tryTesseractOnPdf(buffer: Buffer): Promise<ParsedDocument | null> {
        try {
            // Convert first page of PDF to image via sharp for OCR
            const imageBuffer = await sharp(buffer, { pages: 1 })
                .greyscale()
                .normalize()
                .sharpen()
                .png()
                .toBuffer();

            const worker = await this.getOcrWorker();
            const { data } = await worker.recognize(imageBuffer);

            return {
                type: 'pdf',
                rawText: data.text || '',
                metadata: {
                    isScanned: true,
                    parserUsed: 'tesseract-ocr',
                    ocrConfidence: data.confidence,
                    warning: data.confidence < 60 ? 'Low OCR confidence. Results may be inaccurate.' : undefined,
                },
            };
        } catch (error: any) {
            this.logger.warn(`Tesseract PDF fallback failed: ${error.message}`);
            return null;
        }
    }

    // ── Gemini Vision Fallback (Rate-Limited) ─────────────────────────────────

    private checkVisionLimit(organizationId: string): boolean {
        const today = new Date().toISOString().split('T')[0];
        const usage = this.visionUsageToday.get(organizationId);

        if (!usage || usage.date !== today) {
            return true; // New day or new org
        }

        if (usage.count >= this.VISION_WARN_THRESHOLD && usage.count < this.VISION_DAILY_LIMIT) {
            this.logger.warn(`Vision usage warning: org ${organizationId} has used ${usage.count}/${this.VISION_DAILY_LIMIT} today`);
        }

        return usage.count < this.VISION_DAILY_LIMIT;
    }

    private trackVisionUsage(organizationId: string): void {
        const today = new Date().toISOString().split('T')[0];
        const usage = this.visionUsageToday.get(organizationId);

        if (!usage || usage.date !== today) {
            this.visionUsageToday.set(organizationId, { count: 1, date: today });
        } else {
            usage.count++;
        }
    }

    private async tryGeminiVision(buffer: Buffer, organizationId: string): Promise<ParsedDocument | null> {
        if (!this.genAI) return null;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const base64 = buffer.toString('base64');

            const result = await model.generateContent([
                {
                    inlineData: { mimeType: 'application/pdf', data: base64 },
                },
                {
                    text: `Extract ALL financial transactions from this bank statement document.
For each transaction, extract: Date, Description, Debit Amount, Credit Amount, Running Balance.
Return the raw text content of the document, preserving table structure.
If this is a bank statement, format transactions as rows separated by newlines.
Important: Extract exact numbers. Do not summarize or skip any transactions.`,
                },
            ]);

            const text = result.response.text();
            this.trackVisionUsage(organizationId);

            this.logger.log(`Gemini Vision extracted ${text.length} chars for org ${organizationId}`);

            return {
                type: 'pdf',
                rawText: text,
                metadata: {
                    isScanned: true,
                    parserUsed: 'gemini-vision',
                    visionUsed: true,
                },
            };
        } catch (error: any) {
            this.logger.error(`Gemini Vision failed: ${error.message}`);
            return null;
        }
    }

    // ── OCR Worker ────────────────────────────────────────────────────────────

    private async getOcrWorker(): Promise<Worker> {
        if (!this.ocrWorker) {
            this.logger.log('Initializing Tesseract OCR worker...');
            this.ocrWorker = await createWorker('eng+hin', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });
            this.logger.log('Tesseract OCR worker initialized');
        }
        return this.ocrWorker;
    }

    // ── Image Parser ──────────────────────────────────────────────────────────

    private async parseImage(buffer: Buffer, ext: string): Promise<ParsedDocument> {
        this.logger.log(`Processing scanned image document (${ext})...`);

        try {
            const processedBuffer = await sharp(buffer)
                .greyscale()
                .normalize()
                .sharpen()
                .toBuffer();

            const worker = await this.getOcrWorker();
            const { data } = await worker.recognize(processedBuffer);

            this.logger.log(`OCR extracted ${data.text?.length || 0} characters with ${data.confidence?.toFixed(0)}% confidence`);

            return {
                type: 'image',
                rawText: data.text,
                metadata: {
                    confidence: data.confidence,
                    originalFormat: ext,
                    parserUsed: 'tesseract-ocr',
                    ocrConfidence: data.confidence,
                },
            };
        } catch (error: any) {
            this.logger.error(`Image OCR failed: ${error.message}`);
            throw new Error(`Failed to process scanned image: ${error.message}`);
        }
    }

    // ── Excel Parser ──────────────────────────────────────────────────────────

    private async parseExcel(buffer: Buffer): Promise<ParsedDocument> {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheets: Record<string, any[]> = {};
            let rawText = '';

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                sheets[sheetName] = jsonData;

                const sheetText = jsonData.map((row: any) =>
                    Object.entries(row).map(([key, val]) => `${key}: ${val}`).join(', ')
                ).join('\n');

                rawText += `\n### Sheet: ${sheetName}\n${sheetText}\n`;
            });

            return {
                type: 'excel',
                sheets,
                rawText,
                metadata: { sheetNames: workbook.SheetNames, parserUsed: 'xlsx' },
            };
        } catch (error: any) {
            throw new Error('Failed to parse Excel file. Ensure it\'s a valid .xlsx or .xls file.');
        }
    }

    // ── CSV Parser ────────────────────────────────────────────────────────────

    private async parseCsv(buffer: Buffer): Promise<ParsedDocument> {
        return new Promise((resolve, reject) => {
            const csvText = buffer.toString('utf-8');

            Papa.parse(csvText, {
                header: true,
                complete: (results) => {
                    const rows = results.data;
                    const rawText = rows.map(row =>
                        Object.entries(row as Record<string, unknown>).map(([key, val]) => `${key}: ${val}`).join(', ')
                    ).join('\n');

                    resolve({
                        type: 'csv',
                        rows: rows as any[],
                        rawText,
                        metadata: { parserUsed: 'papaparse' },
                    });
                },
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                },
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST-PROCESSING: Validation, Quality Scoring, Transaction Extraction
    // ═══════════════════════════════════════════════════════════════════════════

    private postProcess(doc: ParsedDocument): ParsedDocument {
        const issues: ParsingIssue[] = [];
        const transactions = this.extractTransactions(doc, issues);

        // Run validation checks
        const balanceVerified = this.verifyRunningBalance(transactions, issues);
        const debitCreditMatch = this.verifyDebitCreditTotals(transactions, issues);
        const duplicatesDetected = this.detectDuplicates(transactions, issues);

        // Auto-categorize each transaction
        for (const txn of transactions) {
            if (!txn.category) {
                txn.category = categorizeTransaction(txn.description);
            }
        }

        // Calculate quality score (0-100)
        const score = this.calculateQualityScore(doc, transactions, issues, balanceVerified, debitCreditMatch);

        const quality: ParsingQuality = {
            score,
            label: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor',
            issues,
            validationChecks: {
                balanceVerified,
                debitCreditMatch,
                dateNormalized: transactions.length > 0,
                duplicatesDetected,
                transactionCount: transactions.length,
            },
        };

        doc.transactions = transactions;
        doc.quality = quality;

        this.logger.log(`Post-processing complete: ${transactions.length} txns, quality=${score}/100 (${quality.label}), ${issues.length} issues`);
        return doc;
    }

    private extractTransactions(doc: ParsedDocument, issues: ParsingIssue[]): ParsedTransaction[] {
        // For CSV/Excel with rows, try structured extraction
        if (doc.rows && doc.rows.length > 0) {
            return this.extractFromRows(doc.rows, issues);
        }
        if (doc.sheets) {
            const firstSheet = Object.values(doc.sheets)[0];
            if (firstSheet && firstSheet.length > 0) {
                return this.extractFromRows(firstSheet, issues);
            }
        }

        // For PDF/image raw text, try line-by-line extraction
        if (doc.rawText && doc.rawText.length > 50) {
            return this.extractFromRawText(doc.rawText, issues);
        }

        if (doc.rawText.length < 50) {
            issues.push({ type: 'missing_field', severity: 'error', message: 'Insufficient text extracted from document.' });
        }

        return [];
    }

    private extractFromRows(rows: any[], issues: ParsingIssue[]): ParsedTransaction[] {
        const transactions: ParsedTransaction[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || typeof row !== 'object') continue;

            const keys = Object.keys(row);
            const lowerKeys = keys.map(k => k.toLowerCase());

            // Find date, description, debit, credit, balance columns by fuzzy matching
            const dateKey = keys.find((_, idx) => /date|txn.*date|value.*date|posting/i.test(lowerKeys[idx]));
            const descKey = keys.find((_, idx) => /desc|narration|particular|remark|detail/i.test(lowerKeys[idx]));
            const debitKey = keys.find((_, idx) => /debit|withdrawal|dr|out/i.test(lowerKeys[idx]));
            const creditKey = keys.find((_, idx) => /credit|deposit|cr|in(?!t)/i.test(lowerKeys[idx]));
            const balKey = keys.find((_, idx) => /balance|closing|running/i.test(lowerKeys[idx]));

            if (!dateKey && !descKey) continue; // Skip header/junk rows

            const rawDate = dateKey ? String(row[dateKey]).trim() : '';
            const desc = descKey ? String(row[descKey]).trim() : '';
            const debit = debitKey ? this.parseAmount(row[debitKey]) : null;
            const credit = creditKey ? this.parseAmount(row[creditKey]) : null;
            const balance = balKey ? this.parseAmount(row[balKey]) : null;

            if (!rawDate && !desc) continue;

            transactions.push({
                date: this.normalizeDate(rawDate),
                description: desc,
                debit,
                credit,
                balance,
                rawDateString: rawDate,
            });
        }

        return transactions;
    }

    private extractFromRawText(text: string, issues: ParsingIssue[]): ParsedTransaction[] {
        const transactions: ParsedTransaction[] = [];
        const lines = text.split('\n').filter(l => l.trim().length > 5);

        // Look for lines matching typical bank statement patterns
        // Pattern: date  description  debit  credit  balance
        const datePattern = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/;

        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (!dateMatch) continue;

            // Extract amounts from the line (numbers that look like money)
            const amounts = line.match(/[\d,]+\.\d{2}/g)?.map(a => parseFloat(a.replace(/,/g, ''))) || [];
            const desc = line.replace(datePattern, '').replace(/[\d,]+\.\d{2}/g, '').trim().replace(/\s+/g, ' ');

            if (desc.length < 2) continue;

            transactions.push({
                date: this.normalizeDate(dateMatch[1]),
                description: desc,
                debit: amounts.length >= 2 ? amounts[0] || null : null,
                credit: amounts.length >= 2 ? amounts[1] || null : (amounts[0] || null),
                balance: amounts.length >= 3 ? amounts[2] : null,
                rawDateString: dateMatch[1],
            });
        }

        if (transactions.length === 0 && text.length > 100) {
            issues.push({ type: 'missing_field', severity: 'warning', message: 'Could not extract structured transactions from raw text. AI analysis will use raw text.' });
        }

        return transactions;
    }

    // ── Validation Checks ─────────────────────────────────────────────────────

    private verifyRunningBalance(txns: ParsedTransaction[], issues: ParsingIssue[]): boolean {
        if (txns.length < 2) return false;

        const txnsWithBalance = txns.filter(t => t.balance !== null);
        if (txnsWithBalance.length < 2) return false;

        let mismatches = 0;
        for (let i = 1; i < txnsWithBalance.length; i++) {
            const prev = txnsWithBalance[i - 1];
            const curr = txnsWithBalance[i];
            const expectedBalance = (prev.balance || 0) - (curr.debit || 0) + (curr.credit || 0);

            if (curr.balance !== null && Math.abs(expectedBalance - curr.balance) > 1) {
                mismatches++;
                if (mismatches <= 3) {
                    issues.push({
                        type: 'balance_mismatch',
                        severity: 'warning',
                        message: `Balance mismatch at row ${i + 1}: expected ₹${expectedBalance.toFixed(2)}, got ₹${curr.balance?.toFixed(2)}`,
                        rowIndex: i,
                    });
                }
            }
        }

        return mismatches === 0;
    }

    private verifyDebitCreditTotals(txns: ParsedTransaction[], issues: ParsingIssue[]): boolean {
        if (txns.length === 0) return false;

        const totalDebit = txns.reduce((s, t) => s + (t.debit || 0), 0);
        const totalCredit = txns.reduce((s, t) => s + (t.credit || 0), 0);
        const firstBalance = txns.find(t => t.balance !== null)?.balance || 0;
        const lastBalance = [...txns].reverse().find(t => t.balance !== null)?.balance || 0;

        if (firstBalance > 0 && lastBalance > 0) {
            const expectedDiff = lastBalance - firstBalance;
            const actualDiff = totalCredit - totalDebit;
            const match = Math.abs(expectedDiff - actualDiff) < 10;

            if (!match) {
                issues.push({
                    type: 'balance_mismatch',
                    severity: 'warning',
                    message: `Debit/credit totals don't reconcile with balance change. Diff: ₹${Math.abs(expectedDiff - actualDiff).toFixed(2)}`,
                });
            }
            return match;
        }

        return true; // Can't verify without balances
    }

    private detectDuplicates(txns: ParsedTransaction[], issues: ParsingIssue[]): number {
        const seen = new Map<string, number>();
        let duplicates = 0;

        for (let i = 0; i < txns.length; i++) {
            const key = `${txns[i].date}|${txns[i].description}|${txns[i].debit}|${txns[i].credit}`;
            if (seen.has(key)) {
                duplicates++;
                if (duplicates <= 3) {
                    issues.push({
                        type: 'duplicate',
                        severity: 'warning',
                        message: `Possible duplicate transaction at row ${i + 1}: "${txns[i].description}" on ${txns[i].date}`,
                        rowIndex: i,
                    });
                }
            }
            seen.set(key, i);
        }

        return duplicates;
    }

    // ── Quality Score ─────────────────────────────────────────────────────────

    private calculateQualityScore(
        doc: ParsedDocument,
        txns: ParsedTransaction[],
        issues: ParsingIssue[],
        balanceVerified: boolean,
        debitCreditMatch: boolean,
    ): number {
        let score = 100;

        // Text extraction quality (0-30 points)
        if (!doc.rawText || doc.rawText.length < 50) score -= 30;
        else if (doc.rawText.length < 200) score -= 15;

        // Transaction extraction (0-25 points)
        if (txns.length === 0) score -= 25;
        else if (txns.length < 5) score -= 10;

        // Balance verification (0-15 points)
        if (txns.length > 2 && !balanceVerified) score -= 15;

        // Debit/credit reconciliation (0-10 points)
        if (txns.length > 0 && !debitCreditMatch) score -= 10;

        // OCR confidence penalty
        const ocrConf = doc.metadata?.ocrConfidence;
        if (ocrConf !== undefined && ocrConf < 70) score -= 10;
        if (ocrConf !== undefined && ocrConf < 50) score -= 10;

        // Scanned document penalty
        if (doc.metadata?.isScanned && !doc.metadata?.visionUsed) score -= 5;

        // Issue penalty
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        score -= errors * 5;
        score -= warnings * 2;

        return Math.max(0, Math.min(100, score));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private parseAmount(val: any): number | null {
        if (val === null || val === undefined || val === '') return null;
        const str = String(val).replace(/[₹,\s]/g, '').trim();
        if (!str || str === '-' || str === '0.00') return null;
        const num = parseFloat(str);
        return isNaN(num) ? null : Math.abs(num);
    }

    /**
     * Normalize Indian date formats (DD/MM/YYYY, DD-MM-YYYY, DD-MM-YY, etc.) to YYYY-MM-DD
     */
    private normalizeDate(dateStr: string): string {
        if (!dateStr) return '';
        const cleaned = dateStr.trim();

        // DD/MM/YYYY or DD-MM-YYYY
        const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (dmy) {
            const day = dmy[1].padStart(2, '0');
            const month = dmy[2].padStart(2, '0');
            let year = dmy[3];
            if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
            return `${year}-${month}-${day}`;
        }

        // YYYY-MM-DD (already normalized)
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

        // Try Date.parse as last resort
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return cleaned;
    }

    /**
     * Cleanup OCR worker on module destroy
     */
    async onModuleDestroy() {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
        }
    }
}
