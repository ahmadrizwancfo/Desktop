import { Injectable } from '@nestjs/common';
import { StrategicBusinessMemory, StrategicEventType, StrategicMemoryOutcome } from './interfaces/financial-memory.interface';
import { FinancialReasoningResult } from './interfaces/financial-reasoning.interface';
import { CanonicalFinancialState } from './financial-state-machine.service';
import { PrimaryBusinessIntent } from './interfaces/business-dna.interface';
import { CanonicalFinancialEngine } from './canonical-financial-engine';

export interface RecordMemoryInput {
  organizationId: string;
  eventType: StrategicEventType;
  summary: string;
  triggeringFacts: Record<string, any>;
  reasoningSnapshot: FinancialReasoningResult;
  businessState: CanonicalFinancialState;
  businessIntent: PrimaryBusinessIntent;
  actionsTaken: string[];
  outcome?: StrategicMemoryOutcome;
}

@Injectable()
export class FinancialMemoryEngine {
  private static readonly memoryStore = new Map<string, StrategicBusinessMemory[]>();

  /**
   * Deterministically records a completed strategic business event into Financial Memory.
   */
  public recordMemory(input: RecordMemoryInput): StrategicBusinessMemory {
    const nowIso = new Date().toISOString();
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const memory: StrategicBusinessMemory = {
      id: memoryId,
      organizationId: input.organizationId,
      eventType: input.eventType,
      summary: input.summary,
      triggeringFacts: input.triggeringFacts,
      reasoningSnapshot: input.reasoningSnapshot,
      businessState: input.businessState,
      businessIntent: input.businessIntent,
      actionsTaken: input.actionsTaken,
      outcome: input.outcome || { status: 'PENDING' },
      confidence: input.reasoningSnapshot.confidence,
      temporal: input.reasoningSnapshot.temporal,
      provenance: {
        engineVersion: CanonicalFinancialEngine.KERNEL_VERSION,
        computedAt: nowIso,
        formulaUsed: `FinancialMemoryEngine.recordMemory(${input.eventType})`,
        sourceRecordIds: [memoryId],
        lawsApplied: [],
        confidenceScore: input.reasoningSnapshot.confidence,
      },
      recordedAt: nowIso,
    };

    const existing = FinancialMemoryEngine.memoryStore.get(input.organizationId) || [];
    existing.push(memory);
    FinancialMemoryEngine.memoryStore.set(input.organizationId, existing);

    return memory;
  }

  /**
   * Queries deterministic business memory history for an organization.
   */
  public queryMemories(
    organizationId: string,
    filter?: { eventType?: StrategicEventType; state?: CanonicalFinancialState }
  ): StrategicBusinessMemory[] {
    const orgMemories = FinancialMemoryEngine.memoryStore.get(organizationId) || [];
    return orgMemories.filter(m => {
      if (filter?.eventType && m.eventType !== filter.eventType) return false;
      if (filter?.state && m.businessState !== filter.state) return false;
      return true;
    });
  }

  /**
   * Answers deterministic question: "Have we experienced this event before?"
   */
  public hasExperiencedEvent(organizationId: string, eventType: StrategicEventType): boolean {
    const matches = this.queryMemories(organizationId, { eventType });
    return matches.length > 0;
  }

  /**
   * Returns historical outcomes for a given strategic event type.
   */
  public getHistoricalOutcomes(organizationId: string, eventType: StrategicEventType): StrategicMemoryOutcome[] {
    const matches = this.queryMemories(organizationId, { eventType });
    return matches.map(m => m.outcome);
  }
}
