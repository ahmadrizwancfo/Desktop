import { Injectable, Logger } from '@nestjs/common';
import { FinancialEventStoreService } from './events/financial-event-store.service';
import { MetricsEngineService, FinancialMetricInputParams } from './metrics/metrics-engine.service';
import { FinancialFactsEngineService } from './facts/financial-facts.service';
import { IntelligenceBusService } from './bus/intelligence-bus.service';
import { FinancialEvent } from './domain/financial-event.schema';
import { FinancialMetric, MetricKey } from './domain/financial-metric.schema';
import { FinancialFact } from './domain/financial-fact.schema';

export interface IntelligenceProcessResult {
  organizationId: string;
  recordedEventsCount: number;
  computedMetricsCount: number;
  generatedFactsCount: number;
  metrics: Map<MetricKey, FinancialMetric>;
  facts: FinancialFact[];
  executionTimeMs: number;
}

@Injectable()
export class IntelligencePlatformService {
  private readonly logger = new Logger(IntelligencePlatformService.name);

  constructor(
    private readonly eventStore: FinancialEventStoreService,
    private readonly metricsEngine: MetricsEngineService,
    private readonly factsEngine: FinancialFactsEngineService,
    private readonly intelligenceBus: IntelligenceBusService,
  ) {}

  /**
   * Main Phase 6C1 Pipeline Orchestrator:
   * 1. Records incoming Financial Events into Immutable Event Store
   * 2. Computes 20 standardized metrics in MetricsEngine
   * 3. Evaluates deterministic Financial Facts in FactsEngine
   * 4. Publishes Facts, Metrics, and Events onto Intelligence Bus
   */
  processIntelligence(
    params: FinancialMetricInputParams,
    incomingEvents: any[] = []
  ): IntelligenceProcessResult {
    const startTime = Date.now();
    const { organizationId } = params;

    // Step 1: Record Events
    const recordedEvents: FinancialEvent[] = [];
    for (const rawEvt of incomingEvents) {
      const recorded = this.eventStore.recordEvent(rawEvt);
      recordedEvents.push(recorded);
      this.intelligenceBus.publishEvent(recorded);
    }

    // Step 2: Compute 20 Metrics
    const metricsMap = this.metricsEngine.calculateAllMetrics(params);
    for (const metric of metricsMap.values()) {
      this.intelligenceBus.publishMetric(metric);
    }

    // Step 3: Derive Deterministic Facts
    const orgEvents = this.eventStore.getEventsByOrg(organizationId);
    const facts = this.factsEngine.evaluateFacts(organizationId, orgEvents, metricsMap);
    for (const fact of facts) {
      this.intelligenceBus.publishFact(fact);
    }

    const executionTimeMs = Date.now() - startTime;
    this.logger.log(
      `Intelligence Foundation Processed for Org ${organizationId}: [Events: ${recordedEvents.length} | Metrics: ${metricsMap.size} | Facts: ${facts.length}] (${executionTimeMs}ms)`
    );

    return {
      organizationId,
      recordedEventsCount: recordedEvents.length,
      computedMetricsCount: metricsMap.size,
      generatedFactsCount: facts.length,
      metrics: metricsMap,
      facts,
      executionTimeMs,
    };
  }

  // Getters for downstream module integration
  getEventStore(): FinancialEventStoreService {
    return this.eventStore;
  }

  getMetricsEngine(): MetricsEngineService {
    return this.metricsEngine;
  }

  getFactsEngine(): FinancialFactsEngineService {
    return this.factsEngine;
  }

  getIntelligenceBus(): IntelligenceBusService {
    return this.intelligenceBus;
  }
}
