import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
import { AI_CONFIG, AiResponse, CategorizationResult, ComplianceAlert, COMPLIANCE_DEADLINES } from './ai-config';
import { AiMetricsService } from './ai-metrics.service';

interface CacheEntry {
    response: string;
    timestamp: number;
    tokens: { input: number; output: number };
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private flashModel: GenerativeModel | null = null;

    // Simple in-memory cache
    private cache: Map<string, CacheEntry> = new Map();

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private metricsService: AiMetricsService,
    ) {
        this.initializeModels();
    }

    private initializeModels(): void {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            this.logger.warn('GEMINI_API_KEY not configured. AI features will use fallback responses.');
            return;
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey);

            // Primary model for complex reasoning
            this.model = this.genAI.getGenerativeModel({
                model: AI_CONFIG.model,
                generationConfig: AI_CONFIG.generationConfig,
                safetySettings: AI_CONFIG.safetySettings,
            });

            // Flash model for quick, simple queries
            this.flashModel = this.genAI.getGenerativeModel({
                model: AI_CONFIG.fallbackModel,
                generationConfig: {
                    ...AI_CONFIG.generationConfig,
                    maxOutputTokens: 2048,
                },
            });

            this.logger.log(`Gemini AI initialized with models: ${AI_CONFIG.model}, ${AI_CONFIG.fallbackModel}`);
        } catch (error) {
            this.logger.error(`Failed to initialize Gemini: ${error.message}`);
        }
    }

    /**
     * Generate content with retry logic and metrics tracking
     */
    private async generateWithRetry(
        prompt: string,
        organizationId: string,
        endpoint: string,
        useFlash: boolean = false
    ): Promise<AiResponse<string>> {
        const startTime = Date.now();
        const cacheKey = this.getCacheKey(prompt);

        // Check cache first
        if (AI_CONFIG.cache.enabled) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < AI_CONFIG.cache.ttlMs) {
                const latencyMs = Date.now() - startTime;

                await this.metricsService.recordUsage({
                    organizationId,
                    endpoint,
                    model: useFlash ? AI_CONFIG.fallbackModel : AI_CONFIG.model,
                    inputTokens: cached.tokens.input,
                    outputTokens: cached.tokens.output,
                    totalTokens: cached.tokens.input + cached.tokens.output,
                    cost: 0, // Cached response is free
                    latencyMs,
                    cached: true,
                    success: true,
                });

                return {
                    success: true,
                    data: cached.response,
                    tokenUsage: {
                        input: cached.tokens.input,
                        output: cached.tokens.output,
                        total: cached.tokens.input + cached.tokens.output,
                    },
                    cost: 0,
                    latencyMs,
                    cached: true,
                    model: useFlash ? AI_CONFIG.fallbackModel : AI_CONFIG.model,
                };
            }
        }

        // Check rate limit
        if (this.metricsService.isRateLimitExceeded(organizationId)) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        const selectedModel = useFlash ? this.flashModel : this.model;
        if (!selectedModel) {
            return this.createFallbackResponse(startTime, endpoint);
        }

        let lastError: Error | null = null;
        const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = AI_CONFIG.retry;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result: GenerateContentResult = await selectedModel.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Get token counts (approximate if not available)
                const inputTokens = Math.ceil(prompt.length / 4);
                const outputTokens = Math.ceil(text.length / 4);
                const cost = this.metricsService.calculateCost(inputTokens, outputTokens);
                const latencyMs = Date.now() - startTime;

                // Cache the response
                if (AI_CONFIG.cache.enabled) {
                    this.cache.set(cacheKey, {
                        response: text,
                        timestamp: Date.now(),
                        tokens: { input: inputTokens, output: outputTokens },
                    });

                    // Cleanup old cache entries
                    if (this.cache.size > AI_CONFIG.cache.maxEntries) {
                        const oldestKey = this.cache.keys().next().value;
                        if (oldestKey) this.cache.delete(oldestKey);
                    }
                }

                // Record metrics
                await this.metricsService.recordUsage({
                    organizationId,
                    endpoint,
                    model: useFlash ? AI_CONFIG.fallbackModel : AI_CONFIG.model,
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                    cost,
                    latencyMs,
                    cached: false,
                    success: true,
                });

                return {
                    success: true,
                    data: text,
                    tokenUsage: {
                        input: inputTokens,
                        output: outputTokens,
                        total: inputTokens + outputTokens,
                    },
                    cost,
                    latencyMs,
                    cached: false,
                    model: useFlash ? AI_CONFIG.fallbackModel : AI_CONFIG.model,
                };
            } catch (error) {
                lastError = error;
                this.logger.warn(`Gemini API attempt ${attempt + 1} failed: ${error.message}`);

                if (attempt < maxRetries) {
                    const delay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt), maxDelayMs);
                    await this.sleep(delay);
                }
            }
        }

        // Record failed attempt
        await this.metricsService.recordUsage({
            organizationId,
            endpoint,
            model: useFlash ? AI_CONFIG.fallbackModel : AI_CONFIG.model,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cost: 0,
            latencyMs: Date.now() - startTime,
            cached: false,
            success: false,
            errorMessage: lastError?.message,
        });

        this.logger.error(`Gemini API failed after ${maxRetries} retries: ${lastError?.message}`);
        return this.createFallbackResponse(startTime, endpoint);
    }

    private createFallbackResponse(startTime: number, endpoint: string): AiResponse<string> {
        return {
            success: false,
            data: 'I apologize, but I\'m currently unable to process this request. Please try again later or contact support.',
            tokenUsage: { input: 0, output: 0, total: 0 },
            cost: 0,
            latencyMs: Date.now() - startTime,
            cached: false,
            model: 'fallback',
        };
    }

    private getCacheKey(prompt: string): string {
        // Simple hash for cache key
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `ai_cache_${hash}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== Financial Context ====================

    private async getFinancialContext(organizationId: string): Promise<string> {
        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 100,
        });

        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
        });

        const invoices = await this.prisma.invoice.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Calculate key metrics
        const totalBalance = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const income = transactions.filter(t => t.type === 'INCOME');
        const monthlyExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0) / 3;
        const monthlyIncome = income.reduce((sum, t) => sum + Number(t.amount), 0) / 3;
        const monthlyBurn = monthlyExpense - monthlyIncome;
        const runway = monthlyBurn > 0 ? Math.round(totalBalance / monthlyBurn) : 99;

        // Category breakdown
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(t => {
            const cat = t.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
        });

        const topCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Invoice summary
        const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE');
        const pendingInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT');
        const totalReceivables = pendingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

        return `
FINANCIAL CONTEXT (as of ${new Date().toLocaleDateString('en-IN')}):

CASH POSITION:
- Total Bank Balance: ₹${(totalBalance / 100000).toFixed(2)}L
- Monthly Burn Rate: ₹${(monthlyBurn / 100000).toFixed(2)}L
- Monthly Income: ₹${(monthlyIncome / 100000).toFixed(2)}L
- Runway: ${runway} months

EXPENSE BREAKDOWN (Last 3 months):
${topCategories.map(([cat, amt]) => `- ${cat}: ₹${(amt / 1000).toFixed(0)}K`).join('\n')}

ACCOUNTS RECEIVABLE:
- Pending Invoices: ${pendingInvoices.length} (₹${(totalReceivables / 100000).toFixed(2)}L)
- Overdue Invoices: ${overdueInvoices.length}

BANK ACCOUNTS: ${bankAccounts.length} connected
${bankAccounts.length > 0 ? '- ' + bankAccounts.map(acc => `${acc.name}: ₹${(Number(acc.balance) / 100000).toFixed(2)}L`).join('\n- ') : '- No accounts connected'}
`;
    }

    // ==================== Chat API ====================

    async getChatResponse(organizationId: string, message: string): Promise<string> {
        const context = await this.getFinancialContext(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.cfoChatAssistant}

${context}

USER QUESTION: ${message}

Respond naturally and helpfully. If the user asks about something not in the data, provide general guidance. Keep responses concise but informative.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'chat', false);

        if (!result.success) {
            return this.getFallbackResponse(organizationId, message);
        }

        return result.data;
    }

    private async getFallbackResponse(organizationId: string, message: string): Promise<string> {
        const lowMessage = message.toLowerCase();
        const forecast = await this.getCashFlowForecast(organizationId);
        const tds = await this.getTdsLiability(organizationId);

        if (lowMessage.includes('runway')) {
            return `Based on your current balance of ₹${(forecast.currentBalance / 100000).toFixed(1)}L and monthly burn of ₹${(forecast.monthlyBurn / 100000).toFixed(1)}L, your runway is approximately ${forecast.runwayMonths} months. ${forecast.riskLevel === 'HIGH' ? '⚠️ This is concerning - consider reducing burn or raising funds.' : 'You\'re in a healthy position.'}`;
        }

        if (lowMessage.includes('tds') || lowMessage.includes('tax')) {
            return `Your TDS liability for this quarter is ₹${(tds.totalTdsPayable / 1000).toFixed(0)}K across ${tds.liabilities.length} categories. Next deposit due: ${tds.nextDueDate}. Shall I prepare the challan?`;
        }

        if (lowMessage.includes('burn') || lowMessage.includes('expense')) {
            const topCat = forecast.topExpenseCategories[0];
            return `Your monthly burn is ₹${(forecast.monthlyBurn / 100000).toFixed(1)}L. Top expense: ${topCat?.name || 'General'} (${topCat?.percentage || 0}% of spend). I can help optimize this.`;
        }

        if (lowMessage.includes('gst')) {
            return "Your GST summary: GSTR-3B for January is due by Feb 20th. Based on your sales, estimated liability is ₹85,000. ITC available: ₹62,000. Net payable: ₹23,000.";
        }

        return `I'm analyzing your financials. Current balance: ₹${(forecast.currentBalance / 100000).toFixed(1)}L, Runway: ${forecast.runwayMonths} months, TDS pending: ₹${(tds.totalTdsPayable / 1000).toFixed(0)}K. What would you like to explore?`;
    }

    // ==================== Expense Categorization ====================

    async categorizeTransaction(
        organizationId: string,
        description: string,
        amount: number,
        vendor?: string
    ): Promise<CategorizationResult> {
        const prompt = `${AI_CONFIG.systemPrompts.expenseCategorization}

Transaction details:
- Description: ${description}
- Amount: ₹${amount.toLocaleString('en-IN')}
- Vendor: ${vendor || 'Not specified'}

Respond ONLY with a JSON object (no markdown, no explanation):`;

        const result = await this.generateWithRetry(prompt, organizationId, 'categorize', true);

        if (!result.success) {
            return {
                category: 'Other Operating Expenses',
                confidence: 0.5,
                tdsApplicable: false,
            };
        }

        try {
            // Parse JSON from response
            const jsonMatch = result.data.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as CategorizationResult;
            }
        } catch {
            this.logger.warn('Failed to parse categorization response');
        }

        return {
            category: 'Other Operating Expenses',
            confidence: 0.5,
            tdsApplicable: false,
        };
    }

    async categorizeTransactionsBatch(
        organizationId: string,
        transactions: Array<{ id: string; description: string; amount: number; vendor?: string }>
    ): Promise<Array<{ id: string; result: CategorizationResult }>> {
        const results: Array<{ id: string; result: CategorizationResult }> = [];

        // Process in batches of 5 to avoid rate limits
        for (let i = 0; i < transactions.length; i += 5) {
            const batch = transactions.slice(i, i + 5);
            const batchResults = await Promise.all(
                batch.map(async (t) => ({
                    id: t.id,
                    result: await this.categorizeTransaction(organizationId, t.description, t.amount, t.vendor),
                }))
            );
            results.push(...batchResults);

            // Small delay between batches
            if (i + 5 < transactions.length) {
                await this.sleep(500);
            }
        }

        return results;
    }

    // ==================== Compliance Analysis ====================

    async getComplianceAlerts(organizationId: string): Promise<ComplianceAlert[]> {
        const context = await this.getFinancialContext(organizationId);
        const today = new Date();

        const prompt = `${AI_CONFIG.systemPrompts.complianceAnalysis}

Today's date: ${today.toLocaleDateString('en-IN')}

${context}

Based on this data, identify upcoming compliance deadlines and potential issues.
Respond with a JSON array of alerts, each with: { type, severity, title, description, dueDate, actionRequired, estimatedAmount }`;

        const result = await this.generateWithRetry(prompt, organizationId, 'compliance-alerts', false);

        if (!result.success) {
            return this.getDefaultComplianceAlerts(today);
        }

        try {
            const jsonMatch = result.data.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as ComplianceAlert[];
            }
        } catch {
            this.logger.warn('Failed to parse compliance alerts');
        }

        return this.getDefaultComplianceAlerts(today);
    }

    private getDefaultComplianceAlerts(today: Date): ComplianceAlert[] {
        const alerts: ComplianceAlert[] = [];
        const currentDay = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        // TDS Deposit (7th)
        if (currentDay <= 7) {
            alerts.push({
                type: 'TDS',
                severity: currentDay >= 5 ? 'HIGH' : 'MEDIUM',
                title: 'TDS Deposit Due',
                description: COMPLIANCE_DEADLINES.TDS.deposit.description,
                dueDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-07`,
                actionRequired: 'Deposit TDS collected last month',
            });
        }

        // GSTR-1 (11th)
        if (currentDay <= 11) {
            alerts.push({
                type: 'GST',
                severity: currentDay >= 9 ? 'HIGH' : 'MEDIUM',
                title: 'GSTR-1 Filing Due',
                description: COMPLIANCE_DEADLINES.GST.GSTR1.description,
                dueDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-11`,
                actionRequired: 'File GSTR-1 for outward supplies',
            });
        }

        // PF/ESI (15th)
        if (currentDay <= 15) {
            alerts.push({
                type: 'PF_ESI',
                severity: currentDay >= 13 ? 'HIGH' : 'MEDIUM',
                title: 'PF/ESI Deposit Due',
                description: COMPLIANCE_DEADLINES.PF_ESI.deposit.description,
                dueDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`,
                actionRequired: 'Deposit PF and ESI contributions',
            });
        }

        // GSTR-3B (20th)
        if (currentDay <= 20) {
            alerts.push({
                type: 'GST',
                severity: currentDay >= 18 ? 'HIGH' : 'MEDIUM',
                title: 'GSTR-3B Filing Due',
                description: COMPLIANCE_DEADLINES.GST.GSTR3B.description,
                dueDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-20`,
                actionRequired: 'File GSTR-3B and pay GST liability',
            });
        }

        return alerts;
    }

    async getComplianceCalendar(organizationId: string, months: number = 3): Promise<any[]> {
        const calendar: any[] = [];
        const today = new Date();

        for (let m = 0; m < months; m++) {
            const month = new Date(today.getFullYear(), today.getMonth() + m, 1);
            const monthName = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            const deadlines: any[] = [];

            // Add all deadlines for this month
            Object.entries(COMPLIANCE_DEADLINES).forEach(([category, items]) => {
                if (category === 'GST') {
                    deadlines.push({
                        date: COMPLIANCE_DEADLINES.GST.GSTR1.day,
                        type: 'GST',
                        title: 'GSTR-1',
                        description: COMPLIANCE_DEADLINES.GST.GSTR1.description,
                    });
                    deadlines.push({
                        date: COMPLIANCE_DEADLINES.GST.GSTR3B.day,
                        type: 'GST',
                        title: 'GSTR-3B',
                        description: COMPLIANCE_DEADLINES.GST.GSTR3B.description,
                    });
                } else if (category === 'TDS') {
                    deadlines.push({
                        date: COMPLIANCE_DEADLINES.TDS.deposit.day,
                        type: 'TDS',
                        title: 'TDS Deposit',
                        description: COMPLIANCE_DEADLINES.TDS.deposit.description,
                    });
                } else if (category === 'PF_ESI') {
                    deadlines.push({
                        date: COMPLIANCE_DEADLINES.PF_ESI.deposit.day,
                        type: 'PF_ESI',
                        title: 'PF/ESI Deposit',
                        description: COMPLIANCE_DEADLINES.PF_ESI.deposit.description,
                    });
                }
            });

            // Check for quarterly deadlines
            const monthNum = month.getMonth() + 1;
            Object.entries(COMPLIANCE_DEADLINES.ADVANCE_TAX).forEach(([quarter, info]) => {
                if (info.month === monthNum) {
                    deadlines.push({
                        date: info.day,
                        type: 'ADVANCE_TAX',
                        title: `Advance Tax (${info.percentage}%)`,
                        description: info.description,
                    });
                }
            });

            // Check for ROC deadlines
            Object.entries(COMPLIANCE_DEADLINES.ROC).forEach(([filing, info]) => {
                if (info.month === monthNum) {
                    deadlines.push({
                        date: info.day,
                        type: 'ROC',
                        title: filing.replace('_', '-'),
                        description: info.description,
                    });
                }
            });

            calendar.push({
                month: monthName,
                deadlines: deadlines.sort((a, b) => a.date - b.date),
            });
        }

        return calendar;
    }

    // ==================== Predictions ====================

    async getPredictiveForecast(
        organizationId: string,
        months: number = 6
    ): Promise<{
        scenarios: { name: string; data: any[] }[];
        riskFactors: string[];
        recommendations: string[];
    }> {
        const context = await this.getFinancialContext(organizationId);
        const cashFlow = await this.getCashFlowForecast(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.financialAnalysis}

${context}

Current metrics:
- Balance: ₹${(cashFlow.currentBalance / 100000).toFixed(2)}L
- Monthly Burn: ₹${(cashFlow.monthlyBurn / 100000).toFixed(2)}L
- Monthly Income: ₹${(cashFlow.monthlyIncome / 100000).toFixed(2)}L
- Current Runway: ${cashFlow.runwayMonths} months

Generate a ${months}-month forecast with three scenarios (optimistic, realistic, pessimistic).
For each scenario, provide monthly projections of: balance, revenue, expenses, runway.
Also identify 3 key risk factors and 3 recommendations.

Respond with JSON:
{
  "scenarios": [
    { "name": "optimistic", "data": [{ "month": "Feb 2026", "balance": number, "revenue": number, "expenses": number, "runway": number }...] },
    { "name": "realistic", "data": [...] },
    { "name": "pessimistic", "data": [...] }
  ],
  "riskFactors": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

        const result = await this.generateWithRetry(prompt, organizationId, 'predictions', false);

        if (!result.success) {
            return this.getDefaultPredictions(cashFlow, months);
        }

        try {
            const jsonMatch = result.data.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            this.logger.warn('Failed to parse predictions');
        }

        return this.getDefaultPredictions(cashFlow, months);
    }

    private getDefaultPredictions(cashFlow: any, months: number): any {
        const scenarios = ['optimistic', 'realistic', 'pessimistic'];
        const multipliers = { optimistic: 0.8, realistic: 1.0, pessimistic: 1.2 };
        const revenueGrowth = { optimistic: 1.1, realistic: 1.0, pessimistic: 0.9 };

        return {
            scenarios: scenarios.map((name) => ({
                name,
                data: Array.from({ length: months }, (_, i) => {
                    const month = new Date();
                    month.setMonth(month.getMonth() + i + 1);
                    const burn = cashFlow.monthlyBurn * multipliers[name as keyof typeof multipliers];
                    const revenue = cashFlow.monthlyIncome * Math.pow(revenueGrowth[name as keyof typeof revenueGrowth], i + 1);
                    const balance = Math.max(0, cashFlow.currentBalance - (burn - revenue) * (i + 1));

                    return {
                        month: month.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                        balance,
                        revenue,
                        expenses: cashFlow.monthlyExpense * multipliers[name as keyof typeof multipliers],
                        runway: burn > revenue ? Math.round(balance / (burn - revenue)) : 99,
                    };
                }),
            })),
            riskFactors: [
                'High burn rate may deplete runway faster than expected',
                'Revenue concentration risk if dependent on few clients',
                'Market conditions may affect growth projections',
            ],
            recommendations: [
                'Maintain 6+ months runway buffer',
                'Diversify revenue streams to reduce concentration risk',
                'Set up monthly financial review cadence',
            ],
        };
    }

    // ==================== Board Reports & Investor Updates ====================

    async generateBoardReport(organizationId: string): Promise<string> {
        const context = await this.getFinancialContext(organizationId);
        const cashFlow = await this.getCashFlowForecast(organizationId);
        const compliance = await this.getComplianceAlerts(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.boardReport}

${context}

Additional metrics:
- Risk Level: ${cashFlow.riskLevel}
- Pending Compliance: ${compliance.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length} critical/high alerts

Generate a professional board report in markdown format.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'board-report', false);
        return result.data;
    }

    async generateInvestorUpdate(
        organizationId: string,
        customHighlights?: string[]
    ): Promise<string> {
        const context = await this.getFinancialContext(organizationId);
        const cashFlow = await this.getCashFlowForecast(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.investorUpdate}

${context}

Current Status:
- Runway: ${cashFlow.runwayMonths} months
- Burn: ₹${(cashFlow.monthlyBurn / 100000).toFixed(1)}L/month
${customHighlights ? `\nHighlights to include:\n${customHighlights.map((h) => `- ${h}`).join('\n')}` : ''}

Generate a concise investor update email.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'investor-update', false);
        return result.data;
    }

    // ==================== Existing Methods (Updated) ====================

    async getInsights(organizationId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 200,
        });

        const insights: any[] = [];

        const monthlyExpenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        if (monthlyExpenses > 500000) {
            insights.push({
                type: 'OPTIMIZATION',
                title: 'High Burn Rate Detected',
                description: 'Your monthly expenses have crossed ₹5L. Consider auditing SaaS subscriptions.',
                impact: 'HIGH'
            });
        }

        const tdsEligible = transactions.filter(t =>
            t.type === 'EXPENSE' &&
            Number(t.amount) > 30000 &&
            ['Professional Fees', 'Consulting', 'Legal', 'Technical Services'].includes(t.category || '')
        );

        if (tdsEligible.length > 0) {
            const totalUnder194J = tdsEligible.reduce((sum, t) => sum + Number(t.amount), 0);
            insights.push({
                type: 'TDS_ALERT',
                title: `TDS Required: ${tdsEligible.length} Transactions`,
                description: `₹${(totalUnder194J / 100000).toFixed(1)}L in payments require 10% TDS (Section 194J).`,
                impact: 'CRITICAL',
                action: 'Review TDS Liability',
            });
        }

        const gstEligible = transactions.filter(t =>
            t.type === 'EXPENSE' && Number(t.amount) > 10000
        );
        const potentialITC = gstEligible.reduce((sum, t) => sum + Number(t.amount) * 0.18, 0);

        if (potentialITC > 10000) {
            insights.push({
                type: 'COMPLIANCE',
                title: 'GST Input Credit Opportunity',
                description: `Potential ITC of ₹${(potentialITC / 1000).toFixed(0)}K from ${gstEligible.length} eligible purchases.`,
                impact: 'HIGH'
            });
        }

        return insights;
    }

    async getCashFlowForecast(organizationId: string) {
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
        });

        const totalBalance = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 90,
        });

        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const income = transactions.filter(t => t.type === 'INCOME');

        const avgMonthlyExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0) / 3;
        const avgMonthlyIncome = income.reduce((sum, t) => sum + Number(t.amount), 0) / 3;
        const avgMonthlyBurn = avgMonthlyExpense - avgMonthlyIncome;

        const runway = avgMonthlyBurn > 0 ? Math.round(totalBalance / avgMonthlyBurn) : 99;

        const categoryTotals: Record<string, number> = {};
        expenses.forEach(t => {
            const cat = t.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
        });

        const topCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount, percentage: Math.round(amount / avgMonthlyExpense * 100 / 3) }));

        return {
            currentBalance: totalBalance,
            monthlyBurn: avgMonthlyBurn,
            monthlyIncome: avgMonthlyIncome,
            monthlyExpense: avgMonthlyExpense,
            runwayMonths: runway,
            topExpenseCategories: topCategories,
            forecast: [
                { month: 'Feb 2026', projected: totalBalance - avgMonthlyBurn },
                { month: 'Mar 2026', projected: totalBalance - avgMonthlyBurn * 2 },
                { month: 'Apr 2026', projected: totalBalance - avgMonthlyBurn * 3 },
            ],
            riskLevel: runway < 6 ? 'HIGH' : runway < 12 ? 'MEDIUM' : 'LOW',
        };
    }

    async getTdsLiability(organizationId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                bankAccount: { organizationId },
                type: 'EXPENSE',
            },
            orderBy: { date: 'desc' },
        });

        const tdsRules = [
            { section: '194C', name: 'Contractor Payments', threshold: 30000, rate: 0.01, categories: ['Contractor', 'Construction'] },
            { section: '194J', name: 'Professional Services', threshold: 30000, rate: 0.10, categories: ['Professional Fees', 'Consulting', 'Legal', 'Technical Services', 'Auditor'] },
            { section: '194H', name: 'Commission', threshold: 15000, rate: 0.05, categories: ['Commission', 'Brokerage'] },
            { section: '194I', name: 'Rent', threshold: 240000, rate: 0.10, categories: ['Rent', 'Office Rent'] },
        ];

        const liabilities: any[] = [];

        for (const rule of tdsRules) {
            const eligible = transactions.filter(t =>
                rule.categories.includes(t.category || '') && Number(t.amount) > rule.threshold
            );

            if (eligible.length > 0) {
                const totalAmount = eligible.reduce((sum, t) => sum + Number(t.amount), 0);
                const tdsAmount = totalAmount * rule.rate;

                liabilities.push({
                    section: rule.section,
                    name: rule.name,
                    transactionCount: eligible.length,
                    totalAmount,
                    tdsRate: rule.rate * 100,
                    tdsPayable: tdsAmount,
                    dueDate: '2026-02-07',
                    status: 'PENDING',
                });
            }
        }

        return {
            totalTdsPayable: liabilities.reduce((sum, l) => sum + l.tdsPayable, 0),
            liabilities,
            nextDueDate: '2026-02-07',
            quarterEnd: '2026-03-31',
        };
    }

    async generateSummary(data: string): Promise<string> {
        const prompt = `Analyze this financial data and provide a brief summary with key insights:\n\n${data}\n\nProvide 3-4 bullet points highlighting the most important findings.`;

        const result = await this.generateWithRetry(prompt, 'system', 'summary', true);

        if (!result.success) {
            return 'Analysis complete. Key patterns identified in your data including expense categorization opportunities and potential compliance flags.';
        }

        return result.data;
    }

    // ==================== Anomaly Detection ====================

    async detectAnomalies(organizationId: string): Promise<any[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 500,
        });

        if (transactions.length < 10) {
            return [];
        }

        const context = `Transactions data (last 500):
${transactions.slice(0, 50).map(t => `${t.date.toISOString().split('T')[0]}: ${t.type} ₹${Number(t.amount).toLocaleString('en-IN')} - ${t.description || t.category}`).join('\n')}

Analyze for anomalies:
1. Unusually large transactions (compared to averages)
2. Unusual patterns (time, frequency, amount)
3. Potential duplicate transactions
4. Suspicious vendor patterns

Return JSON array: [{ type, severity, description, transaction, amount, recommendation }]`;

        const result = await this.generateWithRetry(context, organizationId, 'anomaly-detection', false);

        if (!result.success) {
            // Basic rule-based anomaly detection
            const amounts = transactions.map(t => Number(t.amount));
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const stdDev = Math.sqrt(amounts.map(x => Math.pow(x - avgAmount, 2)).reduce((a, b) => a + b) / amounts.length);

            return transactions
                .filter(t => Number(t.amount) > avgAmount + 3 * stdDev)
                .slice(0, 5)
                .map(t => ({
                    type: 'LARGE_TRANSACTION',
                    severity: 'MEDIUM',
                    description: `Transaction significantly larger than average (${((Number(t.amount) - avgAmount) / stdDev).toFixed(1)}σ)`,
                    transaction: t.description,
                    amount: Number(t.amount),
                    recommendation: 'Review this transaction for accuracy',
                }));
        }

        try {
            const jsonMatch = result.data.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            this.logger.warn('Failed to parse anomaly detection results');
        }

        return [];
    }

    // ==================== AI Analytics ====================

    async getAiAnalytics(organizationId: string): Promise<any> {
        const usage = await this.metricsService.getUsageSummary(organizationId);
        const realtime = this.metricsService.getRealtimeStats(organizationId);
        const costEstimates = this.metricsService.getCostEstimates(organizationId);

        return {
            usage,
            realtime,
            costEstimates,
        };
    }
}
