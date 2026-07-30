import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RunwayStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class RunwayWorker {
  private readonly logger = new Logger(RunwayWorker.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Deterministic Fast-Layer Runway Worker: Triggered automatically upon state.partial_updated.
   */
  @OnEvent('state.partial_updated')
  async handlePartialUpdate(payload: { organizationId: string; eventId?: string }) {
    const { organizationId } = payload;
    this.logger.log(`⚡ RunwayWorker evaluating fast-layer runway for org: ${organizationId}`);

    try {
      const state = await this.prisma.orgFinancialState.findUnique({
        where: { organizationId },
      });

      if (!state) return;

      const cashInBank = Number(state.cashInBank);
      const monthlyBurn = Number(state.monthlyBurn);
      const monthlyRevenue = Number(state.monthlyRevenue);

      const netBurn = Math.max(0, monthlyBurn - monthlyRevenue);
      const runwayMonths = netBurn > 0 ? cashInBank / netBurn : 999;
      const runwayDays = Math.round(runwayMonths * 30.4);

      let runwayStatus: RunwayStatus = RunwayStatus.HEALTHY;
      if (runwayMonths > 36 || netBurn <= 0) runwayStatus = RunwayStatus.INFINITE;
      else if (runwayMonths < 3) runwayStatus = RunwayStatus.CRITICAL;
      else if (runwayMonths < 6) runwayStatus = RunwayStatus.LOW;

      const deathClockDate = netBurn > 0 ? new Date(Date.now() + runwayDays * 24 * 60 * 60 * 1000) : null;

      const updatedState = await this.prisma.orgFinancialState.update({
        where: { organizationId },
        data: {
          netBurn,
          runwayMonths,
          runwayDays,
          runwayStatus,
          deathClockDate,
        },
      });

      // Emit runway.recalculated event with deterministic metadata
      this.eventEmitter.emit('runway.recalculated', {
        eventId: randomUUID(),
        timestamp: Date.now(),
        organizationId,
        runwayDays,
        runwayMonths: Number(runwayMonths),
        runwayStatus,
        deathClockDate,
        state: updatedState,
      });

    } catch (error) {
      this.logger.error(`Failed runway evaluation for org ${organizationId}: ${error.message}`);
    }
  }
}
