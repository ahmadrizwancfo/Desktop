import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentParserService } from '../parsing/document-parser.service';
import { EmbeddingRagService } from '../rag/embedding-rag.service';
import { AiOrchestratorService } from '../agent/ai-orchestrator.service';

@Injectable()
export class IntelligencePipelineService {
    private readonly logger = new Logger(IntelligencePipelineService.name);

    constructor(
        private readonly parserService: DocumentParserService,
        private readonly ragService: EmbeddingRagService,
        private readonly orchestratorService: AiOrchestratorService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * Event Pipeline Step 1: OCR Completed -> Trigger Document Parsing
     */
    @OnEvent('ocr.completed')
    async handleOcrCompleted(payload: { organizationId: string; result: any; filename?: string; userId?: string }) {
        this.logger.log(`Pipeline [Step 1]: OCR Completed for Org ${payload.organizationId}. Triggering Zod Document Parsing...`);
        
        const rawText = payload.result?.text || '';
        if (!rawText || rawText.length < 10) {
            this.logger.warn(`Pipeline: Skipping empty OCR text payload.`);
            return;
        }

        // Step 2: Parse OCR Text -> Zod Structured Document
        const parsedDoc = this.parserService.parseOcrText(rawText, payload.filename || 'uploaded_doc');
        this.logger.log(`Pipeline [Step 2]: Document Parsed (Vendor: ${parsedDoc.vendorName}, Total: ₹${parsedDoc.totalAmount})`);

        // Step 3: Save Vector Embedding to pgvector / DB
        const embeddingRecord = await this.ragService.storeEmbedding({
            organizationId: payload.organizationId,
            documentType: 'OCR_DOCUMENT',
            referenceId: parsedDoc.invoiceNumber || `DOC-${Date.now()}`,
            content: `Vendor: ${parsedDoc.vendorName} | Total: ₹${parsedDoc.totalAmount} | Invoice: ${parsedDoc.invoiceNumber}`,
            metadata: {
                vendorName: parsedDoc.vendorName,
                totalAmount: parsedDoc.totalAmount,
                confidenceScore: parsedDoc.confidenceScore,
            },
        });
        this.logger.log(`Pipeline [Step 3]: Vector Embedding Stored (ID: ${embeddingRecord.id})`);

        // Step 4: Trigger AI Orchestrator Insight Generation
        const aiDecision = await this.orchestratorService.generateDecision({
            organizationId: payload.organizationId,
            userQuery: `Analyze new uploaded document from ${parsedDoc.vendorName} amount ₹${parsedDoc.totalAmount}`,
        });
        this.logger.log(`Pipeline [Step 4]: AI Orchestrator Decision Generated (Domain: ${aiDecision.domain})`);

        // Step 5: Emit Event-Driven Push Event for Real-Time SSE Stream Update
        this.eventEmitter.emit('live.state.update', {
            organizationId: payload.organizationId,
            snapshot: {
                type: 'INTELLIGENCE_PIPELINE_COMPLETE',
                document: parsedDoc,
                decision: aiDecision,
                timestamp: new Date().toISOString(),
            },
        });
        this.logger.log(`Pipeline [Step 5]: Emitted SSE live.state.update push event for Org ${payload.organizationId}`);
    }
}
