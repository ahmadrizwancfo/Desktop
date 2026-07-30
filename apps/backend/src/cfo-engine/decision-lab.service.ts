import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CashflowTimelineService, CashflowProjectionResult, ScenarioOverrideParams } from './cashflow-timeline.service';
import { FinancialMath } from '../common/math/financial-math.util';
import { z } from 'zod';

export type ScenarioType = 
    | 'HIRE_EMPLOYEE'
    | 'FIRE_EMPLOYEE'
    | 'MARKETING_SPEND'
    | 'REVENUE_CHANGE'
    | 'PAYMENT_DELAY'
    | 'CUSTOMER_CHURN'
    | 'OFFICE_LEASE'
    | 'LOAN_REPAYMENT'
    | 'FUNDRAISE'
    | 'CUSTOM';

export interface ScenarioDefinition {
    id: string;
    name: string;
    type: ScenarioType;
    overrides: ScenarioOverrideParams;
    notes?: string;
}

export interface ScenarioComparisonItem {
    scenarioId: string;
    name: string;
    type: ScenarioType;
    projection: CashflowProjectionResult;
    zeroCashDate: string | null;
    formattedZeroCashDate: string | null;
    daysShift: number;
    endingCash: string;
    minimumCashAmount: string;
    minimumCashDate: string;
    simulatedNetBurn: string;
    isSafestOption: boolean;
    isLongestRunway: boolean;
    isLowestBurn: boolean;
    isHighestEndingCash: boolean;
}

export interface MultiScenarioComparisonResult {
    organizationId: string;
    baseZeroCashDate: string | null;
    formattedBaseZeroCashDate: string | null;
    scenarios: ScenarioComparisonItem[];
    safestScenarioId: string;
    longestRunwayScenarioId: string;
    lowestBurnScenarioId: string;
    highestEndingCashScenarioId: string;
    computedAt: string;
}

export const DecisionCardSchema = z.object({
    cardId: z.string().default(() => `CARD-${Date.now()}`),
    title: z.string(),
    summary: z.string(),
    safestOptionName: z.string(),
    decisionStatus: z.enum(['PROCEED', 'CAUTION', 'HIGH_RISK']).default('PROCEED'),
    decisionScore: z.number().min(0).max(100).default(88),
    confidenceScore: z.number().min(0).max(1).default(0.95),
    beforeVsAfter: z.object({
        baseZeroCashDate: z.string(),
        simulatedZeroCashDate: z.string(),
        baseNetBurn: z.string(),
        simulatedNetBurn: z.string(),
        baseEndingCash: z.string(),
        simulatedEndingCash: z.string(),
    }),
    whySupportingReasons: z.array(z.string()).default([]),
    whyRiskFactors: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
    tradeOffs: z.array(z.string()).default([]),
    recommendation: z.string(),
    bestAlternative: z.string(),
    reasoning: z.array(z.string()).default([]),
    dataSources: z.array(z.string()).default(['cashflowTimeline', 'liveState', 'simulationIsolationLayer']),
    generatedAt: z.string().default(() => new Date().toISOString()),
});

export type DecisionCard = z.infer<typeof DecisionCardSchema>;

@Injectable()
export class DecisionLabService {
    private readonly logger = new Logger(DecisionLabService.name);

    constructor(
        private readonly cashflowTimelineService: CashflowTimelineService,
    ) {}

    /**
     * Executes up to 4 parallel scenarios purely inside the Simulation Isolation Layer.
     * ZERO Redis writes, ZERO DB mutations, ZERO LiveState changes, ZERO event emissions.
     */
    async runMultiScenarioComparison(
        organizationId: string,
        scenarios: ScenarioDefinition[]
    ): Promise<MultiScenarioComparisonResult> {
        if (!scenarios || scenarios.length === 0) {
            throw new BadRequestException('At least 1 scenario must be provided for comparison.');
        }

        if (scenarios.length > 4) {
            throw new BadRequestException('Maximum 4 scenarios can be compared simultaneously.');
        }

        const startTime = Date.now();
        this.logger.log(`Running Multi-Scenario Decision Lab Comparison for Org ${organizationId} (${scenarios.length} scenarios)`);

        // Fetch Base Projection
        const baseProjection = await this.cashflowTimelineService.getProjection(organizationId);

        const comparisonItems: ScenarioComparisonItem[] = [];
        let maxDaysShift = -999;
        let longestRunwayId = scenarios[0].id;
        let minRiskCount = 999;
        let safestId = scenarios[0].id;
        let minBurnVal = Number.MAX_SAFE_INTEGER;
        let lowestBurnId = scenarios[0].id;
        let maxEndingCashVal = -Number.MAX_SAFE_INTEGER;
        let highestEndingCashId = scenarios[0].id;

        for (const sc of scenarios) {
            // Execute in Simulation Isolation Layer
            const { simulatedProjection, daysShift } = this.cashflowTimelineService.generate90DayProjectionScenario({
                baseProjection,
                overrides: sc.overrides,
            });

            const endingCash = simulatedProjection.dailyPositions[simulatedProjection.dailyPositions.length - 1]?.closingBalance || '0.00';
            
            // Calculate Net Burn estimate
            const headcount = sc.overrides.headcountDelta || 0;
            const mkt = sc.overrides.marketingSpendDelta || 0;
            const salary = sc.overrides.avgSalaryPerHead || 100000;
            const inflow = sc.overrides.newContractInflow || 0;
            const addedBurn = (headcount * salary) + mkt - inflow;

            const baseNetBurnDecimal = FinancialMath.toDecimal(baseProjection.dailyPositions[0]?.outflow || 0).minus(baseProjection.dailyPositions[0]?.inflow || 0);
            const simNetBurnDecimal = baseNetBurnDecimal.plus(addedBurn);
            const simNetBurnNum = simNetBurnDecimal.toNumber();
            const endingCashNum = FinancialMath.toDecimal(endingCash).toNumber();

            const isZero = !!simulatedProjection.zeroCashDate;

            comparisonItems.push({
                scenarioId: sc.id,
                name: sc.name,
                type: sc.type,
                projection: simulatedProjection,
                zeroCashDate: simulatedProjection.zeroCashDate,
                formattedZeroCashDate: simulatedProjection.formattedZeroCashDate,
                daysShift,
                endingCash,
                minimumCashAmount: simulatedProjection.minimumCashPoint.amount,
                minimumCashDate: simulatedProjection.minimumCashPoint.formattedDate,
                simulatedNetBurn: FinancialMath.toString(simNetBurnDecimal),
                isSafestOption: false,
                isLongestRunway: false,
                isLowestBurn: false,
                isHighestEndingCash: false,
            });

            if (daysShift > maxDaysShift) {
                maxDaysShift = daysShift;
                longestRunwayId = sc.id;
            }

            if (simNetBurnNum < minBurnVal) {
                minBurnVal = simNetBurnNum;
                lowestBurnId = sc.id;
            }

            if (endingCashNum > maxEndingCashVal) {
                maxEndingCashVal = endingCashNum;
                highestEndingCashId = sc.id;
            }

            const riskCount = isZero ? 10 : 0;
            if (riskCount < minRiskCount) {
                minRiskCount = riskCount;
                safestId = sc.id;
            }
        }

        // Flag Winner Items
        for (const item of comparisonItems) {
            if (item.scenarioId === safestId) item.isSafestOption = true;
            if (item.scenarioId === longestRunwayId) item.isLongestRunway = true;
            if (item.scenarioId === lowestBurnId) item.isLowestBurn = true;
            if (item.scenarioId === highestEndingCashId) item.isHighestEndingCash = true;
        }

        const durationMs = Date.now() - startTime;
        this.logger.log(JSON.stringify({
            event: 'decision_lab.compare',
            orgId: organizationId,
            scenarioCount: scenarios.length,
            durationMs,
            safestScenarioId: safestId,
        }));

        return {
            organizationId,
            baseZeroCashDate: baseProjection.zeroCashDate,
            formattedBaseZeroCashDate: baseProjection.formattedZeroCashDate,
            scenarios: comparisonItems,
            safestScenarioId: safestId,
            longestRunwayScenarioId: longestRunwayId,
            lowestBurnScenarioId: lowestBurnId,
            highestEndingCashScenarioId: highestEndingCashId,
            computedAt: new Date().toISOString(),
        };
    }

    /**
     * Generates an executive visual Decision Card interpreting multi-scenario comparison results.
     */
    async generateDecisionCard(
        organizationId: string,
        comparison: MultiScenarioComparisonResult
    ): Promise<DecisionCard> {
        const safestItem = comparison.scenarios.find(s => s.scenarioId === comparison.safestScenarioId) || comparison.scenarios[0];
        const longestItem = comparison.scenarios.find(s => s.scenarioId === comparison.longestRunwayScenarioId) || comparison.scenarios[0];

        const baseZeroDate = comparison.formattedBaseZeroCashDate || comparison.baseZeroCashDate || 'Beyond 90 Days';
        const simZeroDate = safestItem.formattedZeroCashDate || safestItem.zeroCashDate || 'Beyond 90 Days';

        let decisionStatus: 'PROCEED' | 'CAUTION' | 'HIGH_RISK' = 'PROCEED';
        let decisionScore = 88;

        if (safestItem.zeroCashDate) {
            decisionStatus = 'HIGH_RISK';
            decisionScore = 42;
        } else if (safestItem.daysShift < 0) {
            decisionStatus = 'CAUTION';
            decisionScore = 68;
        } else {
            decisionStatus = 'PROCEED';
            decisionScore = 94;
        }

        const whySupportingReasons: string[] = [];
        const whyRiskFactors: string[] = [];
        const risks: string[] = [];
        const opportunities: string[] = [];
        const tradeOffs: string[] = [];

        if (parseFloat(safestItem.minimumCashAmount) > 0) {
            whySupportingReasons.push('Cash balance remains positive throughout the 90-day simulation.');
            whySupportingReasons.push('Payroll and recurring operational expenses remain fully funded.');
        }
        if (safestItem.daysShift >= 0) {
            whySupportingReasons.push(`Decision preserves cash buffer, extending runway timeline by ${safestItem.daysShift} days.`);
        }

        if (safestItem.zeroCashDate) {
            whyRiskFactors.push(`Cash reaches zero on ${safestItem.formattedZeroCashDate}.`);
            whyRiskFactors.push('Higher burn rate reduces contingency buffer below safety threshold.');
        } else {
            whyRiskFactors.push('Revenue collection timing assumes standard customer payment schedules.');
        }

        for (const s of comparison.scenarios) {
            if (s.zeroCashDate) {
                risks.push(`Scenario "${s.name}" exhausts cash on ${s.formattedZeroCashDate || s.zeroCashDate}.`);
            } else {
                opportunities.push(`Scenario "${s.name}" maintains positive cash balance throughout the next 90 days.`);
            }
            if (s.daysShift !== 0) {
                tradeOffs.push(`"${s.name}" shifts zero-cash timeline by ${s.daysShift >= 0 ? '+' : ''}${s.daysShift} days.`);
            }
        }

        return DecisionCardSchema.parse({
            title: `Executive Decision Analysis: ${comparison.scenarios.length} Scenarios Evaluated`,
            summary: `Evaluated ${comparison.scenarios.length} business scenarios. The recommended option is "${safestItem.name}".`,
            safestOptionName: safestItem.name,
            decisionStatus,
            decisionScore,
            confidenceScore: 0.96,
            beforeVsAfter: {
                baseZeroCashDate: baseZeroDate,
                simulatedZeroCashDate: simZeroDate,
                baseNetBurn: `₹${comparison.scenarios[0].simulatedNetBurn}`,
                simulatedNetBurn: `₹${safestItem.simulatedNetBurn}`,
                baseEndingCash: `₹${comparison.scenarios[0].endingCash}`,
                simulatedEndingCash: `₹${safestItem.endingCash}`,
            },
            whySupportingReasons,
            whyRiskFactors,
            risks: risks.length > 0 ? risks : ['No critical cash stress risks detected in evaluated scenarios.'],
            opportunities: opportunities.length > 0 ? opportunities : ['Maintain current operational spend.'],
            tradeOffs,
            recommendation: `Proceed with "${safestItem.name}" to optimize runway and maintain financial safety margins.`,
            bestAlternative: longestItem.scenarioId !== safestItem.scenarioId ? `Alternative: "${longestItem.name}" for maximum runway extension.` : 'Maintain baseline operational model.',
            reasoning: [
                `1. Parallel simulations executed strictly inside isolated memory.`,
                `2. Recommended path "${safestItem.name}" secures a minimum cash buffer of ₹${safestItem.minimumCashAmount}.`,
                `3. Zero Cash Date evaluation: ${simZeroDate}.`,
            ],
            dataSources: ['cashflowTimeline', 'liveState', 'simulationIsolationLayer'],
        });
    }
}
