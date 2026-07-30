import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialFact } from '../domain/financial-fact.schema';
import { FinancialMetric } from '../domain/financial-metric.schema';
import { FinancialEvent } from '../domain/financial-event.schema';

export type IntelligenceBusTopic =
  | 'intelligence.fact.published'
  | 'intelligence.metric.updated'
  | 'intelligence.event.created';

export interface IntelligenceBusPayload<T> {
  topic: IntelligenceBusTopic;
  organizationId: string;
  timestamp: string;
  data: T;
}

@Injectable()
export class IntelligenceBusService {
  private readonly logger = new Logger(IntelligenceBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Publish a newly derived Financial Fact onto the Intelligence Bus.
   */
  publishFact(fact: FinancialFact): void {
    const payload: IntelligenceBusPayload<FinancialFact> = {
      topic: 'intelligence.fact.published',
      organizationId: fact.organizationId,
      timestamp: fact.timestamp.toISOString(),
      data: fact,
    };
    this.eventEmitter.emit('intelligence.fact.published', payload);
    this.logger.log(`[IntelligenceBus] Published Fact [${fact.factType}] for Org ${fact.organizationId}`);
  }

  /**
   * Publish updated Financial Metric onto the Intelligence Bus.
   */
  publishMetric(metric: FinancialMetric): void {
    const payload: IntelligenceBusPayload<FinancialMetric> = {
      topic: 'intelligence.metric.updated',
      organizationId: metric.organizationId,
      timestamp: metric.timestamp.toISOString(),
      data: metric,
    };
    this.eventEmitter.emit('intelligence.metric.updated', payload);
    this.logger.log(`[IntelligenceBus] Published Metric [${metric.metricKey}] for Org ${metric.organizationId}`);
  }

  /**
   * Publish a recorded Financial Event onto the Intelligence Bus.
   */
  publishEvent(event: FinancialEvent): void {
    const payload: IntelligenceBusPayload<FinancialEvent> = {
      topic: 'intelligence.event.created',
      organizationId: event.organizationId,
      timestamp: event.timestamp.toISOString(),
      data: event,
    };
    this.eventEmitter.emit('intelligence.event.created', payload);
    this.logger.log(`[IntelligenceBus] Published Event [${event.eventType}] for Org ${event.organizationId}`);
  }

  /**
   * Subscribe to Intelligence Bus topic.
   */
  subscribe<T>(topic: IntelligenceBusTopic, handler: (payload: IntelligenceBusPayload<T>) => void): void {
    this.eventEmitter.on(topic, handler);
    this.logger.log(`[IntelligenceBus] Handler registered for topic: ${topic}`);
  }
}
