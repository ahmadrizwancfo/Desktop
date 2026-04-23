import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CfoAutoPilotService } from './cfo-auto-pilot.service';
import { AutoPilotLogStatus } from '@prisma/client';

@Injectable()
export class AutoPilotExecutionCron {
    private readonly logger = new Logger(AutoPilotExecutionCron.name);

    constructor(
        private prisma: PrismaService,
        private autoPilot: CfoAutoPilotService
    ) {}

    /**
     * Sweeps the Pending Queue every 5 minutes to find actions ready for execution.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async sweepPendingQueue() {
        const now = new Date();

        const pendingLogs = await this.prisma.autoPilotLog.findMany({
            where: {
                status: AutoPilotLogStatus.PENDING,
                executeAt: { lte: now }
            }
        });

        if (pendingLogs.length === 0) return;

        this.logger.log(`Auto-Pilot Execution Sweep: Found ${pendingLogs.length} actions ready for final application.`);

        for (const log of pendingLogs) {
            try {
                await this.autoPilot.finalizeAutoExecution(log.id);
            } catch (err) {
                this.logger.error(`Failed to sweep/finalize Auto-Pilot log ${log.id}`, err);
            }
        }
    }
}
