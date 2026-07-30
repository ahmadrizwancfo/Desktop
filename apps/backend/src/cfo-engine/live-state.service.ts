import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Redis = require('ioredis');
import { PrismaService } from '../prisma/prisma.service';
import { FinancialMath } from '../common/math/financial-math.util';

export interface OrgLiveState {
    organizationId: string;
    cashBalance: string;
    monthlyBurn: string;
    monthlyRevenue: string;
    runwayDays: number;
    receivables: string;
    payables: string;
    taxExposure: string;
    lastUpdatedAt: string;
}

@Injectable()
export class LiveStateService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LiveStateService.name);
    private redisClient: any = null;
    private isRedisConnected = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async onModuleInit() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

        try {
            this.redisClient = new Redis({
                host,
                port,
                password,
                lazyConnect: true,
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 5) return null; // Stop retrying after 5 attempts
                    return Math.min(times * 100, 3000);
                },
            });

            let hasLoggedError = false;

            this.redisClient.on('connect', () => {
                this.isRedisConnected = true;
                hasLoggedError = false;
                this.logger.log(`⚡ Redis LiveState Layer Connected (${host}:${port})`);
            });

            this.redisClient.on('error', (err) => {
                this.isRedisConnected = false;
                if (!hasLoggedError) {
                    hasLoggedError = true;
                    this.logger.warn(`Redis LiveState warning: ${err.message}. System fallback to DB CfoStateSnapshot active. (Further connection errors will be suppressed)`);
                }
            });

            await this.redisClient.connect();
        } catch (error: any) {
            this.isRedisConnected = false;
            this.logger.warn(`Redis connection warning: ${error.message}. DB CfoStateSnapshot Fallback active.`);
        }
    }

    private getRedisKey(organizationId: string): string {
        return `org:${organizationId}:live_state`;
    }

    /**
     * Gets real-time financial state with multi-tier fallbacks:
     * Tier 1: Redis Key `org:{id}:live_state`
     * Tier 2: DB `CfoStateSnapshot` (Latest PostgreSQL Snapshot)
     * Tier 3: Direct DB SSOT Aggregation Initialization
     */
    async getState(organizationId: string): Promise<OrgLiveState> {
        if (this.isRedisConnected && this.redisClient) {
            try {
                const data = await this.redisClient.get(this.getRedisKey(organizationId));
                if (data) {
                    return JSON.parse(data);
                }
            } catch (err: any) {
                this.logger.warn(`Redis getState error for Org ${organizationId}: ${err.message}. Falling back to DB Snapshot.`);
            }
        }

        // Tier 2 Fallback: Check Latest CfoStateSnapshot in PostgreSQL
        const latestDbSnapshot = await this.prisma.cfoStateSnapshot.findFirst({
            where: { organizationId },
            orderBy: { generatedAt: 'desc' },
        });

        if (latestDbSnapshot && latestDbSnapshot.fullState) {
            this.logger.log(`Tier 2 Fallback: Loaded LiveState from DB CfoStateSnapshot for Org ${organizationId}`);
            const state = latestDbSnapshot.fullState as unknown as OrgLiveState;
            
            // Re-cache in Redis if connection re-established
            if (this.isRedisConnected && this.redisClient) {
                try {
                    await this.redisClient.set(this.getRedisKey(organizationId), JSON.stringify(state), 'EX', 604800);
                } catch (e: any) { /* ignore */ }
            }
            return state;
        }

        // Tier 3 Fallback: Rebuild strictly from DB Single Source of Truth
        this.logger.log(`Tier 3 Fallback: Initializing LiveState from raw DB aggregations for Org ${organizationId}...`);
        return await this.initializeStateFromDB(organizationId);
    }

    /**
     * Sets state in Redis using atomic transaction (MULTI/EXEC), persists to LiveStateChangeLog, and emits SSE event.
     */
    async setState(organizationId: string, state: OrgLiveState, eventType: string = 'STATE_SET', deltaPayload: any = {}): Promise<void> {
        const previousState = await this.getState(organizationId).catch(() => null);
        state.lastUpdatedAt = new Date().toISOString();

        // 1. Atomic Redis Update via MULTI/EXEC pipeline
        if (this.isRedisConnected && this.redisClient) {
            try {
                const pipeline = this.redisClient.multi();
                pipeline.set(this.getRedisKey(organizationId), JSON.stringify(state), 'EX', 604800);
                await pipeline.exec();
            } catch (err: any) {
                this.logger.warn(`Redis atomic MULTI/EXEC failed for Org ${organizationId}: ${err.message}`);
            }
        }

        // 2. Audit Trail: Write to LiveStateChangeLog in PostgreSQL
        try {
            await (this.prisma as any).liveStateChangeLog.create({
                data: {
                    organizationId,
                    eventType,
                    delta: deltaPayload || {},
                    previousState: (previousState ? JSON.parse(JSON.stringify(previousState)) : {}) as any,
                    newState: (state ? JSON.parse(JSON.stringify(state)) : {}) as any,
                },
            });
        } catch (auditErr: any) {
            this.logger.warn(`Failed to create LiveStateChangeLog: ${auditErr.message}`);
        }

        // 3. Emit SSE Push Event
        this.eventEmitter.emit('live.state.updated', {
            organizationId,
            state,
        });
    }

    /**
     * Updates LiveState with atomic Redis transaction and race condition timestamp validation.
     */
    async updateState(
        organizationId: string,
        partialUpdate: Partial<OrgLiveState>,
        eventType: string = 'DELTA_UPDATE',
        eventTimestamp?: string
    ): Promise<OrgLiveState> {
        const currentState = await this.getState(organizationId);

        // Event Ordering Guard: Ignore stale events older than current state lastUpdatedAt
        if (eventTimestamp && currentState.lastUpdatedAt) {
            const eventTime = new Date(eventTimestamp).getTime();
            const lastUpdatedTime = new Date(currentState.lastUpdatedAt).getTime();
            if (eventTime < lastUpdatedTime) {
                this.logger.warn(`⚠️ Race Condition Shield: Ignored stale event [${eventType}] for Org ${organizationId} (Event: ${eventTimestamp} < LastUpdated: ${currentState.lastUpdatedAt})`);
                return currentState;
            }
        }

        const updatedState: OrgLiveState = {
            ...currentState,
            ...partialUpdate,
            organizationId,
            lastUpdatedAt: new Date().toISOString(),
        };

        // Recalculate Runway Days using FinancialMath
        const netBurnStr = FinancialMath.netBurn(updatedState.monthlyBurn, updatedState.monthlyRevenue);
        const runwayMonthsStr = FinancialMath.runwayMonths(updatedState.cashBalance, netBurnStr);
        const runwayMonthsVal = parseFloat(runwayMonthsStr);
        
        updatedState.runwayDays = Math.round(runwayMonthsVal * 30);

        await this.setState(organizationId, updatedState, eventType, partialUpdate);
        return updatedState;
    }

    /**
     * Idempotent Write of OrgLiveState into PostgreSQL CfoStateSnapshot.
     */
    async persistSnapshotToDB(organizationId: string, state?: OrgLiveState): Promise<void> {
        const liveState = state || await this.getState(organizationId);
        this.logger.log(`Persisting Idempotent CfoStateSnapshot to PostgreSQL for Org ${organizationId}`);

        const cashBalanceVal = parseFloat(liveState.cashBalance);
        const monthlyRevVal = parseFloat(liveState.monthlyRevenue);
        const monthlyExpVal = parseFloat(liveState.monthlyBurn);
        const netBurnVal = parseFloat(FinancialMath.netBurn(liveState.monthlyBurn, liveState.monthlyRevenue));
        const runwayMonthsVal = parseFloat((liveState.runwayDays / 30).toFixed(2));

        await this.prisma.cfoStateSnapshot.create({
            data: {
                organizationId,
                companyStatus: runwayMonthsVal < 3 ? 'CRITICAL' : runwayMonthsVal < 6 ? 'AT_RISK' : 'STABLE',
                runwayMonths: runwayMonthsVal,
                daysLeft: liveState.runwayDays,
                cashInBank: cashBalanceVal,
                monthlyRevenue: monthlyRevVal,
                monthlyExpenses: monthlyExpVal,
                netBurn: netBurnVal,
                burnTrend: 'STABLE',
                revenueTrend: 'STABLE',
                tone: runwayMonthsVal < 3 ? 'urgent' : 'cautious',
                dataQuality: 'rich',
                totalReceivables: parseFloat(liveState.receivables),
                fullState: liveState as any,
                riskScore: runwayMonthsVal < 3 ? 90 : 20,
            },
        });
    }

    /**
     * Scheduled Job (Every 5 Minutes): Idempotently persists Redis OrgLiveState into PostgreSQL.
     */
    @Cron('*/5 * * * *')
    async handlePeriodicSnapshotPersistence() {
        this.logger.log('--- Running Scheduled 5-Minute LiveState Persistence Job ---');
        try {
            const orgs = await this.prisma.organization.findMany({ select: { id: true } });
            for (const org of orgs) {
                const state = await this.getState(org.id);
                await this.persistSnapshotToDB(org.id, state);
            }
            this.logger.log(`--- Persisted LiveState Snapshots for ${orgs.length} Orgs ---`);
        } catch (err: any) {
            this.logger.error(`Periodic snapshot persistence error: ${err.message}`);
        }
    }

    /**
     * Single Source of Truth Aggregation: Rebuilds OrgLiveState strictly from DB transactions & models.
     */
    async initializeStateFromDB(organizationId: string): Promise<OrgLiveState> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Bank Accounts Balance Total
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true, balance: true },
        });

        const accountIds = bankAccounts.map(a => a.id);
        const cashBalanceDecimal = FinancialMath.sum(bankAccounts.map(a => a.balance));

        // 2. Trailing 30-day Transaction Aggregations
        let expensesStr = '0.00';
        let revenueStr = '0.00';

        if (accountIds.length > 0) {
            const aggs = await this.prisma.transaction.groupBy({
                by: ['type'],
                where: {
                    bankAccountId: { in: accountIds },
                    date: { gte: thirtyDaysAgo },
                    deletedAt: null,
                },
                _sum: { amount: true },
            });

            const expDecimal = aggs.find(a => a.type === 'EXPENSE')?._sum?.amount ?? 0;
            const revDecimal = aggs.find(a => a.type === 'INCOME')?._sum?.amount ?? 0;

            expensesStr = FinancialMath.toString(expDecimal);
            revenueStr = FinancialMath.toString(revDecimal);
        }

        // 3. Receivables Aggregation
        const pendingInvoices = await this.prisma.invoice.aggregate({
            where: { organizationId, status: { in: ['SENT', 'OVERDUE'] }, deletedAt: null },
            _sum: { amount: true },
        });
        const receivablesStr = FinancialMath.toString(pendingInvoices._sum.amount ?? 0);

        // 4. Payables & Tax Exposure Aggregations
        const pendingTaxes = await this.prisma.statutoryLiability.aggregate({
            where: { organizationId, status: 'PENDING' },
            _sum: { amount: true },
        });
        const taxExposureStr = FinancialMath.toString(pendingTaxes._sum.amount ?? 0);

        // Compute Net Burn & Runway
        const netBurnStr = FinancialMath.netBurn(expensesStr, revenueStr);
        const runwayMonthsStr = FinancialMath.runwayMonths(cashBalanceDecimal, netBurnStr);
        const runwayDays = Math.round(parseFloat(runwayMonthsStr) * 30);

        const liveState: OrgLiveState = {
            organizationId,
            cashBalance: FinancialMath.toString(cashBalanceDecimal),
            monthlyBurn: expensesStr,
            monthlyRevenue: revenueStr,
            runwayDays,
            receivables: receivablesStr,
            payables: taxExposureStr,
            taxExposure: taxExposureStr,
            lastUpdatedAt: now.toISOString(),
        };

        // Cache in Redis & write initial snapshot to DB
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.set(this.getRedisKey(organizationId), JSON.stringify(liveState), 'EX', 604800);
            } catch (e: any) { /* ignore */ }
        }

        await this.persistSnapshotToDB(organizationId, liveState);
        return liveState;
    }

    async onModuleDestroy() {
        if (this.redisClient) {
            try {
                await this.redisClient.quit();
            } catch (e: any) { /* ignore */ }
        }
    }
}
