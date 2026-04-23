import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CfoAutoPilotService } from './cfo-auto-pilot.service';
import { AutoPilotMode } from '@prisma/client';

@Injectable()
export class AutoPilotCronService {
    private readonly logger = new Logger(AutoPilotCronService.name);

    constructor(
        private prisma: PrismaService,
        private autoPilotService: CfoAutoPilotService
    ) {}

    /**
     * Adaptive Execution Interval: runs every 12 hours.
     * Logic inside filters based on profile age (24h vs 12h frequency).
     */
    @Cron(CronExpression.EVERY_12_HOURS)
    async handleAutoPilotCycle() {
        this.logger.log('Starting Auto-Pilot Execution Cycle...');

        const orgs = await this.prisma.organization.findMany({
            include: { 
                startupProfiles: {
                    where: {
                        OR: [
                            { autoPilotMode: { in: [AutoPilotMode.SAFE_MODE, AutoPilotMode.ASSISTED_MODE] } },
                            { shadowModeEnabled: true }
                        ]
                    }
                }
            }
        });

        const now = new Date();

        for (const org of orgs) {
            const profile = org.startupProfiles?.[0];
            if (!profile) continue;

            try {
                // Adaptive Logic:
                // If enabled < 7 days -> frequency = 24h
                // Else -> frequency = 12h
                
                const enabledAt = profile.autoPilotEnabledAt || profile.createdAt;
                const daysEnabled = (now.getTime() - enabledAt.getTime()) / (1000 * 60 * 60 * 24);
                const lastScanAt = profile.lastAutoPilotScanAt;
                
                const requiredFrequencyHours = daysEnabled < 7 ? 24 : 12;

                if (lastScanAt) {
                    const hoursSinceLastScan = (now.getTime() - lastScanAt.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastScan < requiredFrequencyHours - 0.5) { // 0.5h buffer for cron drift
                        this.logger.log(`Skipping Auto-Pilot for org ${org.id} (Adaptive Frequency: ${requiredFrequencyHours}h, last scan was ${hoursSinceLastScan.toFixed(1)}h ago)`);
                        continue;
                    }
                }

                await this.autoPilotService.processAutoPilot(org.id);
                
                // Update last scan time
                await this.prisma.startupProfile.update({
                    where: { id: profile.id },
                    data: { lastAutoPilotScanAt: now }
                });

            } catch (err) {
                this.logger.error(`Error processing Auto-Pilot for org ${org.id}`, err);
            }
        }

        this.logger.log('Auto-Pilot Execution Cycle complete.');
    }
}
