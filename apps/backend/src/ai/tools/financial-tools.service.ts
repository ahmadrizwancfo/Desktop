import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinancialMath } from '../../common/math/financial-math.util';
import { CashflowTimelineService } from '../../cfo-engine/cashflow-timeline.service';
import { CanonicalFinancialEngine } from '../../kernel/canonical-financial-engine';

export interface FinancialSummaryResult {
    organizationId: string;
    cashInBank: string;
    monthlyExpenses: string;
    monthlyRevenue: string;
    netBurn: string;
    runwayMonths: string;
    isSustainable: boolean;
    computedAt: string;
}

export interface RunwaySimulationResult {
    organizationId: string;
    baseRunwayMonths: string;
    simulatedRunwayMonths: string;
    runwayDeltaMonths: string;
    simulatedNetBurn: string;
    headcountDelta: number;
    marketingSpendDelta: number;
    explanation: string;
}

export interface DecisionV2SimulationResult {
    organizationId: string;
    baseZeroCashDate: string | null;
    formattedBaseZeroCashDate: string | null;
    simulatedZeroCashDate: string | null;
    formattedSimulatedZeroCashDate: string | null;
    daysShift: number;
    simulatedNetBurn: string;
    explanation: string;
}

export interface AnomalyDetectionResult {
    organizationId: string;
    anomalyCount: number;
    anomalies: Array<{
        type: 'EXPENSE_SPIKE' | 'GHOST_LIABILITY' | 'OVERDUE_INVOICE' | 'BURN_ACCELERATION';
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
        description: string;
        actionRequired: string;
    }>;
}

import { SimulationPlatformService } from '../../intelligence/simulation/simulation-platform.service';
import { CanonicalPrismaAdapter } from '../../intelligence/adapters/canonical-prisma.adapter';
import { SimulationDecisionType } from '../../intelligence/simulation/domain/simulation.types';

@Injectable()
export class FinancialToolsService {
    private readonly logger = new Logger(FinancialToolsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => CashflowTimelineService))
        private readonly cashflowTimelineService: CashflowTimelineService,
        private readonly simulationPlatform: SimulationPlatformService,
        private readonly prismaAdapter: CanonicalPrismaAdapter,
    ) {}

    /**
     * Tool 1: get_financial_summary
     * Computes deterministic financial metrics using exact DB aggregations & FinancialMath.
     */
    async get_financial_summary(organizationId: string): Promise<FinancialSummaryResult> {
        this.logger.log(`Tool Execution: get_financial_summary for Org ${organizationId}`);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true, balance: true },
        });

        const accountIds = bankAccounts.map(a => a.id);
        const cashInBankDecimal = FinancialMath.sum(bankAccounts.map(a => a.balance));

        if (accountIds.length === 0) {
            return {
                organizationId,
                cashInBank: '0.00',
                monthlyExpenses: '0.00',
                monthlyRevenue: '0.00',
                netBurn: '0.00',
                runwayMonths: '999.00',
                isSustainable: true,
                computedAt: now.toISOString(),
            };
        }

        const txAggregates = await this.prisma.transaction.groupBy({
            by: ['type'],
            where: {
                bankAccountId: { in: accountIds },
                date: { gte: thirtyDaysAgo },
                deletedAt: null,
            },
            _sum: { amount: true },
        });

        const expDecimal = txAggregates.find(a => a.type === 'EXPENSE')?._sum?.amount ?? 0;
        const revDecimal = txAggregates.find(a => a.type === 'INCOME')?._sum?.amount ?? 0;

        const monthlyExpenses = FinancialMath.toString(expDecimal);
        const monthlyRevenue = FinancialMath.toString(revDecimal);
        const netBurn = FinancialMath.netBurn(expDecimal, revDecimal);
        const runwayMonths = FinancialMath.runwayMonths(cashInBankDecimal, netBurn);
        const isSustainable = FinancialMath.toDecimal(netBurn).isZero();

        return {
            organizationId,
            cashInBank: FinancialMath.toString(cashInBankDecimal),
            monthlyExpenses,
            monthlyRevenue,
            netBurn,
            runwayMonths,
            isSustainable,
            computedAt: now.toISOString(),
        };
    }

    /**
     * Tool 2: simulate_runway
     * Deterministically calculates simulated runway based on headcount / spend deltas.
     */
    async simulate_runway(
        organizationId: string,
        headcountDelta: number = 0,
        marketingSpendDelta: number = 0,
        avgSalaryPerHead: number = 100000
    ): Promise<RunwaySimulationResult> {
        this.logger.log(`Tool Execution: simulate_runway for Org ${organizationId} [Headcount: ${headcountDelta}, Marketing: ${marketingSpendDelta}]`);

        const summary = await this.get_financial_summary(organizationId);

        const currentBurnDecimal = FinancialMath.toDecimal(summary.netBurn);
        const cashDecimal = FinancialMath.toDecimal(summary.cashInBank);

        const addedSalaryExpenses = FinancialMath.toDecimal(headcountDelta).times(avgSalaryPerHead);
        const addedMarketingExpenses = FinancialMath.toDecimal(marketingSpendDelta);
        const totalAddedExpenses = addedSalaryExpenses.plus(addedMarketingExpenses);

        const newBurnDecimal = currentBurnDecimal.plus(totalAddedExpenses);
        const simulatedBurn = newBurnDecimal.isPositive() ? newBurnDecimal : FinancialMath.toDecimal(0);

        const baseRunway = parseFloat(summary.runwayMonths);
        const simRunwayRes = CanonicalFinancialEngine.calculateRunway(parseFloat(summary.cashInBank), newBurnDecimal.toNumber());
        const simulatedRunway = simRunwayRes.runwayMonths;

        const delta = (simulatedRunway - baseRunway).toFixed(2);

        return {
            organizationId,
            baseRunwayMonths: summary.runwayMonths,
            simulatedRunwayMonths: String(simulatedRunway),
            runwayDeltaMonths: delta,
            simulatedNetBurn: FinancialMath.toString(simulatedBurn),
            headcountDelta,
            marketingSpendDelta,
            explanation: `Adding ${headcountDelta} team members and adjusting marketing by ₹${marketingSpendDelta} changes runway by ${delta} months.`,
        };
    }

    /**
     * Tool 3: simulate_decision_v2
     * Executes purely via Simulation Isolation Layer (generate90DayProjectionScenario).
     * Zero mutations, zero Redis writes, zero events emitted.
     */
    async simulate_decision_v2(
        organizationId: string,
        headcountDelta: number = 0,
        marketingSpendDelta: number = 0,
        newContractInflow: number = 0,
        avgSalaryPerHead: number = 100000
    ): Promise<DecisionV2SimulationResult> {
        this.logger.log(`Tool Execution: simulate_decision_v2 for Org ${organizationId} via Isolated Scenario Engine`);

        // Fetch Base Projection
        const baseProjection = await this.cashflowTimelineService.getProjection(organizationId);

        // Delegate execution strictly to Simulation Isolation Layer
        const { simulatedProjection, daysShift, diffSummary } = this.cashflowTimelineService.generate90DayProjectionScenario({
            baseProjection,
            overrides: {
                headcountDelta,
                marketingSpendDelta,
                newContractInflow,
                avgSalaryPerHead,
            },
        });

        const summary = await this.get_financial_summary(organizationId);
        const currentBurnDecimal = FinancialMath.toDecimal(summary.netBurn);
        const addedSalaryExpenses = FinancialMath.toDecimal(headcountDelta).times(avgSalaryPerHead);
        const addedMarketingExpenses = FinancialMath.toDecimal(marketingSpendDelta);
        const addedInflow = FinancialMath.toDecimal(newContractInflow);
        const newBurnDecimal = currentBurnDecimal.plus(addedSalaryExpenses).plus(addedMarketingExpenses).minus(addedInflow);

        return {
            organizationId,
            baseZeroCashDate: baseProjection.zeroCashDate,
            formattedBaseZeroCashDate: baseProjection.formattedZeroCashDate,
            simulatedZeroCashDate: simulatedProjection.zeroCashDate,
            formattedSimulatedZeroCashDate: simulatedProjection.formattedZeroCashDate,
            daysShift,
            simulatedNetBurn: FinancialMath.toString(newBurnDecimal),
            explanation: diffSummary,
        };
    }

    /**
     * Tool 4: detect_anomalies
     * Scans for high-burn risk, unpaid liabilities, and overdue receivables.
     */
    async detect_anomalies(organizationId: string): Promise<AnomalyDetectionResult> {
        this.logger.log(`Tool Execution: detect_anomalies for Org ${organizationId}`);

        const anomalies: AnomalyDetectionResult['anomalies'] = [];
        const summary = await this.get_financial_summary(organizationId);

        const runwayFloat = parseFloat(summary.runwayMonths);
        if (runwayFloat < 3.0 && !summary.isSustainable) {
            anomalies.push({
                type: 'BURN_ACCELERATION',
                severity: 'CRITICAL',
                description: `Runway has dropped to ${summary.runwayMonths} months (below 90-day safety zone).`,
                actionRequired: 'Initiate emergency burn reduction or unlock bridge financing immediately.',
            });
        }

        const pendingTaxes = await this.prisma.statutoryLiability.findMany({
            where: { organizationId, status: 'PENDING' }
        });
        if (pendingTaxes.length > 0) {
            const taxTotal = FinancialMath.sum(pendingTaxes.map(t => t.amount));
            anomalies.push({
                type: 'GHOST_LIABILITY',
                severity: 'HIGH',
                description: `Detected ${pendingTaxes.length} pending statutory tax liabilities totaling ₹${taxTotal}.`,
                actionRequired: 'Reserve statutory tax buffer to prevent GST/TDS late interest penalties.',
            });
        }

        const overdueCount = await this.prisma.invoice.count({
            where: { organizationId, status: 'OVERDUE', deletedAt: null }
        });
        if (overdueCount > 0) {
            anomalies.push({
                type: 'OVERDUE_INVOICE',
                severity: 'MEDIUM',
                description: `Detected ${overdueCount} overdue invoices pending collection.`,
                actionRequired: 'Send automatic payment reminders to customer accounts.',
            });
        }

        return {
            organizationId,
            anomalyCount: anomalies.length,
            anomalies,
        };
    }

    /**
     * Tool 5: simulate_business_decision
     * Deterministically executes Phase 7 Decision Simulation Engine.
     */
    async simulate_business_decision(
        organizationId: string,
        decisionType: SimulationDecisionType,
        value: number,
        description?: string,
        params?: Record<string, any>
    ) {
        this.logger.log(`Tool Execution: simulate_business_decision [Type: ${decisionType}, Value: ${value}] for Org ${organizationId}`);
        const baselineParams = await this.prismaAdapter.hydrateFinancialState(organizationId);
        return this.simulationPlatform.runSimulation({
            organizationId,
            decision: {
                type: decisionType,
                value,
                description,
                params: params || {},
            },
            baselineParams,
        });
    }
}
