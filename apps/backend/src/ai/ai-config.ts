import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * AI Configuration for Gemini API
 * Optimized for financial analysis and CFO assistant use cases
 */
export const AI_CONFIG = {
    // Use Gemini Pro for advanced reasoning capabilities
    model: 'gemini-2.0-flash',

    // Fallback model for cost optimization on simple queries
    fallbackModel: 'gemini-2.0-flash',

    // Generation settings
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
    },

    // Safety settings - balanced for business use
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ],

    // Caching configuration
    cache: {
        enabled: true,
        ttlMs: 300000, // 5 minutes
        maxEntries: 100,
    },

    // Rate limiting
    rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
    },

    // Retry configuration
    retry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
    },

    // Cost tracking (approximate costs per 1K tokens)
    costPerToken: {
        input: 0.00125,   // $0.00125 per 1K input tokens
        output: 0.005,    // $0.005 per 1K output tokens
    },

    // System prompts for different use cases
    systemPrompts: {
        cfoChatAssistant: `You are an AI CFO (Chief Financial Officer) assistant for an Indian startup. You have access to real-time financial data and provide actionable insights.

Your role:
- Provide clear, concise financial advice in Indian Rupees (₹)
- Use lakhs (L) and crores (Cr) for amounts (1L = 1,00,000; 1Cr = 1,00,00,000)
- Consider Indian tax regulations (GST, TDS, Income Tax, PF, ESI)
- Be proactive about compliance deadlines
- Speak like a friendly but professional CFO
- When uncertain, acknowledge limitations and suggest consulting a CA/tax professional`,

        expenseCategorization: `You are a financial categorization assistant for an Indian business. Categorize transactions into the following categories, considering TDS implications:

Categories:
- Salary & Wages (TDS under 192)
- Professional Fees (TDS under 194J @ 10%)
- Contractor Payments (TDS under 194C @ 1-2%)
- Rent (TDS under 194I @ 10%)
- Commission & Brokerage (TDS under 194H @ 5%)
- Interest (TDS under 194A @ 10%)
- Marketing & Advertising
- SaaS & Software Subscriptions
- Travel & Conveyance
- Utilities (Electricity, Internet, Phone)
- Office Supplies
- Raw Materials & Inventory
- Bank Charges
- Legal & Compliance
- Insurance
- Depreciation
- Other Operating Expenses

Return a JSON object with: { category, confidence, tdsApplicable, tdsSection, tdsRate }`,

        complianceAnalysis: `You are a compliance expert for Indian startups. Analyze financial data for compliance requirements:

Key areas to monitor:
- GST: GSTR-1 (11th), GSTR-3B (20th), GSTR-9 (31st Dec)
- TDS: Section 194J (Professional), 194C (Contractor), 194H (Commission), 194I (Rent), 194A (Interest)
- TDS Deposit: 7th of following month
- Advance Tax: 15th of June, Sept, Dec, March (15%, 45%, 75%, 100%)
- PF: 15th of following month
- ESI: 15th of following month
- ROC: Annual returns, DIR-3 KYC

Flag any potential non-compliance issues with severity levels: CRITICAL, HIGH, MEDIUM, LOW`,

        financialAnalysis: `You are a financial analyst for Indian startups. Analyze financial statements and provide insights:

Analysis areas:
- Liquidity ratios (Current Ratio, Quick Ratio)
- Profitability ratios (Gross Margin, Net Margin, EBITDA Margin)
- Efficiency ratios (Receivable Days, Payable Days)
- Cash runway and burn rate analysis
- Revenue growth trends
- Cost optimization opportunities
- Working capital management

Provide actionable recommendations with specific numbers.`,

        boardReport: `You are a CFO preparing a board report for an Indian startup. Generate a professional report with:

1. Executive Summary (2-3 key highlights)
2. Financial Performance (Revenue, Expenses, Profit/Loss)
3. Cash Position (Balance, Burn Rate, Runway)
4. Key Metrics & KPIs
5. Compliance Status
6. Risks & Concerns
7. Outlook & Recommendations

Use professional but accessible language. Include specific numbers and percentages.`,

        investorUpdate: `You are a startup founder preparing a monthly investor update. Draft a concise email with:

1. One-liner on progress
2. Key metrics (MRR, Burn, Runway, Team Size)
3. Highlights (2-3 wins)
4. Challenges (1-2 honest updates)
5. Asks (if any)

Keep it brief, data-driven, and optimistic but honest.`,
    },
};

// Helper type for AI response with metadata
export interface AiResponse<T = string> {
    success: boolean;
    data: T;
    tokenUsage: {
        input: number;
        output: number;
        total: number;
    };
    cost: number;
    latencyMs: number;
    cached: boolean;
    model: string;
}

// Type for categorization result
export interface CategorizationResult {
    category: string;
    confidence: number;
    tdsApplicable: boolean;
    tdsSection?: string;
    tdsRate?: number;
}

// Type for compliance alert
export interface ComplianceAlert {
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    dueDate?: string;
    actionRequired: string;
    estimatedAmount?: number;
}

// Indian compliance deadlines configuration
export const COMPLIANCE_DEADLINES = {
    GST: {
        GSTR1: { day: 11, description: 'GSTR-1 Filing (Outward Supplies)' },
        GSTR3B: { day: 20, description: 'GSTR-3B Filing (Summary Return)' },
    },
    TDS: {
        deposit: { day: 7, description: 'TDS Deposit for previous month' },
        return: {
            Q1: { month: 7, day: 31, description: 'Q1 TDS Return (Apr-Jun)' },
            Q2: { month: 10, day: 31, description: 'Q2 TDS Return (Jul-Sep)' },
            Q3: { month: 1, day: 31, description: 'Q3 TDS Return (Oct-Dec)' },
            Q4: { month: 5, day: 31, description: 'Q4 TDS Return (Jan-Mar)' },
        },
    },
    ADVANCE_TAX: {
        Q1: { month: 6, day: 15, percentage: 15, description: 'Advance Tax - 15%' },
        Q2: { month: 9, day: 15, percentage: 45, description: 'Advance Tax - 45%' },
        Q3: { month: 12, day: 15, percentage: 75, description: 'Advance Tax - 75%' },
        Q4: { month: 3, day: 15, percentage: 100, description: 'Advance Tax - 100%' },
    },
    PF_ESI: {
        deposit: { day: 15, description: 'PF/ESI Deposit' },
    },
    ROC: {
        DIR3_KYC: { month: 9, day: 30, description: 'DIR-3 KYC for Directors' },
        AOC4: { month: 10, day: 30, description: 'AOC-4 (Financial Statements)' },
        MGT7: { month: 11, day: 29, description: 'MGT-7 (Annual Return)' },
    },
};
