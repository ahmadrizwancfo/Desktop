import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CfoEngineService } from './cfo-engine.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';

/**
 * CfoSchedulerService — Daily Engine Runner
 *
 * Runs the 6-domain CFO Decision Engine for ALL active users every day at 6:00 AM IST.
 * This turns FounderCFO from a manual tool into a living system.
 */
@Injectable()
export class CfoSchedulerService {
    private readonly logger = new Logger(CfoSchedulerService.name);

    constructor(
        private prisma: PrismaService,
        private cfoEngine: CfoEngineService,
        private aiExplainer: AiExplainerService,
    ) {
        this.logger.log('⏰ CFO Daily Scheduler registered — runs at 06:00 IST');
    }

    /**
     * CRON: every day at 00:30 UTC = 06:00 AM IST
     */
    @Cron('30 0 * * *', { name: 'daily-cfo-engine', timeZone: 'Asia/Kolkata' })
    async handleDailyEngineRun(): Promise<void> {
        this.logger.log('━━━ DAILY CFO ENGINE RUN STARTING ━━━');
        const startTime = Date.now();

        // Get all active startup profiles
        const profiles = await this.prisma.startupProfile.findMany({
            select: { id: true, userId: true, companyName: true },
        });

        if (profiles.length === 0) {
            this.logger.log('No active profiles found — skipping daily run');
            return;
        }

        this.logger.log(`Processing ${profiles.length} active profile(s)...`);

        let successCount = 0;
        let errorCount = 0;

        for (const profile of profiles) {
            try {
                // Run the engine (uses upsert — will update existing decisions, not duplicate)
                const decisions = await this.cfoEngine.runEngine(profile.id, profile.userId);

                // Generate AI explanations for any new/updated decisions
                for (const decision of decisions) {
                    this.aiExplainer.explain(decision.id).catch((err) =>
                        this.logger.warn(`Explanation failed for ${decision.id}: ${err.message}`),
                    );
                }

                successCount++;
                this.logger.debug(
                    `✅ ${profile.companyName || profile.id}: ${decisions.length} decisions`,
                );
            } catch (err) {
                errorCount++;
                this.logger.error(
                    `❌ Engine failed for ${profile.companyName || profile.id}: ${err.message}`,
                );
            }
        }

        const elapsedMs = Date.now() - startTime;
        this.logger.log(
            `━━━ DAILY CFO ENGINE COMPLETE: ${successCount} success, ${errorCount} errors, ${elapsedMs}ms ━━━`,
        );
    }
}
