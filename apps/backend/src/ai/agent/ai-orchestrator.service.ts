import { Injectable, Logger } from '@nestjs/common';
import { ContextAggregatorService } from '../rag/context-aggregator.service';
import { CfoToolRegistryService } from '../tools/cfo-tool-registry.service';
import { CfoStructuredDecisionSchema, CfoStructuredDecision } from '../schemas/cfo-decision.schema';
import { FinancialMath } from '../../common/math/financial-math.util';

@Injectable()
export class AiOrchestratorService {
    private readonly logger = new Logger(AiOrchestratorService.name);

    constructor(
        private readonly contextAggregator: ContextAggregatorService,
        private readonly toolRegistry: CfoToolRegistryService,
    ) {}

    /**
     * Main AI Decision Loop with Confidence Gating, Data Source Citations & Exact Zero-Cash Timeline Pinpointing:
     * 1. Aggregates RAG Context + Redis Live State + 90-Day Cashflow Timeline
     * 2. Answers exact zero-cash date questions ("When will I run out of money?")
     * 3. Executes deterministic tools (simulate_decision_v2, detect_anomalies)
     * 4. Validates output against Zod CfoStructuredDecisionSchema
     */
    async generateDecision(params: {
        organizationId: string;
        userQuery?: string;
        headcountDelta?: number;
        marketingSpendDelta?: number;
        newContractInflow?: number;
    }): Promise<CfoStructuredDecision> {
        const { organizationId, userQuery = '', headcountDelta = 0, marketingSpendDelta = 0, newContractInflow = 0 } = params;
        this.logger.log(`AI Orchestrator generating decision for Org ${organizationId}`);

        const reasoningSteps: string[] = [
            `1. Initiated context aggregation for organization ${organizationId}.`,
        ];

        // Step 1: Aggregate Context
        const context = await this.contextAggregator.aggregateContext(organizationId, userQuery);
        const { liveState, cashflowTimeline } = context;

        // Observability & Structured Logging
        this.logger.log(JSON.stringify({
            event: 'ai.query',
            orgId: organizationId,
            tokensUsed: context.tokenUsageEstimate,
            costEstimate: 0.0001,
            toolUsed: userQuery ? 'deterministic_router' : 'default_cfo_position',
        }));

        reasoningSteps.push(`2. Retrieved Redis LiveState (Cash: ₹${liveState?.cashBalance}, Burn: ₹${liveState?.monthlyBurn}).`);
        reasoningSteps.push(`3. Retrieved 90-day Cashflow Timeline (Zero Cash Date: ${cashflowTimeline.formattedZeroCashDate || 'None'}).`);
        reasoningSteps.push(`4. Retrieved ${context.ragResults.length} vector embeddings from pgvector RAG memory.`);

        // Insufficient Data Check
        if (!liveState || (liveState.cashBalance === '0.00' && liveState.monthlyBurn === '0.00' && liveState.monthlyRevenue === '0.00')) {
            reasoningSteps.push('5. Insufficient financial data detected in LiveState.');
            return CfoStructuredDecisionSchema.parse({
                status: 'INSUFFICIENT_DATA',
                domain: 'SURVIVAL',
                severity: 'LOW',
                confidenceScore: 0.30,
                hasStrongRecommendation: false,
                headline: 'Insufficient Financial Data',
                narrative: 'No active bank transactions or financial state records found for this organization. Connect a bank account or import transactions to unlock AI decisions.',
                primaryMetric: {
                    label: 'Data Completeness',
                    value: '0%',
                    trend: 'STABLE',
                },
                actionPlan: [],
                risksIdentified: ['Lack of financial data prevents runway calculations.'],
                dataSources: ['liveState'],
                reasoningSteps,
            });
        }

        const q = userQuery.toLowerCase();

        try {
            // Step 2: Intent Routing for "When will I run out of money?" / Zero Cash Query
            if (q.includes('run out') || q.includes('when') || q.includes('zero cash') || q.includes('out of money') || q.includes('cashout')) {
                reasoningSteps.push(`5. Intent matched [PREDICTIVE_ZERO_CASH_TIMELINE]. Citing exact zeroCashDate...`);

                const confidenceScore = 0.98;
                const zeroDateFormatted = cashflowTimeline.formattedZeroCashDate;

                const headline = zeroDateFormatted
                    ? `You will run out of money on ${zeroDateFormatted}`
                    : `Company is Cash-Flow Sustainable for the next 90 days`;

                const narrative = zeroDateFormatted
                    ? `Based on daily cash projections, expected invoice collections, and recurring opex, your cash balance reaches ₹0 on ${zeroDateFormatted}. Minimum cash point will be ₹${cashflowTimeline.minimumCashPoint.amount} on ${cashflowTimeline.minimumCashPoint.formattedDate}.`
                    : `Your cash balance remains positive through the next 90 days with a minimum cash buffer of ₹${cashflowTimeline.minimumCashPoint.amount} on ${cashflowTimeline.minimumCashPoint.formattedDate}.`;

                return CfoStructuredDecisionSchema.parse({
                    status: 'SUCCESS',
                    domain: 'SURVIVAL',
                    severity: zeroDateFormatted ? 'CRITICAL' : 'LOW',
                    confidenceScore,
                    hasStrongRecommendation: true,
                    headline,
                    narrative,
                    primaryMetric: {
                        label: 'Zero Cash Date',
                        value: zeroDateFormatted || 'Beyond 90 Days',
                        trend: zeroDateFormatted ? 'DETERIORATING' : 'IMPROVING',
                    },
                    actionPlan: zeroDateFormatted ? [
                        {
                            stepNumber: 1,
                            title: `Collect overdue invoices totaling ₹${liveState.receivables}`,
                            actionType: 'COLLECT_RECEIVABLES',
                            expectedBurnImpact: liveState.receivables,
                            timeUrgencyDays: 7,
                            requiresApproval: true,
                        },
                        {
                            stepNumber: 2,
                            title: 'Reduce discretionary monthly subscriptions and non-essential spend',
                            actionType: 'REDUCE_OPEX',
                            expectedBurnImpact: FinancialMath.toString(FinancialMath.toDecimal(liveState.monthlyBurn).times(0.15)),
                            timeUrgencyDays: 14,
                            requiresApproval: false,
                        }
                    ] : [
                        {
                            stepNumber: 1,
                            title: 'Reinvest surplus cash in core growth channels',
                            actionType: 'GROWTH_ALLOCATION',
                            expectedBurnImpact: '0.00',
                            timeUrgencyDays: 30,
                            requiresApproval: true,
                        }
                    ],
                    risksIdentified: zeroDateFormatted ? [`Cash reaches zero on ${zeroDateFormatted}.`] : [],
                    dataSources: ['cashflowTimeline', 'liveState', 'transactions'],
                    reasoningSteps,
                    ghostLiabilitiesTotal: context.pendingTaxTotalAmount,
                    isCrisisMode: !!zeroDateFormatted,
                });
            }

            // Step 3: Intent Routing for Scenario Simulation (simulate_decision_v2)
            if (q.includes('simulate') || q.includes('hire') || q.includes('cut') || headcountDelta !== 0 || marketingSpendDelta !== 0 || newContractInflow !== 0) {
                reasoningSteps.push(`5. Intent matched [SCENARIO_SIMULATION]. Executing simulate_decision_v2...`);
                
                const simResult = await this.toolRegistry.executeTool('simulate_decision_v2', {
                    organizationId,
                    headcountDelta,
                    marketingSpendDelta,
                    newContractInflow,
                });

                const confidenceScore = 0.95;
                const hasStrong = confidenceScore >= 0.70;

                reasoningSteps.push(`6. Simulation complete. Days shift: ${simResult.daysShift} days. Zero Cash Date: ${simResult.formattedSimulatedZeroCashDate || 'Beyond 90 days'}.`);

                return CfoStructuredDecisionSchema.parse({
                    status: 'SUCCESS',
                    domain: headcountDelta !== 0 ? 'HIRING' : 'EFFICIENCY',
                    severity: simResult.daysShift < 0 ? 'HIGH' : 'MEDIUM',
                    confidenceScore,
                    hasStrongRecommendation: hasStrong,
                    headline: simResult.formattedSimulatedZeroCashDate 
                        ? `Simulated Zero Cash Date: ${simResult.formattedSimulatedZeroCashDate}`
                        : `Decision extends runway beyond 90 days`,
                    narrative: simResult.explanation,
                    primaryMetric: {
                        label: 'Zero Cash Date Shift',
                        value: `${simResult.daysShift >= 0 ? '+' : ''}${simResult.daysShift} days`,
                        trend: simResult.daysShift >= 0 ? 'IMPROVING' : 'DETERIORATING',
                    },
                    actionPlan: hasStrong ? [
                        {
                            stepNumber: 1,
                            title: `Adjust hiring plan by ${headcountDelta} seats`,
                            actionType: 'HIRING_PLAN_ADJUSTMENT',
                            expectedBurnImpact: simResult.simulatedNetBurn,
                            timeUrgencyDays: 7,
                            requiresApproval: true,
                        }
                    ] : [],
                    risksIdentified: simResult.daysShift < 0 ? ['Decision accelerates cash exhaustion.'] : [],
                    dataSources: ['cashflowTimeline', 'liveState', 'transactions'],
                    reasoningSteps,
                    ghostLiabilitiesTotal: context.pendingTaxTotalAmount,
                    isCrisisMode: simResult.daysShift < -14,
                });
            }

            if (q.includes('risk') || q.includes('tax') || q.includes('overdue') || context.pendingTaxLiabilitiesCount > 0) {
                reasoningSteps.push(`5. Intent matched [RISK_ANALYSIS]. Executing tool detect_anomalies...`);

                const anomalies = await this.toolRegistry.executeTool('detect_anomalies', { organizationId });
                const hasCritical = anomalies.anomalies.some((a: any) => a.severity === 'CRITICAL');
                const confidenceScore = 0.95;

                return CfoStructuredDecisionSchema.parse({
                    status: 'SUCCESS',
                    domain: 'COMPLIANCE',
                    severity: hasCritical ? 'CRITICAL' : 'HIGH',
                    confidenceScore,
                    hasStrongRecommendation: true,
                    headline: `Detected ${anomalies.anomalyCount} Active Financial Risks`,
                    narrative: anomalies.anomalies.length > 0
                        ? anomalies.anomalies.map((a: any) => `${a.type}: ${a.description}`).join(' | ')
                        : 'All financial metrics and tax liabilities are within normal operating bounds.',
                    primaryMetric: {
                        label: 'Tax & Ghost Exposure',
                        value: `₹${context.pendingTaxTotalAmount}`,
                        trend: context.pendingTaxLiabilitiesCount > 0 ? 'DETERIORATING' : 'STABLE',
                    },
                    actionPlan: anomalies.anomalies.map((a: any, idx: number) => ({
                        stepNumber: idx + 1,
                        title: a.actionRequired,
                        actionType: 'COMPLIANCE_REMITTANCE',
                        expectedBurnImpact: '0.00',
                        timeUrgencyDays: 3,
                        requiresApproval: true,
                    })),
                    risksIdentified: anomalies.anomalies.map((a: any) => a.description),
                    dataSources: ['transactions', 'liveState', 'statutoryLiabilities'],
                    reasoningSteps,
                    ghostLiabilitiesTotal: context.pendingTaxTotalAmount,
                    isCrisisMode: hasCritical,
                });
            }

            // Default Executive CFO Decision
            reasoningSteps.push('5. Evaluating general executive CFO position from Cashflow Timeline & Redis LiveState.');
            const runwayMonthsFloat = parseFloat(liveState.runwayDays > 0 ? (liveState.runwayDays / 30).toFixed(2) : '0');
            const zeroCashText = cashflowTimeline.formattedZeroCashDate ? `Zero cash date is ${cashflowTimeline.formattedZeroCashDate}.` : 'Cash sustainable for 90 days.';

            return CfoStructuredDecisionSchema.parse({
                status: 'SUCCESS',
                domain: 'SURVIVAL',
                severity: runwayMonthsFloat < 3 ? 'CRITICAL' : runwayMonthsFloat < 6 ? 'HIGH' : 'LOW',
                confidenceScore: 0.96,
                hasStrongRecommendation: true,
                headline: cashflowTimeline.formattedZeroCashDate 
                    ? `Zero Cash Date: ${cashflowTimeline.formattedZeroCashDate}`
                    : `Cash-Flow Sustainable (${runwayMonthsFloat} mos runway)`,
                narrative: `Current cash position is ₹${liveState.cashBalance} with a monthly burn of ₹${liveState.monthlyBurn}. ${zeroCashText}`,
                primaryMetric: {
                    label: 'Runway Remaining',
                    value: `${runwayMonthsFloat} mos`,
                    trend: runwayMonthsFloat < 6 ? 'DETERIORATING' : 'STABLE',
                },
                actionPlan: [
                    {
                        stepNumber: 1,
                        title: 'Maintain strict opex controls and review subscription spend',
                        actionType: 'REDUCE_OPEX',
                        expectedBurnImpact: FinancialMath.toString(FinancialMath.toDecimal(liveState.monthlyBurn).times(0.1)),
                        timeUrgencyDays: 14,
                        requiresApproval: false,
                    }
                ],
                risksIdentified: runwayMonthsFloat < 6 ? [`Runway (${runwayMonthsFloat} months) is below 6-month safety margin.`] : [],
                dataSources: ['cashflowTimeline', 'liveState', 'transactions'],
                reasoningSteps,
                ghostLiabilitiesTotal: context.pendingTaxTotalAmount,
                isCrisisMode: runwayMonthsFloat < 3,
            });
        } catch (error: any) {
            this.logger.error(`AI Orchestrator decision error: ${error.message}`);
            reasoningSteps.push(`5. Error caught: ${error.message}`);

            return CfoStructuredDecisionSchema.parse({
                status: 'REVIEW_REQUIRED',
                headline: 'Financial Intelligence Loop Warning',
                narrative: `Decision pipeline warning: ${error.message}`,
                primaryMetric: {
                    label: 'Runway',
                    value: `${Math.round((liveState?.runwayDays || 0) / 30)} mos`,
                    trend: 'STABLE',
                },
                confidenceScore: 0.10,
                hasStrongRecommendation: false,
                dataSources: ['liveState'],
                reasoningSteps,
            });
        }
    }
}
