import { Injectable } from '@nestjs/common';
import { CFOState } from './cfo-state.service';

export interface CfoActionItem {
    title: string;
    impact: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
    reasoning: string;
    type: 'RISK' | 'GROWTH' | 'LIQUIDITY' | 'OPERATIONAL';
    metricEffect?: {
        runwayChange?: number;
        burnChange?: number;
    };
    isExecutable?: boolean;
    executionPayload?: any;
    isSuppressed?: boolean;
    suppressionReason?: string;
    executionLogs?: any[];
}

export interface AutonomousCfoOutput {
    priorityActions: CfoActionItem[];
    warnings: string[];
    opportunities: CfoActionItem[];
    summary: string;
    cfoRecommendation: 'APPROVE' | 'WARN' | 'BLOCK';
    context?: {
        confidence: number;
        complianceScore: number;
    };
}

@Injectable()
export class AutonomousCfoService {
    
    /**
     * Issue financial commands based on state and behavior.
     */
    generateCfoActions(state: CFOState): AutonomousCfoOutput {
        const priorityActions: CfoActionItem[] = [];
        const warnings: string[] = [];
        const opportunities: CfoActionItem[] = [];
        
        const { summary, deathClock, behavioralAudit, trustIntelligence } = state;
        const runway = summary.runwayMonths;
        const riskProfile = behavioralAudit?.riskProfile || 'Balanced';

        const isRecalibrating = trustIntelligence?.isRecalibrating || false;

        // helper to check suppression
        const getSuppression = (type: string) => {
            const perf = trustIntelligence?.categoryPerformances?.[type];
            if (perf?.isSuppressed) {
                return {
                    isSuppressed: true,
                    reason: `CFO has low confidence in this strategy due to recent outcomes. Manual review required.`
                };
            }
            return null;
        };

        // 🟢 1. WARNING ENGINE (Uncomfortable truths)
        if (runway < 6) {
            warnings.push(`Survival is at risk: At current burn, you have only ${Math.round(runway * 30)} days left.`);
        }
        if (behavioralAudit?.behaviorScore < 50) {
            warnings.push(`You are 2 bad decisions away from a permanent cash crisis.`);
        }
        if (isRecalibrating) {
            warnings.push(`CFO is recalibrating due to recent decision variance — review required for now.`);
        }

        // 🔴 2. PRIORITY ACTIONS (Survival & Discipline)
        if (runway < 6) {
            const s = getSuppression('RISK');
            priorityActions.push({
                title: 'Apply 20% Emergency Burn Cut',
                impact: `Extends runway by ~${(runway * 0.25).toFixed(1)} months`,
                urgency: 'IMMEDIATE',
                reasoning: s?.isSuppressed ? s.reason : 'Runway is below the 6-month safety threshold. Non-essential vendor spend must be audited within 72 hours.',
                type: 'RISK',
                metricEffect: { burnChange: -0.2 },
                isExecutable: true,
                executionPayload: { targetBurn: 0.8 },
                isSuppressed: s?.isSuppressed,
                suppressionReason: s?.reason
            });
            priorityActions.push({
                title: 'Enforce Global Hiring Freeze',
                impact: 'Immediately stabilizes current burn',
                urgency: 'IMMEDIATE',
                reasoning: 'Additional headcount at this stage accelerates the zero-cash date exponentially.',
                type: 'OPERATIONAL',
                isExecutable: true,
                executionPayload: { hiringFreeze: true }
            });
        }

        if (runway >= 6 && runway < 12 && riskProfile === 'Aggressive') {
            const s = getSuppression('LIQUIDITY');
            priorityActions.push({
                title: 'Stabilize Monthly Expenses',
                impact: 'Prevents runway collapse',
                urgency: 'HIGH',
                reasoning: s?.isSuppressed ? s.reason : 'Your aggressive profile is increasing burn faster than revenue realization.',
                type: 'LIQUIDITY',
                isExecutable: true,
                executionPayload: { targetBurn: 0.95 },
                isSuppressed: s?.isSuppressed,
                suppressionReason: s?.reason
            });
        }

        // 🟡 3. BEHAVIORAL NUDGES
        if (riskProfile === 'Conservative' && runway > 12) {
            const s = getSuppression('GROWTH');
            opportunities.push({
                title: 'Enable Growth Mode',
                impact: 'Unlocks compounding revenue',
                urgency: 'MEDIUM',
                reasoning: s?.isSuppressed ? s.reason : 'You have high safety. Conservative behavior is limiting your ability to scale. Reallocating budget to marketing.',
                type: 'GROWTH',
                isExecutable: true,
                executionPayload: { 
                    growthMode: true, 
                    marketingMultiplier: 1.3, 
                    salesMultiplier: 1.15 
                },
                isSuppressed: s?.isSuppressed,
                suppressionReason: s?.reason
            });
        }

        // 🔵 4. OPPORTUNITY ENGINE (Scaling)
        if (runway > 12 && summary.revenueTrend === 'growing') {
            opportunities.push({
                title: 'Increase Growth Experiment Budget',
                impact: 'Accelerates path to profitability',
                urgency: 'MEDIUM',
                reasoning: 'Current metrics support a 15% increase in acquisition spend.',
                type: 'GROWTH'
            });
        }

        // 🦾 5. CFO RECOMMENDATION (Blocking Logic)
        let cfoRecommendation: 'APPROVE' | 'WARN' | 'BLOCK' = 'APPROVE';
        if (runway < 4) cfoRecommendation = 'BLOCK';
        else if (runway < 8) cfoRecommendation = 'WARN';

        // 📝 6. SUMMARY GENERATION
        let summaryText = 'Your financial state is stable, but disciplined growth is required.';
        if (runway < 6) summaryText = 'Survival mode ACTIVE. Every rupee of burn must be justified.';
        if (isRecalibrating) summaryText = 'SYSTEM RE-CALIBRATION: High variance detected in recent outcomes. trustZone downgraded.';
        if (riskProfile === 'Aggressive') summaryText += ' WARNING: Your decision patterns are high-risk.';

        return {
            priorityActions,
            warnings,
            opportunities,
            summary: summaryText,
            cfoRecommendation,
            context: {
                confidence: isRecalibrating ? Math.min(70, trustIntelligence?.cfoAccuracyScore || 70) : (behavioralAudit?.avgConfidence || 80),
                complianceScore: behavioralAudit?.complianceScore || 0
            }
        };
    }
}
