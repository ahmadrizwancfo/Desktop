import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private subjects = new Map<string, Subject<MessageEvent>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  public getActiveConnectionCount(): number {
    let count = 0;
    for (const subject of this.subjects.values()) {
      if (subject && subject.observed) {
        count += (subject as any).observers ? (subject as any).observers.length : 1;
      }
    }
    return count;
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [orgId, subject] of Array.from(this.subjects.entries())) {
        if (subject.observed) {
          subject.next({
            data: JSON.stringify({
              type: 'HEARTBEAT',
              timestamp: now,
            }),
          } as MessageEvent);
        } else {
          subject.complete();
          this.subjects.delete(orgId);
        }
      }
    }, 5000);
  }

  /**
   * Subscribe to Redis-backed event-driven SSE stream for a specific organization.
   * Zero DB queries executed inside HTTP SSE connection handler.
   */
  subscribe(organizationId: string): Observable<MessageEvent> {
    let subject = this.subjects.get(organizationId);
    if (!subject || subject.closed) {
      subject = new Subject<MessageEvent>();
      this.subjects.set(organizationId, subject);
      this.logger.log(`📡 SSE Event Stream Opened for Org: ${organizationId}`);
    }

    return new Observable<MessageEvent>((subscriber) => {
      const sub = subject!.subscribe(subscriber);
      this.logger.log(`[TELEMETRY] SSE Client Connected (Org: ${organizationId}, Total Connections: ${this.getActiveConnectionCount()})`);

      return () => {
        sub.unsubscribe();
        this.logger.log(`[TELEMETRY] SSE Client Disconnected (Org: ${organizationId})`);
        if (subject && (!subject.observed || ((subject as any).observers && (subject as any).observers.length === 0))) {
          subject.complete();
          this.subjects.delete(organizationId);
        }
      };
    });
  }

  private sendSseEvent(organizationId: string, eventType: string, payload: any) {
    const subject = this.subjects.get(organizationId);
    if (subject && subject.observed) {
      subject.next({
        data: JSON.stringify({
          type: eventType,
          payload,
          timestamp: new Date().toISOString(),
        }),
      } as MessageEvent);
      this.logger.log(`⚡ SSE Push [${eventType}] sent to Org ${organizationId}`);
    }
  }

  /**
   * Pushes real-time Redis-backed OrgLiveState update directly to active SSE connections.
   */
  @OnEvent('live.state.updated')
  handleLiveStateUpdated(payload: { organizationId: string; state: any }) {
    this.sendSseEvent(payload.organizationId, 'LIVE_STATE_UPDATED', payload.state);
  }

  @OnEvent('cashflow.updated')
  handleCashflowUpdated(payload: { organizationId: string; projection: any }) {
    this.sendSseEvent(payload.organizationId, 'CASHFLOW_UPDATED', payload.projection);
  }

  @OnEvent('bank.sync.completed')
  handleBankSyncCompleted(payload: { organizationId: string; syncType: string; jobId?: string }) {
    this.sendSseEvent(payload.organizationId, 'BANK_SYNC_COMPLETED', payload);
  }

  @OnEvent('ai.processing.completed')
  handleAiProcessingCompleted(payload: { organizationId: string; taskType: string; jobId?: string }) {
    this.sendSseEvent(payload.organizationId, 'AI_PROCESSING_COMPLETED', payload);
  }

  @OnEvent('ocr.completed')
  handleOcrCompleted(payload: { organizationId: string; result: any }) {
    this.sendSseEvent(payload.organizationId, 'OCR_COMPLETED', payload);
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const subject of this.subjects.values()) {
      try {
        subject.complete();
      } catch (e) {
        // ignore
      }
    }
    this.subjects.clear();
  }
}
