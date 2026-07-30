import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { LiveStateService, OrgLiveState } from '../../cfo-engine/live-state.service';
import { EmbeddingRagService, SimilaritySearchResult } from './embedding-rag.service';
import { CashflowTimelineService, CashflowProjectionResult } from '../../cfo-engine/cashflow-timeline.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FinancialMath } from '../../common/math/financial-math.util';

export interface AggregatedCfoContext {
    organizationId: string;
    liveState: OrgLiveState;
    cashflowTimeline: CashflowProjectionResult;
    ragResults: SimilaritySearchResult[];
    pendingTaxLiabilitiesCount: number;
    pendingTaxTotalAmount: string;
    overdueInvoicesCount: number;
    formattedPromptContext: string;
    tokenUsageEstimate: number;
}

@Injectable()
export class ContextAggregatorService {
    private readonly logger = new Logger(ContextAggregatorService.name);

    constructor(
        private readonly liveStateService: LiveStateService,
        private readonly ragService: EmbeddingRagService,
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => CashflowTimelineService))
        private readonly cashflowTimelineService: CashflowTimelineService,
    ) {}

    /**
     * Aggregates live financial state, 90-day cashflow timeline, vector embeddings, and tax liabilities into prompt context.
     */
    async aggregateContext(organizationId: string, userQuery?: string): Promise<AggregatedCfoContext> {
        this.logger.log(`Aggregating Context for Org ${organizationId}`);

        // 1. Fetch Primary Redis Live State
        const liveState = await this.liveStateService.getState(organizationId);

        // 2. Fetch 90-Day Cashflow Timeline Projection
        const cashflowTimeline = await this.cashflowTimelineService.getProjection(organizationId);

        // 3. Query Vector RAG Embeddings if query is provided
        const ragResults = userQuery 
            ? await this.ragService.searchSimilarity({ organizationId, query: userQuery, limit: 3 })
            : [];

        // 4. Query Pending Tax Liabilities
        const pendingTaxes = await this.prisma.statutoryLiability.aggregate({
            where: { organizationId, status: 'PENDING' },
            _sum: { amount: true },
            _count: { id: true },
        });

        const taxTotal = FinancialMath.toString(pendingTaxes._sum.amount ?? 0);
        const taxCount = pendingTaxes._count.id;

        // 5. Query Overdue Invoices Count
        const overdueCount = await this.prisma.invoice.count({
            where: { organizationId, status: 'OVERDUE', deletedAt: null }
        });

        // 6. Construct Structured Prompt Context for LLM
        const ragText = ragResults.length > 0 
            ? ragResults.map(r => `- [${r.documentType}] ${r.content}`).join('\n')
            : 'None';

        const zeroCashAnswer = cashflowTimeline.formattedZeroCashDate 
            ? `ZERO CASH DATE: ${cashflowTimeline.formattedZeroCashDate} (${cashflowTimeline.zeroCashDate})`
            : `ZERO CASH DATE: Cash-flow sustainable for next 90 days`;

        const formattedPromptContext = `
=== FINANCIAL POSITION (ORG: ${organizationId}) ===
- Cash Balance: ₹${liveState.cashBalance}
- Monthly Net Burn: ₹${liveState.monthlyBurn}/mo
- Monthly Revenue: ₹${liveState.monthlyRevenue}/mo
- Runway Remaining: ${Math.round(liveState.runwayDays / 30)} months (${liveState.runwayDays} days)
- ${zeroCashAnswer}
- Minimum Cash Point: ₹${cashflowTimeline.minimumCashPoint.amount} on ${cashflowTimeline.minimumCashPoint.formattedDate}
- Receivables (Pending Invoices): ₹${liveState.receivables} (${overdueCount} overdue)
- Tax & Ghost Exposure: ₹${taxTotal} (${taxCount} pending statutory filings)

=== SEMANTIC VECTOR RAG CONTEXT ===
${ragText}
`.trim();

        const tokenUsageEstimate = Math.ceil(formattedPromptContext.length / 4);

        return {
            organizationId,
            liveState,
            cashflowTimeline,
            ragResults,
            pendingTaxLiabilitiesCount: taxCount,
            pendingTaxTotalAmount: taxTotal,
            overdueInvoicesCount: overdueCount,
            formattedPromptContext,
            tokenUsageEstimate,
        };
    }
}
