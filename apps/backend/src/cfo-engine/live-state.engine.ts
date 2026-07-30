import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

export interface LiveStateSnapshot {
  organizationId: string;
  financialState: any;
  decisions: any[];
  topPriority: any | null;
  actions: any[];
  projectedState: any | null;
  vendorReport: any | null;
  predictiveReport: any | null;
  isPartialState: boolean;
  processingMessage: string | null;
  lastUpdatedAt: number;
  version: number;
}

@Injectable()
export class LiveStateEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveStateEngineService.name);
  private readonly MAX_CACHE_SIZE = 500;

  // In-memory cache store per organizationId
  private liveStateMap = new Map<string, LiveStateSnapshot>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('⚡ LiveStateEngineService initialized — Authoritative In-Memory State Engine ready.');
  }

  public registerOnEvents() {
    this.eventEmitter.on('dashboard.quick_update', (p) => this.handleQuickUpdate(p));
    this.eventEmitter.on('state.partial_updated', (p) => this.handlePartialUpdated(p));
    this.eventEmitter.on('runway.recalculated', (p) => this.handleRunwayRecalculated(p));
    this.eventEmitter.on('decision.generated', (p) => this.handleDecisionGenerated(p));
    this.eventEmitter.on('action.updated', (p) => this.handleActionUpdated(p));
    this.eventEmitter.on('state.reconciled', (p) => this.handleStateReconciled(p));
    this.eventEmitter.on('vendor.breakdown', (p) => this.handleVendorBreakdown(p));
    this.eventEmitter.on('predictive.alert', (p) => this.handlePredictiveAlert(p));
  }

  onModuleDestroy() {
    this.liveStateMap.clear();
    this.logger.log('⚡ LiveStateEngineService destroyed — In-memory state cleared.');
  }

  /**
   * Helper: Inserts entry into liveStateMap enforcing LRU max size
   */
  private setCachedState(organizationId: string, snapshot: LiveStateSnapshot): void {
    if (this.liveStateMap.has(organizationId)) {
      this.liveStateMap.delete(organizationId);
    } else if (this.liveStateMap.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.liveStateMap.keys().next().value;
      if (oldestKey !== undefined) {
        this.liveStateMap.delete(oldestKey);
      }
    }
    this.liveStateMap.set(organizationId, snapshot);
  }

  /**
   * Get latest in-memory snapshot or build fallback from DB
   */
  public async getLiveState(organizationId: string): Promise<LiveStateSnapshot> {
    const cached = this.liveStateMap.get(organizationId);
    if (cached) {
      return cached;
    }
    return await this.hydrateStateFromDb(organizationId);
  }

  /**
   * Fallback hydration from DB (Parallelized < 80ms)
   */
  public async hydrateStateFromDb(organizationId: string): Promise<LiveStateSnapshot> {
    const startTime = Date.now();
    const [state, activeDecisions, actions] = await Promise.all([
      this.prisma.orgFinancialState.findUnique({
        where: { organizationId },
      }),
      this.prisma.activeDecision.findMany({
        where: { organizationId, isActive: true },
        orderBy: { priorityScore: 'desc' },
      }),
      this.prisma.recommendedAction.findMany({
        where: { organizationId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { priorityScore: 'desc' },
      }),
    ]);

    const snapshot: LiveStateSnapshot = {
      organizationId,
      financialState: state || null,
      decisions: activeDecisions,
      topPriority: activeDecisions[0] || null,
      actions,
      projectedState: null,
      vendorReport: null,
      predictiveReport: null,
      isPartialState: state?.isPartialState ?? false,
      processingMessage: null,
      lastUpdatedAt: Date.now(),
      version: state?.version ?? 1,
    };

    this.setCachedState(organizationId, snapshot);
    const duration = Date.now() - startTime;
    this.logger.log(`[TELEMETRY] LiveStateHydration: duration=${duration}ms, orgId=${organizationId}`);
    return snapshot;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISTIC EVENT REDUCER SYSTEM (< 50ms, Zero DB reads during reduction)
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent('dashboard.quick_update')
  handleQuickUpdate(payload: { organizationId: string; deltaTransactions: number }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      isPartialState: true,
      processingMessage: `Ingesting ${payload.deltaTransactions} transactions...`,
    }));
  }

  @OnEvent('state.partial_updated')
  handlePartialUpdated(payload: { organizationId: string; state?: any }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      financialState: payload.state ? payload.state : prev.financialState,
      isPartialState: true,
      processingMessage: 'Recomputing runway & financial metrics...',
    }));
  }

  @OnEvent('runway.recalculated')
  handleRunwayRecalculated(payload: { organizationId: string; runwayDays: number; runwayMonths: number; state?: any }) {
    this.reduceState(payload.organizationId, (prev) => {
      const updatedState = payload.state || {
        ...prev.financialState,
        runwayDays: payload.runwayDays,
        runwayMonths: payload.runwayMonths,
      };
      return {
        ...prev,
        financialState: updatedState,
        isPartialState: true,
        processingMessage: 'Evaluating stateful decision rules...',
      };
    });
  }

  @OnEvent('decision.generated')
  handleDecisionGenerated(payload: {
    organizationId: string;
    activeDecisions: any[];
    topPriority: any;
    projectedState?: any;
    pendingActions?: any[];
  }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      decisions: payload.activeDecisions,
      topPriority: payload.topPriority,
      projectedState: payload.projectedState || prev.projectedState,
      actions: payload.pendingActions || prev.actions,
    }));
  }

  @OnEvent('action.updated')
  handleActionUpdated(payload: { organizationId: string; action: any; status: string }) {
    this.reduceState(payload.organizationId, (prev) => {
      const updatedActions = prev.actions.map((act) =>
        act.id === payload.action.id ? payload.action : act
      ).filter((act) => ['PENDING', 'IN_PROGRESS'].includes(act.status));

      return {
        ...prev,
        actions: updatedActions,
      };
    });
  }

  @OnEvent('state.reconciled')
  handleStateReconciled(payload: { organizationId: string; state: any }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      financialState: payload.state,
      isPartialState: false,
      processingMessage: null,
    }));
  }

  @OnEvent('vendor.breakdown')
  handleVendorBreakdown(payload: { organizationId: string; report: any }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      vendorReport: payload.report,
    }));
  }

  @OnEvent('predictive.alert')
  handlePredictiveAlert(payload: { organizationId: string; report: any }) {
    this.reduceState(payload.organizationId, (prev) => ({
      ...prev,
      predictiveReport: payload.report,
    }));
  }

  /**
   * Pure Reducer Applicator: Mutates snapshot in memory, increments version, and emits LIVE_STATE_UPDATE
   */
  private reduceState(organizationId: string, reducer: (prev: LiveStateSnapshot) => LiveStateSnapshot) {
    const startTime = Date.now();
    const prev = this.liveStateMap.get(organizationId) || {
      organizationId,
      financialState: null,
      decisions: [],
      topPriority: null,
      actions: [],
      projectedState: null,
      vendorReport: null,
      predictiveReport: null,
      isPartialState: false,
      processingMessage: null,
      lastUpdatedAt: Date.now(),
      version: 0,
    };

    const nextState = reducer(prev);
    nextState.lastUpdatedAt = Date.now();
    nextState.version = prev.version + 1;

    // Persist in bounded LRU map
    this.setCachedState(organizationId, nextState);

    const duration = Date.now() - startTime;
    this.logger.log(`[TELEMETRY] LiveStateEngine: duration ${duration} ms, orgId=${organizationId}, version=${nextState.version}`);

    // Emit single authoritative unified LIVE_STATE_UPDATE event
    this.eventEmitter.emit('live.state.update', {
      organizationId,
      snapshot: nextState,
    });
  }
}

