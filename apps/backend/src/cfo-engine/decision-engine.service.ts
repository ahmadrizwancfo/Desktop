import { Injectable, Logger } from '@nestjs/common';
import { CFOState, Decision, DecisionAlert, DecisionOutput, ExecutionTask, StartupStage, TradeOff, AlternativeAnalysis } from './cfo-state.service';
import * as crypto from 'crypto';

@Injectable()
export class DecisionEngineService {
    private readonly logger = new Logger(DecisionEngineService.name);

    private readonly TRADE_OFFS: Record<StartupStage, Array<{ trigger: string; gain: string; loss: string }>> = {
        survival: [
            { trigger: 'burn_high', gain: 'Extend runway by 2–4 months', loss: 'Reduced growth speed and market momentum' },
            { trigger: 'team_cost_heavy', gain: 'Immediate burn reduction', loss: 'Execution capacity and team morale risk' }
        ],
        stabilize: [
            { trigger: 'margin_low', gain: 'Improved cash predictability', loss: 'Slower expansion and experimentation' },
            { trigger: 'growth_volatile', gain: 'More stable revenue base', loss: 'Reduced short-term upside' }
        ],
        growth: [
            { trigger: 'underinvestment', gain: 'Faster scaling and revenue growth', loss: 'Higher burn and shorter runway' },
            { trigger: 'hiring_opportunity', gain: 'Execution speed and expansion capacity', loss: 'Increased fixed costs and risk exposure' }
        ]
    };

    /**
     * Convert financial data into deterministic, stage-aware recommendations.
     * v3.5 Outcome Clarity Engine (Refined)
     */
    generateDecisions(state: CFOState, previousSnapshots: any[] = []): DecisionOutput {
        const rawDecisions: Decision[] = [];
        const alerts: DecisionAlert[] = [];
        
        const runway = state.summary.runwayMonths;
        const stage = this.getStartupStage(runway);
        const metrics = { runwayMonths: runway, burnRate: state.summary.netBurn, revenue: state.summary.monthlyRevenue };

        const confidenceScore = state.dynamicConfidence.score;
        const confidence = {
            score: confidenceScore,
            label: this.getConfidenceLabel(confidenceScore)
        };
        const lowConfidence = confidenceScore < 70;
        const stability = this.calculateStability(state, previousSnapshots);
        
        // Behavioral Gating
        const ignoredCount = state.decisionMemory?.pendingDecisions || 0;
        const isCrisis = runway <= 3 || ignoredCount >= 3;
        const intensity = isCrisis ? 'CRISIS' : 'NORMAL';

        const prevRunway = previousSnapshots[0]?.state?.summary?.runwayMonths || runway;

        // ── 1. GENERATE RAW CANDIDATES ─────────────────────────────
        
        // 🔴 CRITICAL: RUNWAY/SURVIVAL
        if (runway < 6) {
            const targetRunway = 6;
            const requiredCut = state.summary.netBurn - (state.summary.cashInBank / targetRunway);
            const delta = targetRunway - runway;

            if (runway <= 3) {
                // Crisis Mode: Imperative
                const decisionParams = {
                    key: 'RUNWAY_SURVIVAL',
                    type: 'mandate',
                    priority: 5,
                    urgency: 'critical',
                    recommendationStrength: 'strong',
                    title: intensity === 'CRISIS' ? 'SURVIVAL MANDATE: Immediate Burn Cut' : 'Strong Recommendation: Burn Reduction',
                    message: intensity === 'CRISIS' 
                        ? `You are ${runway.toFixed(1)} months from zero. Cut ₹${this.fmtAmt(requiredCut)}/month TODAY to reach 6 months runway.`
                        : `Strong recommendation: Cut ₹${this.fmtAmt(requiredCut)}/month to reach 6-month runway threshold.`,
                    deadline: 'TODAY',
                    consequence: {
                        daysToZero: Math.round(runway * 30.44),
                        message: `If ignored, insolvency is projected in ~${Math.round(runway * 30.44)} days.`
                    },
                    tradeOffs: this.getTradeOffs(stage, 'burn_high'),
                    rationale: `Cutting ₹${this.fmtAmt(requiredCut)}/month improves your runway by ${Math.round(delta * 30.4)} days to reach exactly 6 months survival.`,
                    startupStage: stage,
                    confidence,
                    stability,
                    executionPlan: this.getExecutionPlan('RUNWAY_SURVIVAL', state),
                    impactPreview: { before: runway, after: targetRunway, delta },
                    impactRange: { min: delta * 0.9, max: delta * 1.1 },
                    impactRunwayDays: Math.round(delta * 30.4),
                    impactBurnMonthly: requiredCut,
                    actionPayload: { type: 'simulate_cost_cut', preloadedScenario: { targetReduction: Math.round((requiredCut / state.summary.netBurn) * 100) } }
                };
                rawDecisions.push(this.createDecision({
                    ...decisionParams,
                    alternative: this.generateAlternative(decisionParams as any, metrics, stage)
                } as any, 100, delta));
            } else {
                // Normal Mode: Strong Recommendation
                const fundraiseDelta = 1.5;
                const decisionParams = {
                    key: 'FUNDRAISE_MANDATE',
                    type: 'mandate',
                    priority: 4,
                    urgency: 'high',
                    recommendationStrength: 'strong',
                    title: 'Recommended Action: Initiate Fundraising',
                    message: `Your runway is entering the danger zone. We recommend starting the fundraising process this month.`,
                    deadline: 'Within 30 days',
                    consequence: {
                        daysToZero: Math.round(runway * 30.44),
                        message: `At current burn, you may run out of cash in ~${Math.round(runway * 30.44)} days.`
                    },
                    tradeOffs: this.getTradeOffs(stage, 'margin_low'),
                    rationale: `A standard 18-month raise of your current burn (₹${this.fmtAmt(state.summary.netBurn * 18)}) adds exactly 540 days of runway.`,
                    impactRunwayDays: Math.round(fundraiseDelta * 30.4),
                    startupStage: stage,
                    confidence,
                    stability,
                    executionPlan: this.getExecutionPlan('FUNDRAISE_MANDATE', state),
                    impactPreview: { before: runway, after: runway + fundraiseDelta, delta: fundraiseDelta },
                    actionPayload: { type: 'simulate_fundraise', preloadedScenario: { currentCash: state.summary.cashInBank } }
                };
                rawDecisions.push(this.createDecision({
                    ...decisionParams,
                    alternative: this.generateAlternative(decisionParams as any, metrics, stage)
                } as any, 70, fundraiseDelta));
            }
        }

        // 🟢 SILENT RISK DETECTION
        if (runway >= 9) {
            if (state.summary.revenueTrend === 'declining') {
                const decisionParams = {
                    key: 'STRATEGIC_REVENUE_RISK',
                    type: 'recommendation',
                    priority: 3,
                    urgency: 'medium',
                    recommendationStrength: 'suggested',
                    title: 'Suggested Improvement: Revenue Audit',
                    message: `Revenue is showing a weekly decline. We suggest an audit before this compounds.`,
                    tradeOffs: this.getTradeOffs(stage, 'growth_volatile'),
                    rationale: `Reversing a revenue decline stabilizes burn immediately, protecting approximately 15 further days of runway.`,
                    impactRunwayDays: 15,
                    startupStage: stage,
                    confidence,
                    stability,
                    executionPlan: [{ task: "Identify top 3 churn accounts", completed: false, impact: "Retention" }],
                };
                rawDecisions.push(this.createDecision({
                    ...decisionParams,
                    alternative: this.generateAlternative(decisionParams as any, metrics, stage)
                } as any, 40, 0.5));
            }
        }

        // Efficiencies
        state.changeDrivers.forEach(driver => {
            if (driver.trend === 'up' && driver.impactOnRunwayMonths < -0.3) {
                const delta = Math.abs(driver.impactOnRunwayMonths);
                const decisionParams = {
                    key: `OPTIMIZE_${driver.label.toUpperCase().replace(/\s+/g, '_')}`,
                    type: 'recommendation',
                    priority: 2,
                    urgency: 'medium',
                    recommendationStrength: 'suggested',
                    title: `Suggested Improvement: Optimize ${driver.label}`,
                    message: `Efficiency opportunity: Reduce overspending on ${driver.label} by ₹${this.fmtAmt(driver.delta)}/month.`,
                    tradeOffs: this.getTradeOffs(stage, 'margin_low'),
                    rationale: `Reducing ₹${this.fmtAmt(driver.delta)}/month from ${driver.label} adds exactly ${Math.round(delta * 30.4)} days to your runway immediately.`,
                    startupStage: stage,
                    confidence,
                    stability,
                    impactRunwayDays: Math.round(delta * 30.4),
                    impactBurnMonthly: driver.delta,
                    executionPlan: this.getExecutionPlan('OPTIMIZE_SPEND', state, driver.label),
                    actionPayload: { type: 'simulate_cost_cut', preloadedScenario: { categories: [driver.category || driver.label] } }
                };
                rawDecisions.push(this.createDecision({
                    ...decisionParams,
                    alternative: this.generateAlternative(decisionParams as any, metrics, stage)
                } as any, 50, delta));
            }
        });

        // ── 2. SCORING & FILTERING ───────────────────────────
        const rawMandates = rawDecisions.filter(d => d.type === 'mandate').sort((a,b) => b.priorityScore - a.priorityScore);

        // 🟠 PERMISSION LAYER
        const processedMandates = rawMandates.map(m => {
            const isAggressiveAction = ['FUNDRAISE_MANDATE', 'HIRE_STRATEGY', 'SCALE_SPEND'].includes(m.decisionKey);
            if (isAggressiveAction && (lowConfidence || stability === 'volatile')) {
                const decisionParams = {
                    ...m,
                    decisionKey: 'STABILIZE_DATA',
                    title: 'Recommended Action: Data Stabilization',
                    message: 'Due to data volatility, we recommend stabilizing top-line revenue before initiating high-commitment actions.',
                    urgency: 'medium',
                    recommendationStrength: 'suggested',
                    tradeOffs: { gain: 'Higher decision confidence', loss: 'Delay in growth initiatives' },
                    rationale: 'Current data signals are unstable, making high-commitment actions risky.',
                    executionPlan: [
                        { task: "Validate last 30 days of transactions", completed: false, impact: "Trust" },
                        { task: "Identify and categorize outlier spikes", completed: false, impact: "Clarity" }
                    ],
                    actionPayload: { type: 'fix_categories' }
                };
                return {
                    ...decisionParams,
                    alternative: this.generateAlternative(decisionParams as any, metrics, stage)
                } as Decision;
            }
            return m;
        });

        const recommendations = rawDecisions.filter(d => d.type === 'recommendation').sort((a,b) => b.priorityScore - a.priorityScore);
        
        // 1 Mandate Rule
        const primaryDecision = processedMandates[0] || recommendations[0] || null;
        const secondaryQueue = rawDecisions.filter(d => d.id !== primaryDecision?.id);

        // ── 3. DAILY FOCUS (1-1-1) ─────────────────────────────
        const dailyFocus = {
            fix: primaryDecision,
            support: secondaryQueue[0] || null,
            watch: state.negativeTrends[0] || { metric: 'Runway', message: 'Stable but monitoring burn spikes.' }
        };

        // ── 4. HOUSEKEEPING ────────────────────────────────────
        state.dynamicConfidence.warnings.forEach((w, i) => {
            alerts.push({
                id: `QUALITY_ALERT_${i}`,
                title: w.problem,
                message: `${w.impact} ${w.action}`,
                type: 'data_quality',
                severity: w.severity as any
            });
        });

        return {
            summary: primaryDecision ? primaryDecision.message : 'Financial operations performing within nominal bounds.',
            primaryDecisionId: primaryDecision?.id || null,
            urgency: this.calculateGlobalUrgency(runway),
            decisions: rawDecisions.slice(0, 5), 
            alerts,
            opportunities: [], 
            confidenceAdjusted: lowConfidence,
            history: [],
            globalDecisionHash: crypto.createHash('md5').update(rawDecisions.map(d => d.decisionKey).join('|')).digest('hex'),
            dailyFocus,
            previousRunway: prevRunway,
            currentRunway: runway,
            ownershipNote: "Final decision is yours. This is based on available data.",
            tone: (runway <= 3 || lowConfidence) ? 'urgent' : (runway < 12 || stability === 'volatile') ? 'cautious' : 'strategic',
            stability,
        };
    }

    private getStartupStage(runwayMonths: number): StartupStage {
        if (runwayMonths <= 3) return 'survival';
        if (runwayMonths <= 6) return 'stabilize';
        return 'growth';
    }

    private getTradeOffs(stage: StartupStage, trigger: string): TradeOff {
        const stageTradeOffs = this.TRADE_OFFS[stage];
        const match = stageTradeOffs.find(t => t.trigger === trigger) || stageTradeOffs[0];
        return { gain: match.gain, loss: match.loss };
    }

    private generateRationale(state: CFOState): string {
        const s = state.summary;
        if (s.runwayMonths < 3) return 'Runway is critically low; survival takes priority over growth.';
        if (s.netBurn / s.monthlyRevenue > 1.5) return 'Burn is outpacing revenue significantly, reducing financial stability.';
        if (s.revenueTrend === 'declining') return 'Declining revenue trend requires immediate strategic auditing.';
        return 'Current financial structure indicates opportunities for capital allocation optimization.';
    }

    private generateConsequence(metrics: any, stage: StartupStage): { consequence: string; timeframe?: string; confidence: 'high' | 'medium' | 'low' } {
        const { runwayMonths } = metrics;
        if (stage === 'survival') {
            return {
                consequence: 'Runway likely drops below operational minimums, risking insolvency.',
                timeframe: `~${Math.max(1, Math.floor(runwayMonths))} months`,
                confidence: 'high'
            };
        }
        if (stage === 'stabilize') {
            return {
                consequence: 'You risk scaling on unstable unit economics, reducing capital efficiency.',
                timeframe: 'next 1–2 quarters',
                confidence: 'medium'
            };
        }
        if (stage === 'growth') {
            return {
                consequence: 'Under-investment may lead to significant market share loss to competitors.',
                timeframe: 'next 3–6 months',
                confidence: 'medium'
            };
        }
        return { consequence: 'Financial inefficiencies may compound, reducing future scaling potential.', confidence: 'low' };
    }

    private generateAlternative(decision: Decision, metrics: any, stage: StartupStage): AlternativeAnalysis {
        const consequenceData = this.generateConsequence(metrics, stage);
        
        if (decision.decisionKey === 'RUNWAY_SURVIVAL' || decision.title.includes('Burn')) {
            return {
                option: 'Maintain current spending levels to preserve growth speed',
                whyRejected: 'Revenue growth is not compounding fast enough to offset burn before runway exhaustion.',
                riskLevel: 'high',
                ...consequenceData
            };
        }
        if (decision.decisionKey === 'STABILIZE_DATA' || decision.title.includes('Stabilization')) {
            return {
                option: 'Proceed with aggressive growth experiments immediately',
                whyRejected: 'Low data confidence increases the risk of scaling inefficient channels.',
                riskLevel: 'medium',
                ...consequenceData
            };
        }
        if (stage === 'growth') {
            return {
                option: 'Stay conservative and maintain large cash buffer',
                whyRejected: 'Excessive caution in a growth phase allows competitors to capture market momentum first.',
                riskLevel: 'medium',
                ...consequenceData
            };
        }

        return {
            option: 'Maintain current operational strategy',
            whyRejected: 'Ongoing metrics indicate an opportunity for optimization that will be lost without action.',
            riskLevel: 'medium',
            ...consequenceData
        };
    }

    private createDecision(params: Partial<Decision> & { key: string }, urgencyValue: number, impactValue: number): Decision {
        const id = crypto.createHash('md5').update(params.key).digest('hex').substring(0, 8);
        const decisionHash = crypto.createHash('md5')
            .update(`${params.key}|${params.status}|${params.message}`)
            .digest('hex');

        const impactScore = Math.min(100, (impactValue / 12) * 100);
        const confidenceScore = params.confidence?.score || 80;
        const stabilityScore = params.stability === 'stable' ? 100 : 50;
        
        const priorityScore = (impactScore * 0.4) + (urgencyValue * 0.3) + (confidenceScore * 0.2) + (stabilityScore * 0.1);

        const reversibility = this.getReversibility(params.key);
        const impactLine = this.getImpactLine(params.key, impactValue);

        return {
            id,
            decisionKey: params.key,
            decisionHash,
            priorityScore,
            status: 'NEW', 
            executionPlan: [],
            reversibility,
            impactLine,
            ...params
        } as Decision;
    }

    private getReversibility(key: string): 'high' | 'medium' | 'low' {
        if (key.includes('SAAS') || key.includes('DATA') || key.includes('SUBSCRIPTION')) return 'high';
        if (key.includes('MARKETING') || key.includes('STRATEGIC')) return 'medium';
        if (key.includes('HIRING') || key.includes('SURVIVAL') || key.includes('FUNDRAISE')) return 'low';
        return 'medium';
    }

    private getImpactLine(key: string, impactValue: number): string {
        if (impactValue === 0) return 'Strategic realignment';
        if (key.includes('RUNWAY') || key.includes('SURVIVAL')) return `+${(impactValue * 30.4).toFixed(0)} days runway`;
        if (key.includes('BURN')) return `Burn reduced by ${(impactValue * 100).toFixed(0)}%`; 
        return `+${impactValue.toFixed(1)} months runway`;
    }

    private getExecutionPlan(key: string, state: CFOState, context?: string): ExecutionTask[] {
        switch(key) {
            case 'RUNWAY_SURVIVAL':
                return [
                    { task: "Identify non-essential headcount adjustment", completed: false, impact: "Survival" },
                    { task: "Cancel all non-essential growth tools", completed: false, impact: "+0.4 mo" },
                    { task: "Freeze marketing spend", completed: false, impact: "+0.8 mo" }
                ];
            case 'FUNDRAISE_MANDATE':
                return [
                    { task: "Update investor deck", completed: false, impact: "Context" },
                    { task: "List top 10 target investors", completed: false, impact: "+6 mo" }
                ];
            default:
                return [{ task: "Review financial impact in simulator", completed: false, impact: "Visual" }];
        }
    }

    private calculateStability(state: CFOState, snapshots: any[]): 'stable' | 'volatile' {
        if (snapshots.length < 2) return 'stable';
        const currentRunway = state.summary.runwayMonths;
        const previousRunway = snapshots[0]?.state?.summary?.runwayMonths;
        if (previousRunway && Math.abs(previousRunway - currentRunway) > 1.5) return 'volatile';
        return 'stable';
    }

    private getConfidenceLabel(score: number): 'Low' | 'Moderate' | 'High' {
        if (score >= 80) return 'High';
        if (score >= 60) return 'Moderate';
        return 'Low';
    }

    private calculateGlobalUrgency(runway: number): DecisionOutput['urgency'] {
        if (runway < 3) return 'critical';
        if (runway < 6) return 'high';
        return 'medium';
    }

    private fmtAmt(n: number): string {
        if (Math.abs(n) >= 100000) return `${(Math.abs(n) / 100000).toFixed(1)}L`;
        if (Math.abs(n) >= 1000) return `${(Math.abs(n) / 1000).toFixed(1)}K`;
        return `${Math.round(Math.abs(n))}`;
    }
}
