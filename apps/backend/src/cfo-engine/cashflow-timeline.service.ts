import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LiveStateService } from './live-state.service';
import { FinancialMath } from '../common/math/financial-math.util';

export const PROJECTION_CACHE_VERSION = 'v1';

export interface DailyCashPosition {
    date: string; // YYYY-MM-DD
    formattedDate: string; // e.g. "14 Nov 2026"
    openingBalance: string;
    inflow: string;
    outflow: string;
    closingBalance: string;
    riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface CashflowProjectionResult {
    organizationId: string;
    zeroCashDate: string | null; // e.g. "2026-11-14"
    formattedZeroCashDate: string | null; // e.g. "14 Nov 2026"
    minimumCashPoint: {
        amount: string;
        date: string;
        formattedDate: string;
    };
    riskWindowStart: string | null;
    confidenceScore: number; // 0.0 to 1.0 Trust System
    dailyPositions: DailyCashPosition[];
    computedAt: string;
}

export interface ScenarioOverrideParams {
    headcountDelta?: number;
    marketingSpendDelta?: number;
    newContractInflow?: number;
    avgSalaryPerHead?: number;
}

@Injectable()
export class CashflowTimelineService {
    private readonly logger = new Logger(CashflowTimelineService.name);
    private redisClient: Redis | null = null;
    private isRedisConnected = false;
    private debounceTimers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly liveStateService: LiveStateService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initRedis();
    }

    private async initRedis() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD');

        try {
            this.redisClient = new Redis({
                host,
                port,
                password,
                lazyConnect: true,
                maxRetriesPerRequest: 2,
            });
            this.redisClient.on('connect', () => { this.isRedisConnected = true; });
            this.redisClient.on('error', () => { this.isRedisConnected = false; });
            await this.redisClient.connect();
        } catch (e: any) {
            this.isRedisConnected = false;
        }
    }

    private getRedisKey(organizationId: string): string {
        return `org:${organizationId}:cashflow_projection:${PROJECTION_CACHE_VERSION}`;
    }

    /**
     * Debounces multiple event-triggered recomputations within a 3.5-second batch window.
     * Prevents high-frequency database thrashing during bulk imports / syncs.
     */
    scheduleProjectionRecompute(organizationId: string) {
        if (this.debounceTimers.has(organizationId)) {
            clearTimeout(this.debounceTimers.get(organizationId)!);
        }

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(organizationId);
            this.logger.log(`⚡ Debounced 3.5s Recompute executing for Org ${organizationId}`);
            await this.generate90DayProjection(organizationId);
        }, 3500);

        this.debounceTimers.set(organizationId, timer);
    }

    /**
     * Core 90-Day Cashflow Projection Engine.
     */
    async generate90DayProjection(organizationId: string): Promise<CashflowProjectionResult> {
        const startTime = Date.now();

        // 1. Fetch Current Cash Balance & Monthly Burn from LiveState
        const liveState = await this.liveStateService.getState(organizationId);
        let currentCash = FinancialMath.toDecimal(liveState.cashBalance);
        const monthlyBurnDecimal = FinancialMath.toDecimal(liveState.monthlyBurn);
        
        // Base daily operational burn = monthlyBurn / 30
        const dailyBaseBurn = monthlyBurnDecimal.dividedBy(30);

        // 2. Query Pending Invoices (Inflows) with +7 Days Expected Delay Heuristic
        const invoices = await this.prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: ['SENT', 'OVERDUE'] },
                deletedAt: null,
            },
            select: { amount: true, dueDate: true },
        });

        // 3. Query Pending Tax Liabilities (Outflows)
        const pendingTaxes = await this.prisma.statutoryLiability.findMany({
            where: { organizationId, status: 'PENDING' },
            select: { amount: true, dueDate: true },
        });

        const dailyPositions: DailyCashPosition[] = [];
        let zeroCashDate: string | null = null;
        let formattedZeroCashDate: string | null = null;
        let riskWindowStart: string | null = null;

        let minCashAmount = currentCash;
        let minCashDateStr = new Date().toISOString().split('T')[0];

        const startDate = new Date();

        // 4. Compute 90 Daily Positions Loop using FinancialMath
        for (let day = 0; day < 90; day++) {
            const targetDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
            const dateStr = targetDate.toISOString().split('T')[0];
            const formattedDate = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

            const openingBalanceStr = FinancialMath.toString(currentCash);

            // Inflow calculation for targetDate (Invoice dueDate + 7 days heuristic delay)
            let dailyInflow = FinancialMath.toDecimal(0);
            for (const inv of invoices) {
                const expectedPaymentDate = new Date(inv.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (expectedPaymentDate.toISOString().split('T')[0] === dateStr) {
                    dailyInflow = dailyInflow.plus(inv.amount);
                }
            }

            // Outflow calculation for targetDate
            let dailyOutflow = dailyBaseBurn;
            for (const tax of pendingTaxes) {
                if (tax.dueDate && tax.dueDate.toISOString().split('T')[0] === dateStr) {
                    dailyOutflow = dailyOutflow.plus(tax.amount);
                }
            }

            const closingCash = currentCash.plus(dailyInflow).minus(dailyOutflow);
            const closingBalanceStr = FinancialMath.toString(closingCash);

            let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
            if (closingCash.isNegative() || closingCash.isZero() || closingCash.lessThan(monthlyBurnDecimal.times(0.25))) {
                riskLevel = 'CRITICAL';
            } else if (closingCash.lessThanOrEqualTo(monthlyBurnDecimal.times(1.5))) {
                riskLevel = 'WARNING';
            }

            if ((closingCash.isNegative() || closingCash.isZero()) && !zeroCashDate) {
                zeroCashDate = dateStr;
                formattedZeroCashDate = formattedDate;
            }

            if (closingCash.lessThan(minCashAmount)) {
                minCashAmount = closingCash;
                minCashDateStr = dateStr;
            }

            if (riskLevel !== 'SAFE' && !riskWindowStart) {
                riskWindowStart = dateStr;
            }

            dailyPositions.push({
                date: dateStr,
                formattedDate,
                openingBalance: openingBalanceStr,
                inflow: FinancialMath.toString(dailyInflow),
                outflow: FinancialMath.toString(dailyOutflow),
                closingBalance: closingBalanceStr,
                riskLevel,
            });

            currentCash = closingCash;
        }

        const minCashFormatted = new Date(minCashDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        // Calculate Confidence Score (Trust System)
        let confidenceScore = 0.95;
        if (invoices.length === 0 && pendingTaxes.length === 0) confidenceScore -= 0.10;
        if (parseFloat(liveState.cashBalance) === 0) confidenceScore -= 0.15;
        confidenceScore = Math.max(0.40, Math.min(0.99, Number(confidenceScore.toFixed(2))));

        const result: CashflowProjectionResult = {
            organizationId,
            zeroCashDate,
            formattedZeroCashDate,
            minimumCashPoint: {
                amount: FinancialMath.toString(minCashAmount),
                date: minCashDateStr,
                formattedDate: minCashFormatted,
            },
            riskWindowStart,
            confidenceScore,
            dailyPositions,
            computedAt: new Date().toISOString(),
        };

        // Cache in Versioned Redis Key
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.set(this.getRedisKey(organizationId), JSON.stringify(result), 'EX', 604800);
            } catch (e: any) { /* ignore */ }
        }

        // Observability & Structured Logging
        const durationMs = Date.now() - startTime;
        this.logger.log(JSON.stringify({
            event: 'cashflow.compute',
            orgId: organizationId,
            durationMs,
            inflowCount: invoices.length,
            outflowCount: pendingTaxes.length,
            confidenceScore,
            zeroCashDate: zeroCashDate || 'NONE',
        }));

        this.eventEmitter.emit('cashflow.updated', {
            organizationId,
            projection: result,
        });

        return result;
    }

    /**
     * Isolated Simulation Scenario Engine (CRITICAL):
     * Operates purely on cloned data in memory.
     * MUST NOT write to Redis, MUST NOT emit events, MUST NOT mutate base projection.
     */
    generate90DayProjectionScenario(params: {
        baseProjection: CashflowProjectionResult;
        overrides: ScenarioOverrideParams;
    }): {
        simulatedProjection: CashflowProjectionResult;
        daysShift: number;
        diffSummary: string;
    } {
        const { baseProjection, overrides } = params;
        const { headcountDelta = 0, marketingSpendDelta = 0, newContractInflow = 0, avgSalaryPerHead = 100000 } = overrides;

        // Deep Clone Base Projection Data to guarantee zero mutation
        const clonedPositions: DailyCashPosition[] = JSON.parse(JSON.stringify(baseProjection.dailyPositions));

        // Calculate Daily Override Deltas
        const addedMonthlySalary = FinancialMath.toDecimal(headcountDelta).times(avgSalaryPerHead);
        const addedMonthlyMarketing = FinancialMath.toDecimal(marketingSpendDelta);
        const addedMonthlyInflow = FinancialMath.toDecimal(newContractInflow);

        const netMonthlyExpenseDelta = addedMonthlySalary.plus(addedMonthlyMarketing);
        const dailyExpenseDelta = netMonthlyExpenseDelta.dividedBy(30);
        const dailyInflowDelta = addedMonthlyInflow.dividedBy(30);

        let currentCash = FinancialMath.toDecimal(clonedPositions[0]?.openingBalance || '0.00');
        let simulatedZeroCashDate: string | null = null;
        let formattedSimulatedZeroCashDate: string | null = null;
        let minCashAmount = currentCash;
        let minCashDateStr = clonedPositions[0]?.date || new Date().toISOString().split('T')[0];

        const simulatedPositions: DailyCashPosition[] = [];

        for (const pos of clonedPositions) {
            const openingStr = FinancialMath.toString(currentCash);
            const baseInflow = FinancialMath.toDecimal(pos.inflow);
            const baseOutflow = FinancialMath.toDecimal(pos.outflow);

            const simInflow = baseInflow.plus(dailyInflowDelta);
            const simOutflow = baseOutflow.plus(dailyExpenseDelta);

            const simClosing = currentCash.plus(simInflow).minus(simOutflow);

            let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
            if (simClosing.isNegative() || simClosing.isZero()) {
                riskLevel = 'CRITICAL';
            }

            if ((simClosing.isNegative() || simClosing.isZero()) && !simulatedZeroCashDate) {
                simulatedZeroCashDate = pos.date;
                formattedSimulatedZeroCashDate = pos.formattedDate;
            }

            if (simClosing.lessThan(minCashAmount)) {
                minCashAmount = simClosing;
                minCashDateStr = pos.date;
            }

            simulatedPositions.push({
                ...pos,
                openingBalance: openingStr,
                inflow: FinancialMath.toString(simInflow),
                outflow: FinancialMath.toString(simOutflow),
                closingBalance: FinancialMath.toString(simClosing),
                riskLevel,
            });

            currentCash = simClosing;
        }

        const minCashFormatted = new Date(minCashDateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        const baseTime = baseProjection.zeroCashDate ? new Date(baseProjection.zeroCashDate).getTime() : Date.now() + 90 * 24 * 60 * 60 * 1000;
        const simTime = simulatedZeroCashDate ? new Date(simulatedZeroCashDate).getTime() : Date.now() + 90 * 24 * 60 * 60 * 1000;
        const daysShift = Math.round((simTime - baseTime) / (24 * 60 * 60 * 1000));

        let diffSummary = '';
        if (daysShift < 0) {
            diffSummary = `Scenario accelerates zero cash date by ${Math.abs(daysShift)} days to ${formattedSimulatedZeroCashDate || 'within 90 days'}.`;
        } else if (daysShift > 0) {
            diffSummary = `Scenario extends zero cash date by ${daysShift} days to ${formattedSimulatedZeroCashDate || 'beyond 90 days'}.`;
        } else {
            diffSummary = `Scenario does not shift zero cash date.`;
        }

        const simulatedProjection: CashflowProjectionResult = {
            organizationId: baseProjection.organizationId,
            zeroCashDate: simulatedZeroCashDate,
            formattedZeroCashDate: formattedSimulatedZeroCashDate,
            minimumCashPoint: {
                amount: FinancialMath.toString(minCashAmount),
                date: minCashDateStr,
                formattedDate: minCashFormatted,
            },
            riskWindowStart: baseProjection.riskWindowStart,
            confidenceScore: baseProjection.confidenceScore,
            dailyPositions: simulatedPositions,
            computedAt: new Date().toISOString(),
        };

        return {
            simulatedProjection,
            daysShift,
            diffSummary,
        };
    }

    /**
     * Retrieves versioned Redis cashflow projection or calculates on cache miss.
     */
    async getProjection(organizationId: string): Promise<CashflowProjectionResult> {
        if (this.isRedisConnected && this.redisClient) {
            try {
                const cached = await this.redisClient.get(this.getRedisKey(organizationId));
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (e: any) { /* ignore */ }
        }

        return await this.generate90DayProjection(organizationId);
    }

    @Cron('0 3 * * *')
    async handleDailyCashflowPrecomputation() {
        this.logger.log('--- Starting Daily 3:00 AM Cashflow Timeline Precomputation Job ---');
        try {
            const orgs = await this.prisma.organization.findMany({ select: { id: true } });
            for (const org of orgs) {
                await this.generate90DayProjection(org.id);
            }
        } catch (err: any) {
            this.logger.error(`Daily cashflow precomputation error: ${err.message}`);
        }
    }
}
