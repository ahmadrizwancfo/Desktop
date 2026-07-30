import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiMetricsService } from './ai-metrics.service';
import { AiProcessingProcessor } from './ai-processing.processor';
import { DocumentParserService } from './parsing/document-parser.service';
import { EmbeddingRagService } from './rag/embedding-rag.service';
import { ContextAggregatorService } from './rag/context-aggregator.service';
import { FinancialToolsService } from './tools/financial-tools.service';
import { CfoToolRegistryService } from './tools/cfo-tool-registry.service';
import { AiOrchestratorService } from './agent/ai-orchestrator.service';
import { IntelligencePipelineService } from './pipeline/intelligence-pipeline.service';
import { AiFeedbackService } from './feedback/ai-feedback.service';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule,
    IntelligenceModule,
    forwardRef(() => CfoEngineModule),
    BullModule.registerQueue({
      name: 'ai-processing-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    }),
  ],
  providers: [
    AiService,
    AiMetricsService,
    AiProcessingProcessor,
    DocumentParserService,
    EmbeddingRagService,
    ContextAggregatorService,
    FinancialToolsService,
    CfoToolRegistryService,
    AiOrchestratorService,
    IntelligencePipelineService,
    AiFeedbackService,
  ],
  controllers: [AiController],
  exports: [
    AiService,
    AiMetricsService,
    DocumentParserService,
    EmbeddingRagService,
    ContextAggregatorService,
    FinancialToolsService,
    CfoToolRegistryService,
    AiOrchestratorService,
    IntelligencePipelineService,
    AiFeedbackService,
    BullModule,
  ]
})
export class AiModule { }
