import { Injectable, Logger } from '@nestjs/common';
import { FinancialEvent, FinancialEventSchema } from '../domain/financial-event.schema';

@Injectable()
export class FinancialEventStoreService {
  private readonly logger = new Logger(FinancialEventStoreService.name);
  
  // In-memory immutable event store: Map<eventId, FinancialEvent>
  private readonly events = new Map<string, FinancialEvent>();
  // Index by org: Map<organizationId, eventId[]>
  private readonly orgIndex = new Map<string, string[]>();

  /**
   * Append an immutable financial event to the event store.
   * Throws an error if attempting to mutate or duplicate an existing event ID.
   */
  recordEvent(eventInput: any): FinancialEvent {
    const parseResult = FinancialEventSchema.safeParse(eventInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
      throw new Error(`FinancialEvent Validation Error: ${errMsgs}`);
    }

    const event = Object.freeze(parseResult.data); // Enforce runtime immutability

    if (this.events.has(event.eventId)) {
      throw new Error(`Immutable Event Violation: Event with ID ${event.eventId} already exists and cannot be modified.`);
    }

    this.events.set(event.eventId, event);

    const orgEvents = this.orgIndex.get(event.organizationId) || [];
    orgEvents.push(event.eventId);
    this.orgIndex.set(event.organizationId, orgEvents);

    this.logger.log(`Recorded Immutable Financial Event [${event.eventType}] for Org ${event.organizationId} (ID: ${event.eventId})`);
    return event;
  }

  /**
   * Fetch all recorded events for a given organization.
   */
  getEventsByOrg(organizationId: string): ReadonlyArray<FinancialEvent> {
    const eventIds = this.orgIndex.get(organizationId) || [];
    return eventIds.map(id => this.events.get(id)!).filter(Boolean);
  }

  /**
   * Fetch events filtered by eventType for an organization.
   */
  getEventsByType(organizationId: string, eventType: string): ReadonlyArray<FinancialEvent> {
    return this.getEventsByOrg(organizationId).filter(e => e.eventType === eventType);
  }

  /**
   * Fetch events within a specific date range.
   */
  getEventsByTimeframe(organizationId: string, startDate: Date, endDate: Date): ReadonlyArray<FinancialEvent> {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return this.getEventsByOrg(organizationId).filter(e => {
      const tMs = new Date(e.timestamp).getTime();
      return tMs >= startMs && tMs <= endMs;
    });
  }

  /**
   * Total event count.
   */
  getEventCount(organizationId?: string): number {
    if (organizationId) {
      return (this.orgIndex.get(organizationId) || []).length;
    }
    return this.events.size;
  }
}
