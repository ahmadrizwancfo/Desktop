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
        const totalPages = pdfResult?.metadata?.pages || 1;

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
                const visionResult = await this.tryGeminiVision(buffer, organizationId, totalPages);
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

    private async tryGeminiVision(buffer: Buffer, organizationId: string, totalPages: number): Promise<ParsedDocument | null> {
        if (!this.genAI) return null;

        const maxPages = Math.min(totalPages, 8);
        this.logger.log(`[Vision Segmenter] Splitting PDF into ${maxPages} pages for Vision processing.`);

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            
            // Build concurrent array of page render & Gemini vision calls
            const pagePromises = Array.from({ length: maxPages }).map(async (_, idx) => {
                try {
                    const pageBuffer = await sharp(buffer, { page: idx })
                        .greyscale()
                        .normalize()
                        .sharpen()
                        .png()
                        .toBuffer();

                    const base64 = pageBuffer.toString('base64');
                    const result = await model.generateContent([
                        {
                            inlineData: { mimeType: 'image/png', data: base64 },
                        },
                        {
                            text: `Extract ALL financial transactions from this bank statement page.
For each transaction, extract: Date, Description, Debit Amount, Credit Amount, Running Balance.
Return the raw text content of the page, keeping the original horizontal layout and table structure.
If this is a bank statement, format transactions as rows separated by newlines.
Important: Extract exact numbers. Do not summarize or skip any transactions.`,
                        },
                    ]);

                    const pageText = result.response.text();
                    return { pageIndex: idx, text: pageText };
                } catch (pageErr: any) {
                    this.logger.error(`[Vision Segmenter] Page ${idx + 1} processing failed: ${pageErr.message}`);
                    return { pageIndex: idx, text: `[Error parsing Page ${idx + 1}]` };
                }
            });

            const results = await Promise.all(pagePromises);
            // Sort by index to maintain correct chronological order
            results.sort((a, b) => a.pageIndex - b.pageIndex);

            const mergedText = results.map(r => r.text).join('\n\n');
            this.trackVisionUsage(organizationId);

            this.logger.log(`Gemini Vision multi-page sync complete. Extracted ${mergedText.length} chars total across ${maxPages} pages.`);

            return {
                type: 'pdf',
                rawText: mergedText,
                metadata: {
                    isScanned: true,
                    parserUsed: 'gemini-vision',
                    visionUsed: true,
                    pages: maxPages,
                },
            };
        } catch (error: any) {
            this.logger.error(`[Vision Segmenter] Fatal error during segmenting: ${error.message}`);
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

        let debitColIndex = -1;
        let creditColIndex = -1;
        let balanceColIndex = -1;
        let columnsDetected = false;

        // Scan for header line
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if ((lowerLine.includes('date') || lowerLine.includes('txn') || lowerLine.includes('value')) &&
                (lowerLine.includes('particular') || lowerLine.includes('desc') || lowerLine.includes('narration') || lowerLine.includes('remark')) &&
                (lowerLine.includes('debit') || lowerLine.includes('withdrawal') || lowerLine.includes('dr ') || lowerLine.includes('out') || lowerLine.includes('payment')) &&
                (lowerLine.includes('credit') || lowerLine.includes('deposit') || lowerLine.includes('cr ') || lowerLine.includes('in ') || lowerLine.includes('receipt'))) {
                
                const debitKeywords = ['withdrawal', 'debit', 'dr ', 'amount(dr)', 'out', 'payment'];
                const creditKeywords = ['deposit', 'credit', 'cr ', 'amount(cr)', 'in ', 'receipt'];
                const balanceKeywords = ['balance', 'bal', 'closing', 'running'];

                for (const kw of debitKeywords) {
                    const idx = lowerLine.indexOf(kw);
                    if (idx !== -1) {
                        debitColIndex = idx;
                        break;
                    }
                }

                for (const kw of creditKeywords) {
                    const idx = lowerLine.indexOf(kw);
                    if (idx !== -1) {
                        creditColIndex = idx;
                        break;
                    }
                }

                for (const kw of balanceKeywords) {
                    const idx = lowerLine.indexOf(kw);
                    if (idx !== -1) {
                        balanceColIndex = idx;
                        break;
                    }
                }

                if (debitColIndex !== -1 && creditColIndex !== -1) {
                    columnsDetected = true;
                    this.logger.log(`[Parser Column Classifier] Header detected. Column bounds: Debit=${debitColIndex}, Credit=${creditColIndex}, Balance=${balanceColIndex}`);
                    break;
                }
            }
        }

        // Support abbreviated date formats like DD-MMM-YYYY, DD/MM/YYYY, DD MM YYYY, etc.
        const datePattern = /(\d{1,2}[\/\s-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\s-]\d{2,4}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;

        for (const line of lines) {
            const dateMatch = line.match(datePattern);
            if (!dateMatch) continue;

            // Extract decimal amounts with character index tracking
            const rawAmounts: { value: number; index: number }[] = [];
            const amountRegex = /([\d,]+\.\d{2})/g;
            let match;
            while ((match = amountRegex.exec(line)) !== null) {
                const val = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(val)) {
                    rawAmounts.push({ value: val, index: match.index });
                }
            }

            const desc = line.replace(datePattern, '').replace(/[\d,]+\.\d{2}/g, '').trim().replace(/\s+/g, ' ');
            if (desc.length < 2) continue;

            let debit: number | null = null;
            let credit: number | null = null;
            let balance: number | null = null;

            if (columnsDetected && rawAmounts.length > 0) {
                for (const amt of rawAmounts) {
                    const distToDebit = Math.abs(amt.index - debitColIndex);
                    const distToCredit = Math.abs(amt.index - creditColIndex);
                    const distToBalance = balanceColIndex !== -1 ? Math.abs(amt.index - balanceColIndex) : Infinity;

                    const minDist = Math.min(distToDebit, distToCredit, distToBalance);
                    if (minDist === distToDebit) {
                        debit = amt.value;
                    } else if (minDist === distToCredit) {
                        credit = amt.value;
                    } else {
                        balance = amt.value;
                    }
                }
            } else {
                // Heuristic sequential fallback
                const amounts = rawAmounts.map(a => a.value);
                if (amounts.length === 1) {
                    const lowerDesc = desc.toLowerCase();
                    const isDebitWord = lowerDesc.includes('charge') || lowerDesc.includes('bill') || 
                                        lowerDesc.includes('payment') || lowerDesc.includes('fee') || 
                                        lowerDesc.includes('tax') || lowerDesc.includes('debit') || 
                                        lowerDesc.includes('withdrawal') || lowerDesc.includes('transfer to');
                    
                    if (isDebitWord) {
                        debit = amounts[0];
                    } else {
                        credit = amounts[0];
                    }
                } else if (amounts.length === 2) {
                    debit = amounts[0];
                    credit = amounts[1];
                } else if (amounts.length >= 3) {
                    debit = amounts[0];
                    credit = amounts[1];
                    balance = amounts[2];
                }
            }

            transactions.push({
                date: this.normalizeDate(dateMatch[1]),
                description: desc,
                debit,
                credit,
                balance,
                rawDateString: dateMatch[1],
            });
        }

        if (transactions.length === 0 && text.length > 100) {
            issues.push({
                type: 'missing_field',
                severity: 'warning',
                message: 'No transaction rows matched standard bank ledger formatting. Manual categorization is recommended.',
            });
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
                        message: `Running balance mismatch at transaction row ${i + 1} ("${curr.description.substring(0, 20)}..."): expected ₹${expectedBalance.toFixed(2)}, got ₹${curr.balance?.toFixed(2)}. Suggest checking if a Debit amount was misclassified as Credit, or if a transaction row was skipped during extraction.`,
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
                    message: `Ledger summary totals do not reconcile with the bank statement's balance changes. Deviation: ₹${Math.abs(expectedDiff - actualDiff).toFixed(2)} (Expected change: ₹${expectedDiff.toFixed(2)}, Actual change: ₹${actualDiff.toFixed(2)}). This is highly likely a column alignment issue (e.g. withdrawal column parsed as deposit) or a broken numeric OCR reading.`,
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

        // Balance verification (0-30 points)
        if (txns.length > 2 && !balanceVerified) score -= 30;

        // Debit/credit reconciliation (0-30 points)
        if (txns.length > 0 && !debitCreditMatch) score -= 30;

        // Running balance validation bonus (+10 points)
        if (txns.length > 2 && balanceVerified && debitCreditMatch) {
            score += 10;
        }

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

        const MONTH_MAP: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };

        // DD[-/ ]MMM[-/ ]YYYY or DD[-/ ]MMM[-/ ]YY (e.g. 12-Apr-2026, 23 Aug 2025, 15/Dec/25)
        const alphaDmy = cleaned.match(/^(\d{1,2})[\/\s-]((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)[\/\s-](\d{2,4})$/i);
        if (alphaDmy) {
            const day = alphaDmy[1].padStart(2, '0');
            const monthStr = alphaDmy[2].toLowerCase().substring(0, 3);
            const month = MONTH_MAP[monthStr] || '01';
            let year = alphaDmy[3];
            if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
            return `${year}-${month}-${day}`;
        }

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
