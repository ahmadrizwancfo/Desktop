import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RunwayStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Monetary rounding helper to 2 decimal places to eliminate IEEE 754 precision drift across retries & runs.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class ReconciliationWorker {
  private readonly logger = new Logger(ReconciliationWorker.name);
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  public roundToTwoDecimals(value: number): number {
    return roundToTwoDecimals(value);
  }

  @OnEvent('transaction.ingested')
  async scheduleReconciliation(payload: { organizationId: string }) {
    const { organizationId } = payload;

    if (this.debounceTimers.has(organizationId)) {
      clearTimeout(this.debounceTimers.get(organizationId)!);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(organizationId);
      this.runReconciliation(organizationId);
    }, 5000);

    this.debounceTimers.set(organizationId, timer);
  }

  @OnEvent('reconcile.requested')
  async handleManualReconcile(payload: { organizationId: string }) {
    await this.runReconciliation(payload.organizationId);
  }

  public async runReconciliation(organizationId: string) {
    const startTime = Date.now();
    this.logger.log(`🔄 Running Smart Reconciliation (Truth Layer) for org: ${organizationId}`);

    try {
      const reconciledState = await this.reconcileOrgState(organizationId);

      this.eventEmitter.emit('state.reconciled', {
        eventId: randomUUID(),
        timestamp: Date.now(),
        organizationId,
        version: reconciledState.version,
        state: reconciledState,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`[TELEMETRY] FinancialEngine: duration ${duration} ms, orgId=${organizationId}, version=${reconciledState.version}`);
      this.logger.log(`✅ State Reconciled & Finalized (v${reconciledState.version}) for org: ${organizationId}`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Reconciliation failed for org ${organizationId}: ${error.message} (duration ${duration} ms)`);
    }
  }

  /**
   * Smart $O(delta)$ Reconciliation: Uses lastComputedAt to avoid scanning the entire database history.
   */
  public async reconcileOrgState(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch existing state snapshot
    const currentState = await this.prisma.orgFinancialState.findUnique({
      where: { organizationId },
    });

    let debit = 0;
    let credit = 0;

    if (currentState && currentState.lastComputedAt && currentState.lastComputedAt > thirtyDaysAgo) {
      // Smart Delta Fetching: Only query transactions created/updated since lastComputedAt
      const deltaTxs = await this.prisma.transaction.findMany({
        where: {
          bankAccount: { organizationId },
          createdAt: { gte: currentState.lastComputedAt },
        },
        select: { amount: true, type: true },
      });

      let deltaDebit = 0;
      let deltaCredit = 0;

      for (const tx of deltaTxs) {
        const amount = roundToTwoDecimals(Number(tx.amount));
        if (tx.type === 'EXPENSE' || (tx.type as any) === 'DEBIT') {
          deltaDebit = roundToTwoDecimals(deltaDebit + amount);
        } else if (tx.type === 'INCOME' || (tx.type as any) === 'CREDIT') {
          deltaCredit = roundToTwoDecimals(deltaCredit + amount);
        }
      }

      debit = roundToTwoDecimals(roundToTwoDecimals(Number(currentState.debitSum30d)) + deltaDebit);
      credit = roundToTwoDecimals(roundToTwoDecimals(Number(currentState.creditSum30d)) + deltaCredit);
    } else {
      // Full 30-day window query fallback
      const txs = await this.prisma.transaction.findMany({
        where: {
          bankAccount: { organizationId },
          date: { gte: thirtyDaysAgo },
        },
        select: { amount: true, type: true },
      });

      for (const tx of txs) {
        const amount = roundToTwoDecimals(Number(tx.amount));
        if (tx.type === 'EXPENSE' || (tx.type as any) === 'DEBIT') {
          debit = roundToTwoDecimals(debit + amount);
        } else if (tx.type === 'INCOME' || (tx.type as any) === 'CREDIT') {
          credit = roundToTwoDecimals(credit + amount);
        }
      }
    }

    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { organizationId },
      select: { balance: true },
    });
    const cashInBank = roundToTwoDecimals(
      bankAccounts.reduce((sum, acc) => roundToTwoDecimals(sum + Number(acc.balance)), 0),
    );

    const netBurn = roundToTwoDecimals(Math.max(0, roundToTwoDecimals(debit - credit)));
    const runwayMonths = netBurn > 0 ? roundToTwoDecimals(cashInBank / netBurn) : 999;
    const runwayDays = Math.round(runwayMonths * 30.4);

    let runwayStatus: RunwayStatus = RunwayStatus.HEALTHY;
    if (runwayMonths > 36 || netBurn <= 0) runwayStatus = RunwayStatus.INFINITE;
    else if (runwayMonths < 3) runwayStatus = RunwayStatus.CRITICAL;
    else if (runwayMonths < 6) runwayStatus = RunwayStatus.LOW;

    const deathClockDate = netBurn > 0 ? new Date(Date.now() + runwayDays * 24 * 60 * 60 * 1000) : null;

    const state = await this.prisma.orgFinancialState.upsert({
      where: { organizationId },
      update: {
        debitSum30d: debit,
        creditSum30d: credit,
        monthlyBurn: debit,
        monthlyRevenue: credit,
        netBurn,
        cashInBank,
        runwayMonths,
        runwayDays,
        runwayStatus,
        deathClockDate,
        isPartialState: false,
        lastComputedAt: new Date(),
        version: { increment: 1 },
      },
      create: {
        organizationId,
        debitSum30d: debit,
        creditSum30d: credit,
        monthlyBurn: debit,
        monthlyRevenue: credit,
        netBurn,
        cashInBank,
        runwayMonths,
        runwayDays,
        runwayStatus,
        deathClockDate,
        isPartialState: false,
        lastComputedAt: new Date(),
        version: 1,
      },
    });

    return state;
  }
}

