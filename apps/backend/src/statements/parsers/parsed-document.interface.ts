// ═══════════════════════════════════════════════════════════════════════════════
// PARSED DOCUMENT INTERFACE v2 — Enhanced with Quality Scoring & Validation
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedTransaction {
    date: string;               // Normalized to YYYY-MM-DD
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
    category?: string;          // Auto-categorized (Indian context)
    rawDateString?: string;     // Original date string before normalization
}

export interface ParsingIssue {
    type: 'balance_mismatch' | 'duplicate' | 'date_format' | 'missing_field' | 'low_ocr_confidence' | 'scanned_fallback';
    severity: 'error' | 'warning' | 'info';
    message: string;
    rowIndex?: number;
}

export interface ParsingQuality {
    score: number;              // 0-100
    label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    issues: ParsingIssue[];
    validationChecks: {
        balanceVerified: boolean;
        debitCreditMatch: boolean;
        dateNormalized: boolean;
        duplicatesDetected: number;
        transactionCount: number;
    };
}

export interface ParsedDocument {
    type: 'pdf' | 'excel' | 'csv' | 'image';
    rawText: string;
    tables?: any[][];
    sheets?: Record<string, any[]>;
    rows?: any[];
    transactions?: ParsedTransaction[];   // Structured extracted transactions
    quality?: ParsingQuality;             // Quality scoring
    metadata?: {
        pages?: number;
        sheetNames?: string[];
        confidence?: number;
        originalFormat?: string;
        isScanned?: boolean;
        parseError?: boolean;
        warning?: string;
        parserUsed?: string;              // Which parser in the chain succeeded
        ocrConfidence?: number;           // OCR confidence if applicable
        visionUsed?: boolean;             // Whether Gemini Vision was used
    };
}
