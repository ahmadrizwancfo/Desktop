import { Injectable, Logger } from '@nestjs/common';
import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface OcrResult {
    text: string;
    confidence: number;
    pages: number;
    processingTimeMs: number;
    extractedData?: ExtractedFinancialData;
}

export interface ExtractedFinancialData {
    documentType?: string;
    amounts: { value: number; currency: string; context: string }[];
    dates: { value: string; context: string }[];
    accountNumbers: string[];
    gstNumbers: string[];
    panNumbers: string[];
    invoiceNumbers: string[];
    vendorName?: string;
    totalAmount?: number;
    taxAmount?: number;
    rawTransactions?: Array<{
        date: string;
        description: string;
        amount: number;
        type: 'CREDIT' | 'DEBIT';
    }>;
}

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private worker: Worker | null = null;

    /**
     * Initialize Tesseract worker
     */
    private async getWorker(): Promise<Worker> {
        if (!this.worker) {
            this.logger.log('Initializing Tesseract OCR worker...');
            this.worker = await createWorker('eng+hin', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });
            this.logger.log('Tesseract OCR worker initialized');
        }
        return this.worker;
    }

    /**
     * Extract text from an image file
     */
    async extractTextFromImage(imagePath: string): Promise<OcrResult> {
        const startTime = Date.now();

        try {
            // Preprocess image for better OCR
            const processedBuffer = await this.preprocessImage(imagePath);

            const worker = await this.getWorker();
            const { data } = await worker.recognize(processedBuffer);

            const extractedData = this.parseFinancialData(data.text);

            return {
                text: data.text,
                confidence: data.confidence,
                pages: 1,
                processingTimeMs: Date.now() - startTime,
                extractedData,
            };
        } catch (error) {
            this.logger.error(`OCR failed for image: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract text from a PDF file
     */
    async extractTextFromPdf(pdfPath: string): Promise<OcrResult> {
        const startTime = Date.now();

        try {
            const dataBuffer = fs.readFileSync(pdfPath);
            const pdfData = await pdfParse(dataBuffer);

            // If PDF has extractable text
            if (pdfData.text && pdfData.text.trim().length > 50) {
                const extractedData = this.parseFinancialData(pdfData.text);

                return {
                    text: pdfData.text,
                    confidence: 95, // Native PDF text is highly reliable
                    pages: pdfData.numpages,
                    processingTimeMs: Date.now() - startTime,
                    extractedData,
                };
            }

            // If PDF is image-based, we need OCR
            this.logger.log('PDF appears to be image-based, using OCR...');

            // For image-based PDFs, we'd need to convert pages to images
            // This is a simplified version - for production, use pdf-poppler or similar
            return {
                text: pdfData.text || '',
                confidence: 0,
                pages: pdfData.numpages,
                processingTimeMs: Date.now() - startTime,
                extractedData: this.parseFinancialData(pdfData.text || ''),
            };
        } catch (error) {
            this.logger.error(`PDF parsing failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract text from buffer (uploaded file)
     */
    async extractTextFromBuffer(
        buffer: Buffer,
        mimeType: string,
        filename: string
    ): Promise<OcrResult> {
        const startTime = Date.now();

        if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(buffer);
            const extractedData = this.parseFinancialData(pdfData.text);

            return {
                text: pdfData.text,
                confidence: pdfData.text.trim().length > 50 ? 95 : 0,
                pages: pdfData.numpages,
                processingTimeMs: Date.now() - startTime,
                extractedData,
            };
        }

        if (mimeType.startsWith('image/')) {
            // Preprocess the image
            const processedBuffer = await sharp(buffer)
                .greyscale()
                .normalize()
                .sharpen()
                .toBuffer();

            const worker = await this.getWorker();
            const { data } = await worker.recognize(processedBuffer);
            const extractedData = this.parseFinancialData(data.text);

            return {
                text: data.text,
                confidence: data.confidence,
                pages: 1,
                processingTimeMs: Date.now() - startTime,
                extractedData,
            };
        }

        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    /**
     * Preprocess image for better OCR results
     */
    private async preprocessImage(imagePath: string): Promise<Buffer> {
        return sharp(imagePath)
            .greyscale() // Convert to grayscale
            .normalize() // Normalize contrast
            .sharpen() // Sharpen text
            .threshold(128) // Binarize for cleaner text
            .toBuffer();
    }

    /**
     * Parse financial data from extracted text
     */
    parseFinancialData(text: string): ExtractedFinancialData {
        const data: ExtractedFinancialData = {
            amounts: [],
            dates: [],
            accountNumbers: [],
            gstNumbers: [],
            panNumbers: [],
            invoiceNumbers: [],
            rawTransactions: [],
        };

        // Detect document type
        const lowerText = text.toLowerCase();
        if (lowerText.includes('invoice') || lowerText.includes('bill')) {
            data.documentType = 'INVOICE';
        } else if (lowerText.includes('bank statement') || lowerText.includes('account statement')) {
            data.documentType = 'BANK_STATEMENT';
        } else if (lowerText.includes('receipt')) {
            data.documentType = 'RECEIPT';
        } else if (lowerText.includes('gstr') || lowerText.includes('gst return')) {
            data.documentType = 'GST_RETURN';
        } else if (lowerText.includes('form 26as') || lowerText.includes('tds')) {
            data.documentType = 'TDS_CERTIFICATE';
        }

        // Extract amounts (Indian format: ₹1,00,000.00 or Rs. 1,00,000.00 or INR 100000)
        const amountPatterns = [
            /(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/gi,
            /(?:amount|total|balance|credit|debit)[\s:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/gi,
        ];

        for (const pattern of amountPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                if (!isNaN(value) && value > 0) {
                    const context = text.substring(
                        Math.max(0, match.index - 30),
                        Math.min(text.length, match.index + match[0].length + 30)
                    );
                    data.amounts.push({ value, currency: 'INR', context: context.trim() });
                }
            }
        }

        // Extract dates (Indian formats: DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY)
        const datePatterns = [
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
            /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
        ];

        for (const pattern of datePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const context = text.substring(
                    Math.max(0, match.index - 20),
                    Math.min(text.length, match.index + match[0].length + 20)
                );
                data.dates.push({ value: match[1], context: context.trim() });
            }
        }

        // Extract GST Numbers (format: 29AABCT1332Q1ZS)
        const gstPattern = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}\d{1}[A-Z]{1}/g;
        let gstMatch;
        while ((gstMatch = gstPattern.exec(text)) !== null) {
            if (!data.gstNumbers.includes(gstMatch[0])) {
                data.gstNumbers.push(gstMatch[0]);
            }
        }

        // Extract PAN Numbers (format: ABCDE1234F)
        const panPattern = /[A-Z]{5}\d{4}[A-Z]/g;
        let panMatch;
        while ((panMatch = panPattern.exec(text)) !== null) {
            if (!data.panNumbers.includes(panMatch[0])) {
                data.panNumbers.push(panMatch[0]);
            }
        }

        // Extract Account Numbers (10-18 digits)
        const accountPattern = /(?:a\/c|account|acc\.?\s*no\.?)[\s:]*(\d{10,18})/gi;
        let accountMatch;
        while ((accountMatch = accountPattern.exec(text)) !== null) {
            if (!data.accountNumbers.includes(accountMatch[1])) {
                data.accountNumbers.push(accountMatch[1]);
            }
        }

        // Extract Invoice Numbers
        const invoicePattern = /(?:invoice|inv|bill)[\s#:]*([A-Z0-9\-\/]+)/gi;
        let invoiceMatch;
        while ((invoiceMatch = invoicePattern.exec(text)) !== null) {
            if (!data.invoiceNumbers.includes(invoiceMatch[1])) {
                data.invoiceNumbers.push(invoiceMatch[1]);
            }
        }

        // Try to extract total amount
        const totalPattern = /(?:total|grand\s*total|net\s*amount|balance)[\s:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/gi;
        const totalMatch = totalPattern.exec(text);
        if (totalMatch) {
            data.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
        }

        // Try to extract tax amount
        const taxPatterns = [
            /(?:gst|tax|cgst|sgst|igst)[\s:]*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/gi,
            /(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:gst|tax)/gi,
        ];
        for (const pattern of taxPatterns) {
            const taxMatch = pattern.exec(text);
            if (taxMatch) {
                const taxValue = parseFloat(taxMatch[1].replace(/,/g, ''));
                if (!isNaN(taxValue) && taxValue > 0) {
                    data.taxAmount = (data.taxAmount || 0) + taxValue;
                }
            }
        }

        // Extract bank statement transactions (simplified pattern)
        const lines = text.split('\n');
        for (const line of lines) {
            // Look for lines that have a date, description, and amount
            const txPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(Cr|Dr|CR|DR)?/i;
            const txMatch = txPattern.exec(line);
            if (txMatch) {
                const amount = parseFloat(txMatch[3].replace(/,/g, ''));
                if (!isNaN(amount) && amount > 0) {
                    data.rawTransactions?.push({
                        date: txMatch[1],
                        description: txMatch[2].trim(),
                        amount,
                        type: txMatch[4]?.toLowerCase().includes('cr') ? 'CREDIT' : 'DEBIT',
                    });
                }
            }
        }

        return data;
    }

    /**
     * Cleanup worker on service destroy
     */
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.terminate();
        }
    }
}
