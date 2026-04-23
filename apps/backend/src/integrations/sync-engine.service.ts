import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { ZohoService } from './zoho.service';
import { QuickbooksService } from './quickbooks.service';
import { CfoStateService } from '../cfo-engine/cfo-state.service';
import { CfoMetricsService } from '../cfo-engine/cfo-metrics.service';

@Injectable()
export class SyncEngineService {
    private readonly logger = new Logger(SyncEngineService.name);
    private isSyncRunning = false;

    constructor(
        private prisma: PrismaService,
        private razorpayService: RazorpayService,
        private zohoService: ZohoService,
        private quickbooksService: QuickbooksService,
        @Inject(forwardRef(() => CfoStateService))
        private cfoState: CfoStateService,
        @Inject(forwardRef(() => CfoMetricsService))
        private cfoMetrics: CfoMetricsService
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async handleHourlySync() {
        this.logger.log('--- Starting Background Hourly Sync ---');
        await this.runSyncPipeline('HOURLY');
    }

    @Cron('0 2 * * *') // Every day at 2:00 AM
    async handleDailyDeepSync() {
        this.logger.log('--- Starting Daily Deep Sync (2:00 AM) ---');
        await this.runSyncPipeline('DAILY_DEEP');
    }

    async runSyncPipeline(syncType: 'HOURLY' | 'DAILY_DEEP' | 'MANUAL' = 'MANUAL', connectionId?: string) {
        if (this.isSyncRunning && syncType !== 'MANUAL') {
            this.logger.log('Sync already in progress. Skipping scheduled run.');
            return;
        }

        this.isSyncRunning = true;
        const startTime = Date.now();

        try {
            const query: any = { status: 'CONNECTED' };
            if (connectionId) {
                query.id = connectionId;
            }

            const connections = await this.prisma.integrationConnection.findMany({
                where: query
            });

            for (const connection of connections) {
                await this.syncConnection(connection, syncType);
            }
        } catch (error: any) {
            this.logger.error(`Error in Sync Pipeline: ${error.message}`);
        } finally {
            this.isSyncRunning = false;
            const duration = Date.now() - startTime;
            this.logger.log(`--- Background Sync Completed in ${duration}ms ---`);
        }
    }

    private async syncConnection(connection: any, syncType: string) {
        this.logger.log(`Syncing connection: ${connection.provider} for Org: ${connection.organizationId}`);
        const startTime = Date.now();
        let recordsProcessed = 0;
        let errorMessage: string | null = null;
        let finalStatus = 'SUCCESS';

        await this.prisma.integrationConnection.update({
            where: { id: connection.id },
            data: { syncStatus: 'SYNCING' }
        });

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const deepSync = syncType === 'DAILY_DEEP';
                // Trigger actual sync based on provider
                switch (connection.provider) {
                    case 'RAZORPAY': {
                        const res = await this.razorpayService.syncAccount(connection.organizationId, connection.userId, deepSync);
                        recordsProcessed += res.importedCount;
                        break;
                    }
                    case 'ZOHO': {
                        const res = await this.zohoService.syncAccount(connection.userId, deepSync);
                        recordsProcessed += res.importedCount;
                        break;
                    }
                    case 'QUICKBOOKS': {
                        const res = await this.quickbooksService.syncAccount(connection.userId);
                        recordsProcessed += res.importedCount;
                        break;
                    }
                    default:
                        this.logger.warn(`Provider ${connection.provider} not supported for automated sync.`);
                }
                
                finalStatus = 'SUCCESS';
                errorMessage = null;
                break; // Exit loop on success
            } catch (error: any) {
                attempt++;
                errorMessage = error.message;
                this.logger.warn(`Failed to sync ${connection.provider} (Attempt ${attempt}/${maxRetries}): ${errorMessage}`);
                
                if (attempt >= maxRetries) {
                    finalStatus = 'FAILED';
                    this.logger.error(`Sync aborted for ${connection.provider} after ${maxRetries} attempts.`);
                } else {
                    const backoffMs = Math.pow(2, attempt) * 1000;
                    this.logger.log(`Waiting ${backoffMs}ms before retrying...`);
                    await new Promise(res => setTimeout(res, backoffMs));
                }
            }
        }

        const duration = Date.now() - startTime;

        await this.prisma.$transaction([
            this.prisma.syncLog.create({
                data: {
                    connectionId: connection.id,
                    provider: connection.provider,
                    syncType,
                    status: finalStatus,
                    recordsSynced: recordsProcessed,
                    errorDetails: errorMessage,
                    durationMs: duration
                }
            }),
            this.prisma.integrationConnection.update({
                where: { id: connection.id },
                data: { 
                    syncStatus: finalStatus === 'FAILED' ? 'FAILED' : 'IDLE',
                    lastError: errorMessage,
                    lastSyncedAt: finalStatus === 'SUCCESS' ? new Date() : undefined
                }
            })
        ]);
        
        // Notify CFO State if SUCCESS
        if (finalStatus === 'SUCCESS') {
           this.cfoState.invalidateCache(connection.organizationId);
           try {
               await this.cfoMetrics.calculateMetrics(connection.organizationId);
           } catch (err: any) {
               this.logger.error(`Metrics calculation failed after sync: ${err.message}`);
           }
        }
    }
}
