export interface ParsedDocument {
    type: 'pdf' | 'excel' | 'csv' | 'image';
    rawText: string;
    tables?: any[][];
    sheets?: Record<string, any[]>;
    rows?: any[];
    metadata?: {
        pages?: number;
        sheetNames?: string[];
        confidence?: number;
        originalFormat?: string;
        isScanned?: boolean;
        parseError?: boolean;
        warning?: string;
    };
}

