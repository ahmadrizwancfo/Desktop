import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { ParsedDocument } from './parsed-document.interface';
import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

@Injectable()
export class UniversalParserService {
    private readonly logger = new Logger(UniversalParserService.name);
    private ocrWorker: Worker | null = null;

    async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
        const ext = filename.split('.').pop()?.toLowerCase();
        this.logger.log(`Parsing ${ext} file: ${filename}`);

        switch (ext) {
            case 'pdf':
                return this.parsePdf(buffer);
            case 'xlsx':
            case 'xls':
                return this.parseExcel(buffer);
            case 'csv':
                return this.parseCsv(buffer);
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
            case 'tiff':
            case 'tif':
            case 'bmp':
                return this.parseImage(buffer, ext);
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    }

    /**
     * Get or initialize OCR worker
     */
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

    /**
     * Parse scanned image documents using OCR
     */
    private async parseImage(buffer: Buffer, ext: string): Promise<ParsedDocument> {
        this.logger.log(`Processing scanned image document (${ext})...`);

        try {
            // Preprocess image for better OCR results
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
                }
            };
        } catch (error) {
            this.logger.error(`Image OCR failed: ${error.message}`);
            throw new Error(`Failed to process scanned image: ${error.message}`);
        }
    }

    private async parsePdf(buffer: Buffer): Promise<ParsedDocument> {
        try {
            // @ts-ignore - pdf-parse has inconsistent type definitions
            const pdfParse = require('pdf-parse');

            // Add options to handle problematic PDFs
            const options = {
                max: 0, // no page limit
                version: 'v2.0.550'
            };

            const data = await pdfParse(buffer, options);

            // Check if PDF has sufficient extractable text or if it's scanned
            const textContent = data.text?.trim() || '';
            const hasText = textContent.length > 100;

            if (hasText) {
                this.logger.log(`PDF parsed successfully: ${textContent.length} characters from ${data.numpages} pages`);
                return {
                    type: 'pdf',
                    rawText: data.text,
                    metadata: { pages: data.numpages }
                };
            }

            // If PDF has minimal text, it's likely a scanned document
            this.logger.log('PDF appears to be scanned/image-based. Returning with warning...');

            return {
                type: 'pdf',
                rawText: textContent || 'This PDF appears to be scanned or image-based.',
                metadata: {
                    pages: data.numpages,
                    isScanned: true,
                    warning: 'PDF appears to be scanned. For better results, upload the original image files (JPG/PNG) or a text-based PDF.'
                }
            };
        } catch (error) {
            this.logger.error(`PDF parsing failed: ${error.message}`);

            // Instead of throwing, return a placeholder so the user can still see something
            return {
                type: 'pdf',
                rawText: '',
                metadata: {
                    isScanned: true,
                    parseError: true,
                    warning: 'Could not extract text from this PDF. Please try uploading as image files (JPG/PNG) for OCR processing.'
                }
            };
        }
    }

    private async parseExcel(buffer: Buffer): Promise<ParsedDocument> {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheets: Record<string, any[]> = {};
            let rawText = '';

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                sheets[sheetName] = jsonData;

                // Convert to text for AI analysis
                const sheetText = jsonData.map((row: any) =>
                    Object.entries(row).map(([key, val]) => `${key}: ${val}`).join(', ')
                ).join('\n');

                rawText += `\n### Sheet: ${sheetName}\n${sheetText}\n`;
            });

            return {
                type: 'excel',
                sheets,
                rawText,
                metadata: { sheetNames: workbook.SheetNames }
            };
        } catch (error) {
            throw new Error('Failed to parse Excel file. Ensure it\'s a valid .xlsx or .xls file.');
        }
    }

    private async parseCsv(buffer: Buffer): Promise<ParsedDocument> {
        return new Promise((resolve, reject) => {
            const csvText = buffer.toString('utf-8');

            Papa.parse(csvText, {
                header: true,
                complete: (results) => {
                    const rows = results.data;
                    const rawText = rows.map(row =>
                        Object.entries(row).map(([key, val]) => `${key}: ${val}`).join(', ')
                    ).join('\n');

                    resolve({
                        type: 'csv',
                        rows,
                        rawText
                    });
                },
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                }
            });
        });
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
