import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { FinancialToolsService } from './financial-tools.service';

// ── Zod Tool Parameter Schemas ─────────────────────────────────────────────

export const SimulateRunwayInputSchema = z.object({
    organizationId: z.string().uuid(),
    headcountDelta: z.number().int().default(0),
    marketingSpendDelta: z.number().default(0),
    avgSalaryPerHead: z.number().default(100000),
});

export const SimulateDecisionV2InputSchema = z.object({
    organizationId: z.string().uuid(),
    headcountDelta: z.number().int().default(0),
    marketingSpendDelta: z.number().default(0),
    newContractInflow: z.number().default(0),
    avgSalaryPerHead: z.number().default(100000),
});

export const DetectAnomaliesInputSchema = z.object({
    organizationId: z.string().uuid(),
});

export const GetFinancialSummaryInputSchema = z.object({
    organizationId: z.string().uuid(),
});

export const SimulateBusinessDecisionInputSchema = z.object({
    organizationId: z.string().uuid(),
    decisionType: z.enum([
        'HIRING',
        'SALARY_CHANGE',
        'EXPENSE_REDUCTION',
        'MARKETING_SPEND',
        'PRICING',
        'COLLECTIONS_IMPROVEMENT',
        'VENDOR_PAYMENT_TERMS',
        'DEBT',
        'EQUITY_FUNDING',
    ]),
    value: z.number(),
    description: z.string().optional(),
    params: z.record(z.any()).optional().default({}),
});

@Injectable()
export class CfoToolRegistryService {
    private readonly logger = new Logger(CfoToolRegistryService.name);

    constructor(private readonly toolsService: FinancialToolsService) {}

    /**
     * Executes a tool with strict Zod parameter validation.
     */
    async executeTool(toolName: string, params: any): Promise<any> {
        this.logger.log(`Tool Registry executing tool "${toolName}"`);

        switch (toolName) {
            case 'get_financial_summary': {
                const validated = GetFinancialSummaryInputSchema.parse(params);
                return await this.toolsService.get_financial_summary(validated.organizationId);
            }
            case 'simulate_runway': {
                const validated = SimulateRunwayInputSchema.parse(params);
                return await this.toolsService.simulate_runway(
                    validated.organizationId,
                    validated.headcountDelta,
                    validated.marketingSpendDelta,
                    validated.avgSalaryPerHead
                );
            }
            case 'simulate_decision_v2': {
                const validated = SimulateDecisionV2InputSchema.parse(params);
                return await this.toolsService.simulate_decision_v2(
                    validated.organizationId,
                    validated.headcountDelta,
                    validated.marketingSpendDelta,
                    validated.newContractInflow,
                    validated.avgSalaryPerHead
                );
            }
            case 'simulate_business_decision': {
                const validated = SimulateBusinessDecisionInputSchema.parse(params);
                return await this.toolsService.simulate_business_decision(
                    validated.organizationId,
                    validated.decisionType as any,
                    validated.value,
                    validated.description,
                    validated.params
                );
            }
            case 'detect_anomalies': {
                const validated = DetectAnomaliesInputSchema.parse(params);
                return await this.toolsService.detect_anomalies(validated.organizationId);
            }
            default:
                throw new BadRequestException(`Unknown tool name: ${toolName}`);
        }
    }

    /**
     * Returns JSON Tool Declarations for Gemini Function Calling.
     */
    getToolDeclarations() {
        return [
            {
                name: 'get_financial_summary',
                description: 'Fetch real-time cash balance, burn rate, revenue, and runway.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        organizationId: { type: 'STRING', description: 'Organization UUID' },
                    },
                    required: ['organizationId'],
                },
            },
            {
                name: 'simulate_runway',
                description: 'Simulate changes in team headcount or ad spend on company runway.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        organizationId: { type: 'STRING' },
                        headcountDelta: { type: 'INTEGER', description: 'Number of people to hire (+) or layoff (-)' },
                        marketingSpendDelta: { type: 'NUMBER', description: 'Monthly ad spend change (+/-)' },
                        avgSalaryPerHead: { type: 'NUMBER', description: 'Average monthly salary per head' },
                    },
                    required: ['organizationId'],
                },
            },
            {
                name: 'simulate_business_decision',
                description: 'Deterministically simulate financial decision impacts across 10 business systems (Hiring, Pricing, Expense Cut, Debt, Equity, DSO, DPO).',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        organizationId: { type: 'STRING' },
                        decisionType: {
                            type: 'STRING',
                            description: 'Type of decision: HIRING, SALARY_CHANGE, EXPENSE_REDUCTION, MARKETING_SPEND, PRICING, COLLECTIONS_IMPROVEMENT, VENDOR_PAYMENT_TERMS, DEBT, EQUITY_FUNDING',
                        },
                        value: { type: 'NUMBER', description: 'Numeric value of decision (e.g. 5 headcount, 15% price, ₹10L funding)' },
                        description: { type: 'STRING', description: 'User rationale description' },
                    },
                    required: ['organizationId', 'decisionType', 'value'],
                },
            },
            {
                name: 'simulate_decision_v2',
                description: 'Simulate 90-day daily cashflow timeline shifts returning exact zero-cash dates.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        organizationId: { type: 'STRING' },
                        headcountDelta: { type: 'INTEGER' },
                        marketingSpendDelta: { type: 'NUMBER' },
                        newContractInflow: { type: 'NUMBER' },
                        avgSalaryPerHead: { type: 'NUMBER' },
                    },
                    required: ['organizationId'],
                },
            },
            {
                name: 'detect_anomalies',
                description: 'Detect high-burn alerts, overdue invoices, and ghost statutory tax liabilities.',
                parameters: {
                    type: 'OBJECT',
                    properties: {
                        organizationId: { type: 'STRING' },
                    },
                    required: ['organizationId'],
                },
            },
        ];
    }
}
