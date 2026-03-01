import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_CONFIG } from './ai-config';

export interface AiUsageRecord {
    id?: string;
    organizationId: string;
    userId?: string;
    endpoint: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    latencyMs: number;
    cached: boolean;
    success: boolean;
    errorMessage?: string;
    timestamp: Date;
}

export interface AiUsageSummary {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    avgLatencyMs: number;
    cacheHitRate: number;
    topEndpoints: { endpoint: string; count: number }[];
    usageByDay: { date: string; calls: number; tokens: number; cost: number }[];
}

@Injectable()
export class AiMetricsService {
    private readonly logger = new Logger(AiMetricsService.name);

    // In-memory storage for quick access (persisted to DB periodically)
    private usageRecords: AiUsageRecord[] = [];
    private readonly maxRecordsInMemory = 1000;

    constructor(private prisma: PrismaService) {
        // Flush to database every 5 minutes
        setInterval(() => this.flushToDatabase(), 300000);
    }

    /**
     * Record an AI API call
     */
    async recordUsage(record: Omit<AiUsageRecord, 'id' | 'timestamp'>): Promise<void> {
        const fullRecord: AiUsageRecord = {
            ...record,
            timestamp: new Date(),
        };

        this.usageRecords.push(fullRecord);

        // Log for monitoring
        this.logger.log(
            `AI Call: ${record.endpoint} | Model: ${record.model} | Tokens: ${record.totalTokens} | Cost: $${record.cost.toFixed(4)} | Latency: ${record.latencyMs}ms | Cached: ${record.cached}`
        );

        // Flush if memory limit reached
        if (this.usageRecords.length >= this.maxRecordsInMemory) {
            await this.flushToDatabase();
        }
    }

    /**
     * Calculate cost for token usage
     */
    calculateCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1000) * AI_CONFIG.costPerToken.input;
        const outputCost = (outputTokens / 1000) * AI_CONFIG.costPerToken.output;
        return inputCost + outputCost;
    }

    /**
     * Get usage summary for an organization
     */
    async getUsageSummary(
        organizationId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AiUsageSummary> {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const end = endDate || new Date();

        // Combine in-memory and database records
        const inMemoryRecords = this.usageRecords.filter(
            (r) =>
                r.organizationId === organizationId &&
                r.timestamp >= start &&
                r.timestamp <= end
        );

        // Query database for historical records
        let dbRecords: any[] = [];
        try {
            dbRecords = await this.prisma.aiUsage.findMany({
                where: {
                    organizationId,
                    timestamp: {
                        gte: start,
                        lte: end,
                    },
                },
                orderBy: { timestamp: 'desc' },
            });
        } catch {
            // Table might not exist yet, that's ok
            this.logger.warn('aiUsage table not found, using in-memory data only');
        }

        const allRecords = [...inMemoryRecords, ...dbRecords];

        if (allRecords.length === 0) {
            return {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalCost: 0,
                avgLatencyMs: 0,
                cacheHitRate: 0,
                topEndpoints: [],
                usageByDay: [],
            };
        }

        // Calculate metrics
        const successfulCalls = allRecords.filter((r) => r.success).length;
        const cachedCalls = allRecords.filter((r) => r.cached).length;
        const totalLatency = allRecords.reduce((sum, r) => sum + r.latencyMs, 0);

        // Aggregate by endpoint
        const endpointCounts: Record<string, number> = {};
        allRecords.forEach((r) => {
            endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
        });
        const topEndpoints = Object.entries(endpointCounts)
            .map(([endpoint, count]) => ({ endpoint, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Aggregate by day
        const dailyUsage: Record<string, { calls: number; tokens: number; cost: number }> = {};
        allRecords.forEach((r) => {
            const date = r.timestamp.toISOString().split('T')[0];
            if (!dailyUsage[date]) {
                dailyUsage[date] = { calls: 0, tokens: 0, cost: 0 };
            }
            dailyUsage[date].calls++;
            dailyUsage[date].tokens += r.totalTokens;
            dailyUsage[date].cost += r.cost;
        });
        const usageByDay = Object.entries(dailyUsage)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalCalls: allRecords.length,
            successfulCalls,
            failedCalls: allRecords.length - successfulCalls,
            totalTokens: allRecords.reduce((sum, r) => sum + r.totalTokens, 0),
            inputTokens: allRecords.reduce((sum, r) => sum + r.inputTokens, 0),
            outputTokens: allRecords.reduce((sum, r) => sum + r.outputTokens, 0),
            totalCost: allRecords.reduce((sum, r) => sum + r.cost, 0),
            avgLatencyMs: Math.round(totalLatency / allRecords.length),
            cacheHitRate: allRecords.length > 0 ? (cachedCalls / allRecords.length) * 100 : 0,
            topEndpoints,
            usageByDay,
        };
    }

    /**
     * Get real-time usage stats (last hour)
     */
    getRealtimeStats(organizationId: string): {
        callsLastHour: number;
        tokensLastHour: number;
        costLastHour: number;
        currentRpm: number;
    } {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

        const lastHourRecords = this.usageRecords.filter(
            (r) => r.organizationId === organizationId && r.timestamp >= oneHourAgo
        );

        const lastMinuteRecords = this.usageRecords.filter(
            (r) => r.organizationId === organizationId && r.timestamp >= oneMinuteAgo
        );

        return {
            callsLastHour: lastHourRecords.length,
            tokensLastHour: lastHourRecords.reduce((sum, r) => sum + r.totalTokens, 0),
            costLastHour: lastHourRecords.reduce((sum, r) => sum + r.cost, 0),
            currentRpm: lastMinuteRecords.length,
        };
    }

    /**
     * Check if rate limit is exceeded
     */
    isRateLimitExceeded(organizationId: string): boolean {
        const { currentRpm } = this.getRealtimeStats(organizationId);
        return currentRpm >= AI_CONFIG.rateLimit.maxRequestsPerMinute;
    }

    /**
     * Flush in-memory records to database
     */
    private async flushToDatabase(): Promise<void> {
        if (this.usageRecords.length === 0) return;

        const recordsToFlush = [...this.usageRecords];
        this.usageRecords = [];

        try {
            await this.prisma.aiUsage.createMany({
                data: recordsToFlush.map((r) => ({
                    organizationId: r.organizationId,
                    userId: r.userId,
                    endpoint: r.endpoint,
                    model: r.model,
                    inputTokens: r.inputTokens,
                    outputTokens: r.outputTokens,
                    totalTokens: r.totalTokens,
                    cost: r.cost,
                    latencyMs: r.latencyMs,
                    cached: r.cached,
                    success: r.success,
                    errorMessage: r.errorMessage,
                    timestamp: r.timestamp,
                })),
                skipDuplicates: true,
            });
            this.logger.log(`Flushed ${recordsToFlush.length} AI usage records to database`);
        } catch (error) {
            // If table doesn't exist, keep in memory
            this.logger.warn(`Failed to flush AI usage records: ${error.message}`);
            this.usageRecords = [...recordsToFlush, ...this.usageRecords].slice(
                0,
                this.maxRecordsInMemory
            );
        }
    }

    /**
     * Get cost estimates for budgeting
     */
    getCostEstimates(
        organizationId: string
    ): { dailyAverage: number; monthlyProjected: number; budgetRecommendation: string } {
        const { costLastHour } = this.getRealtimeStats(organizationId);
        const dailyAverage = costLastHour * 24;
        const monthlyProjected = dailyAverage * 30;

        let budgetRecommendation: string;
        if (monthlyProjected < 10) {
            budgetRecommendation = 'Your usage is very low. Free tier should suffice.';
        } else if (monthlyProjected < 50) {
            budgetRecommendation = 'Consider $50/month budget for AI features.';
        } else if (monthlyProjected < 200) {
            budgetRecommendation = 'Consider $200/month budget. Enable caching to reduce costs.';
        } else {
            budgetRecommendation =
                'High usage detected. Consider enterprise plan and optimize prompts.';
        }

        return { dailyAverage, monthlyProjected, budgetRecommendation };
    }
}
