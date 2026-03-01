export interface FinancialMetrics {
    documentType: string;
    period: string | null;
    currency: string;
    confidence: 'high' | 'medium' | 'low';

    // Balance Sheet
    totalAssets?: number | null;
    totalLiabilities?: number | null;
    totalEquity?: number | null;
    currentAssets?: number | null;
    currentLiabilities?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;

    // P&L
    revenue?: number | null;
    totalExpenses?: number | null;
    netProfit?: number | null;
    grossProfit?: number | null;
    ebitda?: number | null;
    profitMargin?: number | null;

    // Cash Flow
    operatingCashFlow?: number | null;
    investingCashFlow?: number | null;
    financingCashFlow?: number | null;
    netCashFlow?: number | null;

    // Burn & Runway
    monthlyBurn?: number | null;
    cashRunway?: number | null;

    // Bank Statement
    openingBalance?: number | null;
    closingBalance?: number | null;
    totalCredits?: number | null;
    totalDebits?: number | null;

    // GST
    gstLiability?: number | null;
    inputTaxCredit?: number | null;
    netGstPayable?: number | null;

    // Invoices
    totalInvoiceValue?: number | null;
    pendingReceivables?: number | null;

    extractedFields: string[];
    warnings: string[];
}
