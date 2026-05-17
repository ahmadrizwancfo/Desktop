import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
import { AI_CONFIG, AiResponse, CategorizationResult, ComplianceAlert, COMPLIANCE_DEADLINES } from './ai-config';
import { AiMetricsService } from './ai-metrics.service';
import { CfoStateService } from '../cfo-engine/cfo-state.service';
import { CfoBrainService } from '../cfo-engine/cfo-brain.service';
import { forwardRef, Inject } from '@nestjs/common';
import { INDIAN_CATEGORY_MAP } from '../statements/parsers/universal-parser.service';

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
        @Inject(forwardRef(() => CfoStateService))
        private stateService: CfoStateService,
        @Inject(forwardRef(() => CfoBrainService))
        private brainService: CfoBrainService,
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

    // ==================== Financial Context (SSOT) ====================
    // REMOVED Independent calculations to preserve SSOT.
    // AI now consumes data from CfoStateService strictly.

    // ==================== Chat API ====================

    async getChatResponse(organizationId: string, message: string, versionId?: string): Promise<string> {
        // Fetch Single Source of Truth state (Exactly once per request loop)
        const state = await this.stateService.getState(organizationId);
        
        const timestamp = state.generatedAt;
        const currentVersion = state.versionId;

        const ignoredCount = state.decisionMemory?.pendingDecisions || 0;
        const runway = state.summary.runwayMonths;
        const isCrisis = (runway <= 3 && !state.isInfiniteRunway) || ignoredCount >= 3;

        const stage = state.decisionEngine.decisions[0]?.startupStage || 'stabilize';
        
        const context = `
AUTHORITATIVE FINANCIAL DATA (DO NOT RECALCULATE):
- Version Identifier: ${currentVersion}
- Observation Moment: ${timestamp}
${versionId && versionId !== currentVersion ? `- User View Sync: Dashboard was locked to ${versionId}. AI is now synchronized.` : ''}

PRIMARY DECISION:
- Urgency: ${state.decisionEngine.urgency.toUpperCase()}
- Summary: ${state.decisionEngine.summary}
- Confidence Adjustments Needed: ${state.decisionEngine.confidenceAdjusted ? 'YES (Incomplete Data)' : 'NO'}

DECISION ENGINE V3.5 (LOGICAL OUTCOMES):
${state.decisionEngine.decisions.slice(0, 1).map(d => `
  - KEY: ${d.decisionKey}
  - STAGE: ${d.startupStage.toUpperCase()}
  - RATIONALE: ${d.rationale}
  - TRADE-OFF GAIN: ${d.tradeOffs.gain}
  - TRADE-OFF LOSS: ${d.tradeOffs.loss}
  - REJECTED OPTION: ${d.alternative.option}
  - WHY REJECTED: ${d.alternative.whyRejected}
  - LOGICAL CONSEQUENCE: ${d.alternative.consequence}
  - RISK TIMEFRAME: ${d.alternative.timeframe}
  - OUTCOME CONFIDENCE: ${d.alternative.confidence.toUpperCase()}
`).join('\n')}

BEHAVIORAL AUDIT:
- Pending Decisions: ${state.decisionMemory.pendingDecisions}
- Ignore Streak: ${state.decisionMemory.ignoredForDays ? state.decisionMemory.ignoredForDays + ' days' : 'None'}
- System Nudge: ${state.decisionMemory.nudge || 'No immediate pressure.'}
- Crisis Mode: ${isCrisis ? 'ACTIVE' : 'INACTIVE'}

KEY PARAMETERS:
- Cash in Bank: ₹${(state.summary.cashInBank / 100000).toFixed(2)}L
- Net Burn Rate: ₹${(state.summary.netBurn / 100000).toFixed(2)}L
- Current Runway: ${state.isInfiniteRunway ? 'Infinite' : state.summary.runwayMonths.toFixed(1) + ' months'}
- Death Clock: ${state.deathClock.statement}
`;
 
        const systemPrompt = `You are an AI CFO co-founder. You implement the "Outcome Clarity Layer" (v3.5).
Your goal is to force awareness of logical consequences. You do not force decisions, you force clarity.

CRITICAL SSOT RULE: You MUST use ONLY the numbers provided in AUTHORITATIVE FINANCIAL DATA above.
Do NOT invent, estimate, or recalculate any financial figures. If data is missing, say so explicitly.

TONE BY STAGE:
- ${stage === 'survival' ? 'SURVIVAL: Be direct, time-bound, and factual. Inaction has immediate mathematical consequences.' : ''}
- ${stage === 'stabilize' ? 'STABILIZE: Be analytical and structured. Focus on unit economics and capital efficiency.' : ''}
- ${stage === 'growth' ? 'GROWTH: Be strategic and opportunity-focused. Highlight market momentum and scaling risks.' : ''}

REQUIRED RESPONSE STRUCTURE (Include ALL of these in every answer):
1. Recommendation: (e.g. "Strong recommendation: Cut ₹2L/month")
2. Reasoning: (Why this is the right move, citing exact data from the AUTHORITATIVE section)
3. Confidence: (High/Medium/Low — based on data completeness)
4. Impact on Runway: (e.g. "+2.1 months" or "-15 days" — calculated from provided burn/cash)
5. Trade-off: (Explain "You gain: [Gain]" vs "You lose: [Loss]")
6. Suggested Action: (One clear, executable next step)
7. Alternative considered: (Mention REJECTED OPTION and WHY REJECTED)
8. If you continue this path: (Explicitly state LOGICAL CONSEQUENCE and RISK TIMEFRAME)

RULES:
- Never hide the downside of the alternative.
- Use factual, logical phrasing. No hyper-emotional fear-mongering.
- Always conclude with: "Final decision is yours. This is based on available data."
- Reference specific numbers from the authoritative data to build trust.
`;

        const prompt = `${systemPrompt}

${context}

USER QUESTION: ${message}

Respond naturally as a world-class CFO co-founder. Priority: Resolve the primary decision first.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'chat', false);

        if (!result.success) {
            return this.getFallbackResponse(state);
        }

        return result.data;
    }

    private getFallbackResponse(state: any): string {
        return `I'm analyzing your authoritative financials. Current balance: ₹${(state.summary.cashInBank / 100000).toFixed(1)}L, Runway: ${state.isInfiniteRunway ? 'Infinite' : state.summary.runwayMonths + ' months'}. How can I help you interpret this?`;
    }

    // ==================== Expense Categorization ====================

    async categorizeTransaction(
        organizationId: string,
        description: string,
        amount: number,
        vendor?: string
    ): Promise<CategorizationResult> {
        const validCategories = Object.keys(INDIAN_CATEGORY_MAP).join(', ');

        const prompt = `${AI_CONFIG.systemPrompts.expenseCategorization}

STRICT CATEGORY LIST (you MUST use one of these): ${validCategories}
If none match perfectly, use "Others" and provide a suggestedNewCategory field.

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
        const state = await this.stateService.getState(organizationId);
        const today = new Date();

        const prompt = `${AI_CONFIG.systemPrompts.complianceAnalysis}

Today's date: ${today.toLocaleDateString('en-IN')}

METRICS:
- Cash: ₹${state.summary.cashInBank}
- Expenses: ₹${state.summary.monthlyExpenses}
- Net Burn: ₹${state.summary.netBurn}

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
        const state = await this.stateService.getState(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.financialAnalysis}

AUTHORITATIVE METRICS:
- Balance: ₹${(state.summary.cashInBank / 100000).toFixed(2)}L
- Monthly Burn: ₹${(state.summary.netBurn / 100000).toFixed(2)}L
- Monthly Income: ₹${(state.summary.monthlyRevenue / 100000).toFixed(2)}L
- Current Runway: ${state.summary.runwayMonths} months

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
            return this.getDefaultPredictions(state.summary, months);
        }

        try {
            const jsonMatch = result.data.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch {
            this.logger.warn('Failed to parse predictions');
        }

        return this.getDefaultPredictions(state.summary, months);
    }

    private getDefaultPredictions(summary: any, months: number): any {
        const scenarios = ['optimistic', 'realistic', 'pessimistic'];
        const multipliers = { optimistic: 0.8, realistic: 1.0, pessimistic: 1.2 };
        const revenueGrowth = { optimistic: 1.1, realistic: 1.0, pessimistic: 0.9 };

        return {
            scenarios: scenarios.map((name) => ({
                name,
                data: Array.from({ length: months }, (_, i) => {
                    const month = new Date();
                    month.setMonth(month.getMonth() + i + 1);
                    const burn = summary.netBurn * multipliers[name as keyof typeof multipliers];
                    const revenue = summary.monthlyRevenue * Math.pow(revenueGrowth[name as keyof typeof revenueGrowth], i + 1);
                    const balance = Math.max(0, summary.cashInBank - (burn - revenue) * (i + 1));

                    return {
                        month: month.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                        balance,
                        revenue,
                        expenses: summary.monthlyExpenses * multipliers[name as keyof typeof multipliers],
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
        const state = await this.stateService.getState(organizationId);
        const compliance = await this.getComplianceAlerts(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.boardReport}

${JSON.stringify(state)}

Additional metrics:
- Risk Level: ${state.primaryRisk.severity}
- Pending Compliance: ${compliance.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length} critical/high alerts

Generate a professional board report in markdown format.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'board-report', false);
        return result.data;
    }

    async generateInvestorUpdate(
        organizationId: string,
        customHighlights?: string[]
    ): Promise<string> {
        const state = await this.stateService.getState(organizationId);

        const prompt = `${AI_CONFIG.systemPrompts.investorUpdate}

${JSON.stringify(state)}

Current Status:
- Runway: ${state.summary.runwayMonths} months
- Burn: ₹${(state.summary.netBurn / 100000).toFixed(1)}L/month
${customHighlights ? `\nHighlights to include:\n${customHighlights.map((h) => `- ${h}`).join('\n')}` : ''}

Generate a concise investor update email.`;

        const result = await this.generateWithRetry(prompt, organizationId, 'investor-update', false);
        return result.data;
    }

    // ==================== Existing Methods ====================

    async getCashFlowForecast(organizationId: string) {
        const state = await this.stateService.getState(organizationId);
        return {
            currentBalance: state.summary.cashInBank,
            monthlyBurn: state.summary.netBurn,
            monthlyRevenue: state.summary.monthlyRevenue,
            runwayMonths: state.summary.runwayMonths,
            riskLevel: state.companyStatus === 'stable' ? 'LOW' : state.companyStatus === 'at_risk' ? 'MEDIUM' : 'HIGH',
            forecast: state.cashForecast.next30Days
        };
    }

    async getInsights(organizationId: string) {
        const state = await this.stateService.getState(organizationId);
        const insights: any[] = [];

        const monthlyExpenses = state.summary.monthlyExpenses;

        if (monthlyExpenses > 500000) {
            insights.push({
                type: 'OPTIMIZATION',
                title: 'High Burn Rate Detected',
                description: 'Your monthly expenses have crossed ₹5L. Consider auditing SaaS subscriptions.',
                impact: 'HIGH'
            });
        }

        // Logic simplified to use state
        return insights;
    }

    async getTdsLiability(organizationId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId }, type: 'EXPENSE' },
        });

        const tdsRules = [
            { section: '194J', name: 'Professional Fees', rate: 0.10, threshold: 30000, categories: ['Professional Fees', 'Legal & Compliance'] },
            { section: '194C', name: 'Contractor Payments', rate: 0.02, threshold: 30000, categories: ['Contractor Payments'] },
            { section: '194I', name: 'Rent', rate: 0.10, threshold: 240000, categories: ['Rent'] },
            { section: '194H', name: 'Commission', rate: 0.05, threshold: 15000, categories: ['Commission & Brokerage'] },
            { section: '192', name: 'Salary', rate: 0.05, threshold: 250000, categories: ['Salary & Wages'] }
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

    // ==================== Interpretation Layer (v2.2) ====================

    async interpretFinancialStateV3(organizationId: string, contextSnippet: string, insightAccuracy: number = 100): Promise<{
        narrative: string;
        signal: string;
        attention: string;
        action: string;
        momentum: string;
    }> {
        const toneAdvice = insightAccuracy < 60 
            ? "ROLE: Calm, Intelligent CFO Partner. Tone: Precise/Supportive. Focus on guiding the founder to resolve data modeling gaps." 
            : "ROLE: Strategic Mastermind CFO Partner. Tone: Confident/Insightful. Focus on high-leverage growth and stability.";

        const prompt = `You are a "Strategic CFO Partner". 
        Generate a "Today's CFO Brief" in a structured JSON format.
        
        CRITICAL RULES:
        1. Be concise. One item per field.
        2. Signal: A data-driven fact about today vs yesterday/last week (e.g., "Burn increased 4% vs yesterday").
        3. Attention: The most urgent unresolved issue (e.g., "₹15,400 in suspense").
        4. Action: The single highest priority action (e.g., "Classify transactions to restore accuracy").
        5. Momentum: A positive trend (e.g., "Runway stabilized for 3 days").
        6. Narrative: A 1-sentence strategic interpretation.

        CONTEXT:
        ${contextSnippet}
        
        ${toneAdvice}

        RESPONSE FORMAT (JSON ONLY):
        {
          "narrative": "...",
          "signal": "...",
          "attention": "...",
          "action": "...",
          "momentum": "..."
        }`;

        const result = await this.generateWithRetry(prompt, organizationId, 'daily-brief-v3', true);
        
        if (result.success) {
            try {
                // Clean markdown if present
                const cleaned = result.data.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleaned);
            } catch (e) {
                this.logger.error(`Failed to parse V3 AI response: ${result.data}`);
            }
        }

        return {
            narrative: "Financial modeling active. Reviewing daily signals...",
            signal: "Burn is within expected variance.",
            attention: "Transactions in suspense need classification.",
            action: "Calibrate Accuracy Score.",
            momentum: "Accuracy holding at 85%."
        };
    }

    async generateWeeklyNarrative(organizationId: string, context: string): Promise<{
        improved: string;
        worsened: string;
        risk: string;
        priority: string;
    }> {
        const prompt = `You are a "Strategic CFO Partner". Generate a "Weekly CFO Report Card" in JSON format.
        
        STRUCTURE:
        - improved: What improved this week (e.g. "Runway +0.5 months")
        - worsened: What worsened (e.g. "Burn +12% due to SaaS")
        - risk: Biggest financial risk (e.g. "Liquidity gap in 4 months")
        - priority: Single highest priority for next week
        
        CONTEXT:
        ${context}
        
        RESPONSE FORMAT (JSON ONLY):
        {
          "improved": "...",
          "worsened": "...",
          "risk": "...",
          "priority": "..."
        }`;

        const result = await this.generateWithRetry(prompt, organizationId, 'weekly-report-v3', false);
        if (result.success) {
            try {
                const cleaned = result.data.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleaned);
            } catch (e) {}
        }

        return {
            improved: "Runway stabilized.",
            worsened: "Expense variance detected.",
            risk: "Incomplete data modeling.",
            priority: "Classification cleanup."
        };
    }

    /**
     * processCfoChat: The primary logic for the Conversational CFO OS.
     * Persona: Blunt, practical, experienced Indian CFO.
     * Returns strict JSON schema for frontend structured rendering.
     */
    async processCfoChat(query: string, context: any, tools: any): Promise<any> {
        const prompt = `
You are FounderCFO — an experienced, blunt, practical Indian CFO who has seen 50+ startups burn through cash.

PERSONALITY:
- You are the co-founder's trusted financial partner. Not a consultant, a partner.
- Speak like an Indian CFO would: direct, data-driven, empathetic but never sugarcoating.
- Use "bhai" or "yaar" SPARINGLY (max once per response, and only when it adds warmth to hard advice).
- Your advice should feel like it comes from someone who's been through 3 recessions and 2 failed startups.
- If data quality is low, say so: "Look, the data isn't clean enough for me to give you a confident answer."

CRITICAL RULES:
1. NEVER guess or hallucinate numbers. Use ONLY the provided context.
2. If you don't have data to answer, say so clearly. Don't fabricate.
3. Always think in Indian Rupees (₹), Lakhs (L), and Crores (Cr).
4. Consider Indian tax context: TDS, GST, Advance Tax deadlines.
5. Every answer must be actionable — founders don't have time for theory.

CURRENT FINANCIAL CONTEXT (SSOT — DO NOT DEVIATE):
- Cash in Bank: ₹${context.cash}
- Monthly Burn: ₹${context.burn}
- Runway: ${context.runway} months
- Execution Completion Rate: ${context.completionRate}%
- Primary Focus: ${context.oneThing}

AVAILABLE DATA:
- Runway Analysis: ${JSON.stringify(tools.get_runway())}
- Expense Breakdown: ${JSON.stringify(tools.get_expenses())}
- Decisions Status: ${JSON.stringify(tools.get_decisions())}

SIMULATION RULES:
- Hiring: ₹1.5L-3L/month per senior engineer (India).
- new_runway = current_cash / (current_burn + added_burn)
- Always show BEFORE vs AFTER comparison.

RESPONSE FORMAT — MANDATORY STRICT JSON (no markdown, no explanation outside JSON):
{
  "shortAnswer": "One crisp sentence — the headline answer.",
  "reasoning": "2-3 sentences explaining WHY, citing specific numbers from the context above.",
  "confidence": 85,
  "runwayImpact": "+2.1 months or -1.5 months or No change",
  "suggestedAction": "One clear, executable next step the founder can do TODAY.",
  "tradeoffs": "What you gain vs what you lose. Be honest about both sides."
}

USER QUERY: "${query}"

Respond with ONLY the JSON object. No markdown fences, no explanations outside the JSON.`;

        try {
            const result = await this.model!.generateContent(prompt);
            const text = result.response.text();
            // Extract JSON robustly
            const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // Validate required fields exist
                if (parsed.shortAnswer && parsed.reasoning) {
                    return parsed;
                }
            }
            // If JSON parsing fails, wrap raw text
            return {
                shortAnswer: text.substring(0, 200),
                reasoning: 'AI returned an unstructured response. Displaying raw insight.',
                confidence: 50,
                runwayImpact: 'Unknown',
                suggestedAction: 'Ask a more specific question for structured analysis.',
                tradeoffs: 'N/A',
            };
        } catch (error) {
            this.logger.error(`CFO Chat Error: ${error.message}`);
            return {
                shortAnswer: 'I encountered a processing error. Please try again.',
                reasoning: 'The AI engine temporarily failed to process your request.',
                confidence: 0,
                runwayImpact: 'Unknown',
                suggestedAction: 'Retry your question in a moment.',
                tradeoffs: 'N/A',
            };
        }
    }

    /**
     * extractDecisionFromChat: Parses chat intent into a structured decision.
     */
    async extractDecisionFromChat(insight: string, userTitle?: string): Promise<any> {
        const prompt = `
        You are a financial logic extractor. 
        Given the following chat insight/intent, extract a structured decision for the execution engine.
        
        TEXT: "${insight}"
        USER SUGGESTED TITLE: "${userTitle || 'None'}"

        OUTPUT JSON:
        {
            "key": "UPPERCASE_KEY_LIKE_BURN_REDUCTION",
            "title": "Clear, professional decision title",
            "impact": "High|Medium|Low"
        }
        `;

        try {
            const result = await this.model!.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            return { key: 'GENERIC_ACTION', title: userTitle || 'Strategic Action', impact: 'Medium' };
        } catch (error) {
            return { key: 'GENERIC_ACTION', title: userTitle || 'Strategic Action', impact: 'Medium' };
        }
    }
}
