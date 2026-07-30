import { Injectable, Logger } from '@nestjs/common';
import { ValidationStage } from './stages/validation-stage.service';
import { NormalizationStage } from './stages/normalization-stage.service';
import { EnrichmentStage } from './stages/enrichment-stage.service';
import { DuplicateDetectionStage } from './stages/duplicate-detection-stage.service';
import { PersistencePreparationStage } from './stages/persistence-preparation-stage.service';
import { EventPreparationStage } from './stages/event-preparation-stage.service';
import { CanonicalTransaction } from '../domain/canonical-transaction.schema';
import { PipelineProcessingResult, PipelineMetrics } from './pipeline-types.interface';

@Injectable()
export class FinancialProcessingPipelineService {
  private readonly logger = new Logger(FinancialProcessingPipelineService.name);

  private metrics: PipelineMetrics = {
    totalProcessed: 0,
    totalSuccess: 0,
    validationFailures: 0,
    normalizationErrors: 0,
    duplicatesDetected: 0,
    quarantinedRecords: 0,
    avgLatencyMs: 0,
    successRatePercent: 100,
  };

  constructor(
    private readonly validationStage: ValidationStage,
    private readonly normalizationStage: NormalizationStage,
    private readonly enrichmentStage: EnrichmentStage,
    private readonly duplicateDetectionStage: DuplicateDetectionStage,
    private readonly persistencePrepStage: PersistencePreparationStage,
    private readonly eventPrepStage: EventPreparationStage,
  ) {}

  /**
   * Process a batch of raw/canonical transactions through the deterministic 6-stage pipeline.
   */
  processTransactionBatch(
    rawItems: any[],
    existingTransactions: CanonicalTransaction[] = []
  ): PipelineProcessingResult<CanonicalTransaction> {
    const startTime = Date.now();
    const processedItems: CanonicalTransaction[] = [];
    const quarantinedItems: Array<{ payload: any; reason: string }> = [];

    let validCount = 0;
    let normalizedCount = 0;
    let enrichedCount = 0;
    let duplicateCount = 0;

    for (const item of rawItems) {
      this.metrics.totalProcessed++;

      // STAGE 1: VALIDATION
      const valRes = this.validationStage.validateTransaction(item);
      if (!valRes.success || valRes.quarantined) {
        this.metrics.validationFailures++;
        this.metrics.quarantinedRecords++;
        quarantinedItems.push({
          payload: item,
          reason: valRes.quarantineReason || 'Validation stage failed',
        });
        continue;
      }
      validCount++;

      // STAGE 2: NORMALIZATION
      const normRes = this.normalizationStage.normalizeTransaction(valRes.data);
      if (!normRes.success) {
        this.metrics.normalizationErrors++;
        this.metrics.quarantinedRecords++;
        quarantinedItems.push({
          payload: item,
          reason: normRes.error || 'Normalization stage failed',
        });
        continue;
      }
      normalizedCount++;

      // STAGE 3: ENRICHMENT
      const enrichRes = this.enrichmentStage.enrichTransaction(normRes.data);
      if (!enrichRes.success) {
        quarantinedItems.push({
          payload: item,
          reason: enrichRes.error || 'Enrichment stage failed',
        });
        continue;
      }
      enrichedCount++;

      // STAGE 4: DUPLICATE DETECTION
      const dupRes = this.duplicateDetectionStage.detectDuplicates(
        enrichRes.data,
        existingTransactions.concat(processedItems)
      );

      if (dupRes.isDuplicate) {
        this.metrics.duplicatesDetected++;
        duplicateCount++;
        this.logger.log(`Skipped duplicate transaction: ${dupRes.reason}`);
        continue; // Skip duplicate from final write batch
      }

      // STAGE 5: PERSISTENCE PREPARATION
      this.persistencePrepStage.prepareTransaction(dupRes.data);

      // STAGE 6: EVENT PREPARATION
      this.eventPrepStage.prepareTransactionEvents(dupRes.data);

      processedItems.push(dupRes.data);
      this.metrics.totalSuccess++;
    }

    const executionTimeMs = Date.now() - startTime;
    this.updateMetrics(executionTimeMs);

    this.logger.log(
      `Pipeline Execution Complete: [In: ${rawItems.length} | Valid: ${validCount} | Normal: ${normalizedCount} | Enriched: ${enrichedCount} | Dups: ${duplicateCount} | Quarantined: ${quarantinedItems.length}] (${executionTimeMs}ms)`
    );

    return {
      success: true,
      processedCount: rawItems.length,
      validCount,
      normalizedCount,
      enrichedCount,
      duplicateCount,
      quarantinedCount: quarantinedItems.length,
      executionTimeMs,
      items: processedItems,
      quarantinedItems,
    };
  }

  /**
   * Return real-time pipeline metrics for Beta Command Center telemetry.
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(lastLatencyMs: number): void {
    this.metrics.lastRunAt = new Date();
    this.metrics.avgLatencyMs = Math.round(
      (this.metrics.avgLatencyMs * 0.8) + (lastLatencyMs * 0.2)
    );
    if (this.metrics.totalProcessed > 0) {
      this.metrics.successRatePercent = Number(
        ((this.metrics.totalSuccess / this.metrics.totalProcessed) * 100).toFixed(1)
      );
    }
  }
}
