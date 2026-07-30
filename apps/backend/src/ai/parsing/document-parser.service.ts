import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { FinancialMath } from '../../common/math/financial-math.util';

// ── Zod Schema for Validated Financial Ingestion ──────────────────────────────

export const FinancialLineItemSchema = z.object({
    description: z.string().default('Uncategorized Item'),
    amount: z.number().nonnegative().default(0),
    category: z.string().optional().default('General'),
});

export const ParsedFinancialDocumentSchema = z.object({
    documentType: z.enum(['INVOICE', 'BANK_STATEMENT', 'TAX_RECEIPT', 'BALANCE_SHEET', 'UNKNOWN']).default('INVOICE'),
    vendorName: z.string().optional().default('Unknown Vendor'),
    invoiceNumber: z.string().optional().default(''),
    date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
    totalAmount: z.string().default('0.00'),
    taxAmount: z.string().default('0.00'),
    currency: z.string().default('INR'),
    lineItems: z.array(FinancialLineItemSchema).default([]),
    confidenceScore: z.number().min(0).max(1).default(0.85),
    processingNotes: z.array(z.string()).default([]),
});

export type ParsedFinancialDocument = z.infer<typeof ParsedFinancialDocumentSchema>;

@Injectable()
export class DocumentParserService {
    private readonly logger = new Logger(DocumentParserService.name);

    /**
     * Parses raw OCR text into a Zod-validated structured financial object.
     * Uses deterministic regex extraction + safe Zod validation fallback.
     */
    parseOcrText(rawText: string, filename: string = 'document'): ParsedFinancialDocument {
        this.logger.log(`Parsing OCR text for file: ${filename} (Length: ${rawText.length} chars)`);

        try {
            // 1. Extract Amounts via Regex
            const amountMatches = rawText.match(/(?:(?:₹|INR|RS|\$)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/gi) || [];
            const numbers = amountMatches
                .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
                .filter(n => !isNaN(n) && n > 0)
                .sort((a, b) => b - a);

            const totalAmount = numbers.length > 0 ? FinancialMath.toString(numbers[0]) : '0.00';
            const taxAmount = numbers.length > 1 ? FinancialMath.toString(numbers[numbers.length - 1]) : '0.00';

            // 2. Extract Vendor Name Candidate
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
            const vendorCandidate = lines.find(l => 
                !l.toLowerCase().includes('invoice') && 
                !l.toLowerCase().includes('tax') && 
                !l.toLowerCase().includes('date') &&
                !l.toLowerCase().includes('total')
            ) || 'Unknown Vendor';

            // 3. Extract Invoice Number Candidate
            const invoiceMatch = rawText.match(/(?:inv|invoice|ref|bill|no|#)[\s:#|-]*([a-z0-9-]+)/i);
            const invoiceNumber = invoiceMatch ? invoiceMatch[1] : `INV-${Date.now().toString().slice(-6)}`;

            // 4. Construct Raw DTO
            const rawPayload = {
                documentType: rawText.toLowerCase().includes('statement') ? 'BANK_STATEMENT' : 'INVOICE',
                vendorName: vendorCandidate,
                invoiceNumber,
                date: new Date().toISOString().split('T')[0],
                totalAmount,
                taxAmount,
                currency: 'INR',
                lineItems: [
                    {
                        description: `Extracted ${filename}`,
                        amount: parseFloat(totalAmount),
                        category: 'Operations',
                    }
                ],
                confidenceScore: rawText.length > 100 ? 0.90 : 0.65,
                processingNotes: ['Parsed using deterministic rule-based extractor with Zod validation.'],
            };

            // 5. Validate against Zod Schema
            return ParsedFinancialDocumentSchema.parse(rawPayload);
        } catch (error: any) {
            this.logger.error(`Zod parsing validation warning: ${error.message}`);
            
            // Safe Failure Fallback
            return ParsedFinancialDocumentSchema.parse({
                documentType: 'UNKNOWN',
                vendorName: 'Unparsed Document',
                totalAmount: '0.00',
                taxAmount: '0.00',
                confidenceScore: 0.10,
                processingNotes: [`Parsing error: ${error.message}`],
            });
        }
    }
}
