import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BehaviorPattern {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
}

export interface BehavioralInsight {
    behaviorScore: number;
    complianceScore: number;
    avgConfidence: number;
    riskProfile: 'Aggressive' | 'Balanced' | 'Conservative';
    patterns: BehaviorPattern[];
    insights: string[];
    warnings: string[];
    recommendations: string[];
}

@Injectable()
export class CfoBehaviorService {
    constructor(private prisma: PrismaService) {}

    /**
     * Analyze simulation logs to detect decision-making patterns.
     * Lightweight aggregation for real-time insight generation.
     */
    async analyzeFounderBehavior(userId: string): Promise<BehavioralInsight | null> {
        const sims = await this.prisma.simulationLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15 // Analyze recent history
        });

        if (sims.length === 0) return null;

        const total = sims.length;
        const dangerCount = sims.filter(s => s.riskLevel === 'DANGER').length;
        const watchCount = sims.filter(s => s.riskLevel === 'WATCH').length;
        const safeCount = sims.filter(s => s.riskLevel === 'SAFE').length;

        const dangerPct = (dangerCount / total) * 100;

        // Track burn increases vs decreases
        let burnIncreases = 0;
        let significantRunwayDrops = 0;
        sims.forEach(s => {
            const impact = s.impactSummary as any;
            if (impact.burnDelta > 0) burnIncreases++;
            if ((impact.runwayBefore - impact.runwayAfter) / (impact.runwayBefore || 1) > 0.15) significantRunwayDrops++;
        });

        const burnIncreasePct = (burnIncreases / total) * 100;

        // Initialize scoring
        let behaviorScore = 100;
        const patterns: BehaviorPattern[] = [];
        const insights: string[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 1. High-Risk Bias
        if (dangerPct > 40) {
            behaviorScore -= 20;
            patterns.push({
                type: 'HIGH_RISK_BIAS',
                severity: 'HIGH',
                message: 'You have a strong bias toward high-risk scenarios.'
            });
            warnings.push(`${Math.round(dangerPct)}% of your simulations end in the Danger Zone.`);
        }

        // 2. Burn Underestimation
        if (burnIncreasePct > 60) {
            behaviorScore -= 15;
            patterns.push({
                type: 'BURN_UNDERESTIMATION',
                severity: 'MEDIUM',
                message: 'Tendency to underestimate the compounding effect of new costs.'
            });
            insights.push("You consistently test scenarios that increase fixed burn.");
        }

        // 3. Runway Neglect
        if (significantRunwayDrops > 3) {
            behaviorScore -= 15;
            patterns.push({
                type: 'RUNWAY_NEGLECT',
                severity: 'HIGH',
                message: 'You frequently accept runway drops greater than 15%.'
            });
            recommendations.push("Prioritize revenue-first strategies before committing to burn increases.");
        }

        // 4. Personality Classification
        let riskProfile: 'Aggressive' | 'Balanced' | 'Conservative' = 'Balanced';
        if (dangerPct > 50 || burnIncreasePct > 70) {
            riskProfile = 'Aggressive';
        } else if (safeCount / total > 0.8 && burnIncreases === 0) {
            riskProfile = 'Conservative';
            insights.push("Over-conservative: You rarely explore aggressive growth or scaling scenarios.");
        }

        // Simulation Addiction check
        if (total >= 15) {
            patterns.push({
                type: 'SIMULATION_OVERLOAD',
                severity: 'LOW',
                message: 'High simulation volume detected. Ensure analysis leads to execution.'
            });
        }

        // Final Score Floor
        behaviorScore = Math.max(0, behaviorScore);

        // Fetch Compliance & Confidence context
        const profile = await this.prisma.startupProfile.findUnique({ where: { userId } });
        const recentActions = await this.prisma.actionItem.findMany({
            where: { userId, status: 'DONE' },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });
        const avgConfidence = recentActions.length > 0 
            ? Math.round(recentActions.reduce((acc, a) => acc + (a.verificationConfidence || 0), 0) / recentActions.length)
            : 80;

        return {
            behaviorScore,
            complianceScore: profile?.complianceScore || 0,
            avgConfidence,
            riskProfile,
            patterns,
            insights,
            warnings,
            recommendations
        };
    }
}
