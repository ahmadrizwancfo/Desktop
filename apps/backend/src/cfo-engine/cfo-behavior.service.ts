import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type BehavioralRiskProfile = 'PROACTIVE' | 'REACTIONARY' | 'CHAOTIC' | 'ATTENTION_REQUIRED' | 'NEW_USER';

export interface BehavioralMetrics {
    behaviorScore: number;
    activePenalty: number;
    inactionPenaltiesTotal: number;
    riskProfile: BehavioralRiskProfile;
    patterns: any[];
    probationDaysLeft?: number;
    isProbationary?: boolean;
    insightAccuracy: number; // v4.1 Reframe: Confidence in data-driven insights
}

@Injectable()
export class CfoBehaviorService {
    private readonly logger = new Logger(CfoBehaviorService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Log every decision interaction — v4.0 Behavioral Engine
     */
    async logInteraction(
        startupProfileId: string,
        decisionId: string,
        actionType: 'SHOWN' | 'CLICKED' | 'RESOLVED' | 'IGNORED' | 'UNRECOGNIZED_TRANSACTION' | 'GHOST_DETECTED',
        metadata?: any
    ) {
        this.logger.log(`Logging ${actionType} for decision ${decisionId}`);

        // 1. Create audit record
        await this.prisma.behavioralAudit.create({
            data: {
                startupProfileId,
                decisionId,
                actionType,
                metadata: metadata || {}
            }
        });

        // 2. Update decision timing fields
        const now = new Date();
        const updateData: any = { lastActionAt: now };
        
        if (actionType === 'SHOWN') {
            // Only set shownAt if not already set
            const decision = await this.prisma.cfoDecision.findUnique({ where: { id: decisionId } });
            if (!decision?.shownAt) {
                updateData.shownAt = now;
            }
        } else if (actionType === 'RESOLVED') {
            updateData.finalizedAt = now;
        }

        await this.prisma.cfoDecision.update({
            where: { id: decisionId },
            data: updateData
        });

        // 3. Trigger score recalculation
        await this.refreshUserScore(startupProfileId);
    }

    /**
     * Calculate and persist the Insight Accuracy and Opportunity Costs.
     * v4.1 REFRAME: From "Punishment" to "Guidance Accuracy"
     */
    async refreshUserScore(startupProfileId: string) {
        const profile = await this.prisma.startupProfile.findUnique({
            where: { id: startupProfileId },
            include: { cfoDecisions: { where: { status: { not: 'RESOLVED' } } } }
        });

        if (!profile) return;

        const audits = await this.prisma.behavioralAudit.findMany({
            where: { startupProfileId },
            orderBy: { timestamp: 'desc' }
        });

        const dailyBurn = Number(profile.monthlyExpenses) / 30;
        const opportunityCostFactor = 0.05; // 5% daily capital efficiency loss
        let totalOpportunityCost = 0;
        let accuracyScore = 100;

        // Calculate Opportunity Costs from unaddressed decisions
        const activeDecisions = await this.prisma.cfoDecision.findMany({
            where: { startupProfileId, status: { in: ['NEW', 'OPEN', 'ACKNOWLEDGED'] }, shownAt: { not: null } }
        });

        const now = new Date();
        const attentionWindowHours = 24;

        for (const decision of activeDecisions) {
            const timeDiffMs = now.getTime() - decision.shownAt!.getTime();
            const hoursElapsed = timeDiffMs / (1000 * 60 * 60);
            
            // Learning Period: No cost for the first 24 hours
            if (hoursElapsed > attentionWindowHours) {
                const effectiveDelayDays = (hoursElapsed - attentionWindowHours) / 24;
                const cost = dailyBurn * opportunityCostFactor * effectiveDelayDays;
                totalOpportunityCost += cost;
                
                // Update decision-specific accrued meta
                await this.prisma.cfoDecision.update({
                    where: { id: decision.id },
                    data: { inactionFeeAccrued: cost }
                });
            }
        }

        // Adjust Accuracy Score based on data transparency patterns
        // v4.1: Ignored suggestions reduce the system's ability to model behavior
        accuracyScore -= audits.filter(a => a.actionType === 'IGNORED').length * 3;
        accuracyScore += audits.filter(a => a.actionType === 'RESOLVED').length * 2;
        
        // v4.1 UNRECOGNIZED TRANSACTION impact (was Ghost Penalty)
        const unrecognizedAudit = audits.filter(a => a.actionType === 'UNRECOGNIZED_TRANSACTION' || a.actionType === 'GHOST_DETECTED');
        accuracyScore -= unrecognizedAudit.length * 5; // Reduced from 15 to 5 (Soft accountability)

        // v4.1 STATUTORY ATTENTION (Mastermind Hard-Lock)
        const overdueLiabilities = await this.prisma.statutoryLiability.count({
            where: { organizationId: profile.organizationId, status: 'OVERDUE' }
        });
        accuracyScore -= overdueLiabilities * 10;

        // v4.1 DECISION VELOCITY BONUS
        const recentResolved = await this.prisma.cfoDecision.findMany({
            where: { startupProfileId, status: 'RESOLVED', finalizedAt: { not: null }, shownAt: { not: null } },
            orderBy: { finalizedAt: 'desc' },
            take: 10
        });
        
        if (recentResolved.length > 0) {
            const avgHours = recentResolved.reduce((sum, d) => {
                return sum + (d.finalizedAt!.getTime() - d.shownAt!.getTime()) / (1000 * 60 * 60);
            }, 0) / recentResolved.length;
            
            if (avgHours < 24) accuracyScore += 5; 
            else if (avgHours > 72) accuracyScore -= 5;
        }

        accuracyScore = Math.max(0, Math.min(100, accuracyScore));
        const finalAccuracy = Number(accuracyScore.toFixed(1));

        // Historical Opportunity Loss
        const historicalLossResult = await this.prisma.cfoDecision.aggregate({
            where: { startupProfileId, status: 'RESOLVED' },
            _sum: { inactionFeeAccrued: true }
        });
        const historicalLoss = Number(historicalLossResult._sum.inactionFeeAccrued || 0);

        await this.prisma.startupProfile.update({
            where: { id: startupProfileId },
            data: { 
                behavioralScore: finalAccuracy,
                behavioralPenaltiesAccrued: totalOpportunityCost,
                totalInactionPenalties: historicalLoss 
            }
        });

        return { accuracy: finalAccuracy, totalOpportunityCost, historicalLoss };
    }

    async boostScore(startupProfileId: string, amount: number, reason: string) {
        this.logger.log(`Boosting score for ${startupProfileId} by ${amount} due to ${reason}`);
        const profile = await this.prisma.startupProfile.findUnique({ where: { id: startupProfileId } });
        if (!profile) return;
        
        await this.prisma.startupProfile.update({
            where: { id: startupProfileId },
            data: { behavioralScore: Math.min(100, (profile.behavioralScore || 100) + amount) }
        });
    }

    async getBehavioralSnapshot(startupProfileId: string): Promise<BehavioralMetrics> {
        const profile = await this.prisma.startupProfile.findUnique({
            where: { id: startupProfileId },
            select: { behavioralScore: true, totalInactionPenalties: true, behavioralPenaltiesAccrued: true }
        });

        const score = profile?.behavioralScore ?? 100;

        return {
            behaviorScore: score,
            insightAccuracy: score,
            activePenalty: Number(profile?.behavioralPenaltiesAccrued ?? 0),
            inactionPenaltiesTotal: Number(profile?.totalInactionPenalties ?? 0),
            riskProfile: 'REACTIONARY',
            patterns: []
        };
    }

    async analyzeFounderBehavior(userId: string) {
        const profile = await this.prisma.startupProfile.findFirst({
            where: { userId },
            include: { organization: true }
        });
        if (!profile) return null;
        
        const snap = await this.getBehavioralSnapshot(profile.id);
        const org = profile.organization;
        
        // Calculate probation
        const probationPeriodDays = 7;
        const daysSinceCreated = Math.floor((Date.now() - org.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const isProbationary = daysSinceCreated < probationPeriodDays;
        const probationDaysLeft = Math.max(0, probationPeriodDays - daysSinceCreated);

        // Run History Analyzer
        const historyRisk = await this.runHistoryAnalyzer(org.id);

        return {
            ...snap,
            isProbationary,
            probationDaysLeft,
            riskProfile: isProbationary ? 'NEW_USER' : historyRisk,
            complianceScore: snap.behaviorScore,
            avgConfidence: 85,
            insights: [],
            warnings: [],
            recommendations: []
        };
    }

    private async runHistoryAnalyzer(organizationId: string): Promise<BehavioralRiskProfile> {
        const overdueLiabilities = await this.prisma.statutoryLiability.count({
            where: { organizationId, status: 'OVERDUE' }
        });

        if (overdueLiabilities > 0) {
            this.logger.warn(`Organization ${organizationId} requires ATTENTION due to ${overdueLiabilities} overdue statutory items.`);
            return 'ATTENTION_REQUIRED';
        }

        // v4.1 UNRECOGNIZED TRANSACTION GATEKEEPER
        const unrecognizedAudit = await this.prisma.behavioralAudit.count({
            where: { 
                startupProfile: { organizationId },
                actionType: { in: ['UNRECOGNIZED_TRANSACTION', 'GHOST_DETECTED'] },
                timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }
        });
        
        if (unrecognizedAudit > 3) { // Increased threshold to allow some noise
            this.logger.warn(`Organization ${organizationId} requires ATTENTION due to unrecognized transactions.`);
            return 'ATTENTION_REQUIRED';
        }

        const metrics = await this.prisma.financialMetrics.findMany({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' },
            take: 3
        });

        if (metrics.length === 0) return 'PROACTIVE';

        let highSpikes = 0;
        let latePayments = 0;

        for (const m of metrics) {
            if (m.warnings && m.warnings.some(w => w.toLowerCase().includes('late') || w.toLowerCase().includes('penalty'))) {
                latePayments++;
            }
            if (m.totalExpenses && m.openingBalance) {
                const ratio = Number(m.totalExpenses) / Math.max(1, Number(m.openingBalance));
                if (ratio > 0.4) highSpikes++; // Arbitrary "spike" threshold
            }
        }

        if (latePayments > 0 || highSpikes > 1) return 'ATTENTION_REQUIRED';
        if (highSpikes > 0) return 'REACTIONARY';
        
        return 'PROACTIVE';
    }
}
