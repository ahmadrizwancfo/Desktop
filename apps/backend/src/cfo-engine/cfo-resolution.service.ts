import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoBehaviorService } from './cfo-behavior.service';

export interface PhoenixRaiseOption {
    id: string;
    label: string;
    impact: string;
    locked: boolean;
    lockReason?: string;
    requiredActions?: string[];
}

@Injectable()
export class CfoResolutionService {
    private readonly logger = new Logger(CfoResolutionService.name);

    constructor(
        private prisma: PrismaService,
        private behaviorService: CfoBehaviorService
    ) {}

    /**
     * getPhoenixRaiseOptions
     * 
     * Logic: If BehavioralRiskProfile === 'CHAOTIC', return a locked state.
     * Required by "Alpha-10" launch sequence.
     */
    async getPhoenixRaiseOptions(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { organizationId: true }
        });

        if (!user?.organizationId) {
            throw new Error('User has no organization.');
        }

        const profile = await this.prisma.startupProfile.findUnique({
            where: { organizationId: user.organizationId }
        });

        if (!profile) {
            throw new Error('Startup profile not found.');
        }

        const behavior = await this.behaviorService.getBehavioralSnapshot(profile.id);
        const isChaotic = behavior.riskProfile === 'ATTENTION_REQUIRED';

        // Check for specific overdue items
        const overdueItems = await this.prisma.statutoryLiability.findMany({
            where: { 
                organizationId: user.organizationId,
                status: 'OVERDUE'
            },
            select: { title: true }
        });

        if (isChaotic) {
            this.logger.warn(`Phoenix Raise LOCKED for org ${user.organizationId} due to ATTENTION_REQUIRED status.`);
            
            return {
                locked: true,
                lockReason: "You are currently flying in ATTENTION_REQUIRED mode. Advanced survival options are locked until statutory integrity is restored.",
                requiredActions: overdueItems.length > 0 
                    ? overdueItems.map(i => `Pay ${i.title}`)
                    : ["Restore statutory compliance in Zoho/Tally"],
                options: []
            };
        }

        // Standard Bridge / Phoenix Raise logic
        const totalShutdownReserve = 500000; // Mock calculation, should match frontend logic if possible
        
        return {
            locked: false,
            options: [
                {
                    id: 'bridge_v1',
                    label: 'Phoenix Raise (Bridge)',
                    impact: `Raise capital while locking ₹${totalShutdownReserve} in statutory reserve.`,
                    locked: false
                }
            ]
        };
    }
}
