import { Module } from '@nestjs/common';
import { FinancialProcessingPipelineService } from './financial-processing-pipeline.service';
import { IndiaTaxRulesEngine } from './india-tax-rules.engine';
import { ValidationStage } from './stages/validation-stage.service';
import { NormalizationStage } from './stages/normalization-stage.service';
import { EnrichmentStage } from './stages/enrichment-stage.service';
import { DuplicateDetectionStage } from './stages/duplicate-detection-stage.service';
import { PersistencePreparationStage } from './stages/persistence-preparation-stage.service';
import { EventPreparationStage } from './stages/event-preparation-stage.service';

@Module({
  providers: [
    IndiaTaxRulesEngine,
    ValidationStage,
    NormalizationStage,
    EnrichmentStage,
    DuplicateDetectionStage,
    PersistencePreparationStage,
    EventPreparationStage,
    FinancialProcessingPipelineService,
  ],
  exports: [
    FinancialProcessingPipelineService,
    IndiaTaxRulesEngine,
    ValidationStage,
    NormalizationStage,
    EnrichmentStage,
    DuplicateDetectionStage,
    PersistencePreparationStage,
    EventPreparationStage,
  ],
})
export class PipelineModule {}
