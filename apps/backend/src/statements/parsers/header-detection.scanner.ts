import { Injectable, Logger } from '@nestjs/common';

export interface HeaderScanResult {
    found: boolean;
    headerRowIndex: number;
    skippedRows: number;
    rawHeaderLine: string;
    sanitizedCsvText: string;
    detectedColumns: {
        dateCol?: string;
        narrationCol?: string;
        debitCol?: string;
        creditCol?: string;
        balanceCol?: string;
        refCol?: string;
        drCrFlagCol?: string;
    };
    confidenceScore: number; // 0.0 - 1.0
}

@Injectable()
export class HeaderDetectionScanner {
    private static readonly logger = new Logger(HeaderDetectionScanner.name);

    private static readonly DATE_KEYWORDS = ['txn date', 'transaction date', 'value date', 'post date', 'date'];
    private static readonly NARRATION_KEYWORDS = ['particulars', 'description', 'narration', 'transaction remarks', 'remarks', 'details'];
    private static readonly DEBIT_KEYWORDS = ['debit', 'withdrawal', 'dr amount', 'debit amount', 'dr', 'outflow'];
    private static readonly CREDIT_KEYWORDS = ['credit', 'deposit', 'cr amount', 'credit amount', 'cr', 'inflow'];
    private static readonly BALANCE_KEYWORDS = ['balance', 'running balance', 'closing balance', 'net balance'];
    private static readonly REF_KEYWORDS = ['ref no', 'cheque no', 'chq no', 'utr', 'reference', 'voucher no', 'tran id'];

    private static isKeywordMatch(text: string, keywords: string[]): boolean {
        const lc = text.toLowerCase().trim();
        return keywords.some(k => {
            if (k.length <= 2) {
                // Exact match or word boundary for short abbreviations like 'dr', 'cr'
                const regex = new RegExp(`\\b${k}\\b`, 'i');
                return regex.test(lc);
            }
            return lc.includes(k);
        });
    }

    /**
     * Scans arbitrary CSV text for the true table header row.
     * Skips up to 35 leading disclaimer/metadata rows (solving SBI/BoB/ICICI metadata blocks).
     */
    public static scanAndSanitize(csvText: string): HeaderScanResult {
        const lines = csvText.split(/\r?\n/);
        const maxScanLines = Math.min(lines.length, 35);

        for (let i = 0; i < maxScanLines; i++) {
            const rawLine = lines[i].trim();
            if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('--')) continue;

            const hasDate = this.isKeywordMatch(rawLine, this.DATE_KEYWORDS);
            const hasNarration = this.isKeywordMatch(rawLine, this.NARRATION_KEYWORDS);
            const hasDebitOrCredit = this.isKeywordMatch(rawLine, this.DEBIT_KEYWORDS) || this.isKeywordMatch(rawLine, this.CREDIT_KEYWORDS);

            // A valid table header must contain at least (Date AND Narration) OR (Date AND Debit/Credit)
            if (hasDate && (hasNarration || hasDebitOrCredit)) {
                const remainingLines = lines.slice(i);
                const sanitizedCsvText = remainingLines.join('\n');

                const columns = rawLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                const detected: HeaderScanResult['detectedColumns'] = {};

                for (const col of columns) {
                    if (!detected.dateCol && this.isKeywordMatch(col, this.DATE_KEYWORDS)) detected.dateCol = col;
                    if (!detected.narrationCol && this.isKeywordMatch(col, this.NARRATION_KEYWORDS)) detected.narrationCol = col;
                    if (!detected.debitCol && this.isKeywordMatch(col, this.DEBIT_KEYWORDS)) detected.debitCol = col;
                    if (!detected.creditCol && this.isKeywordMatch(col, this.CREDIT_KEYWORDS)) detected.creditCol = col;
                    if (!detected.balanceCol && this.isKeywordMatch(col, this.BALANCE_KEYWORDS)) detected.balanceCol = col;
                    if (!detected.refCol && this.isKeywordMatch(col, this.REF_KEYWORDS)) detected.refCol = col;
                }

                let confidence = 0.6;
                if (detected.dateCol) confidence += 0.1;
                if (detected.narrationCol) confidence += 0.1;
                if (detected.debitCol || detected.creditCol) confidence += 0.1;
                if (detected.balanceCol) confidence += 0.1;

                this.logger.log(`HeaderScanner: Detected table header on row ${i + 1} (Skipped ${i} disclaimer rows). Confidence: ${confidence.toFixed(2)}`);

                return {
                    found: true,
                    headerRowIndex: i,
                    skippedRows: i,
                    rawHeaderLine: rawLine,
                    sanitizedCsvText,
                    detectedColumns: detected,
                    confidenceScore: Math.min(confidence, 1.0),
                };
            }
        }

        // Fallback: No explicit header detected; return original CSV
        return {
            found: false,
            headerRowIndex: 0,
            skippedRows: 0,
            rawHeaderLine: lines[0] || '',
            sanitizedCsvText: csvText,
            detectedColumns: {},
            confidenceScore: 0.3,
        };
    }
}
