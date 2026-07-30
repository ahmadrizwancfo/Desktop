import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CashflowTimelineService } from './cashflow-timeline.service';

@Injectable()
export class CashflowTimelineListener {
    private readonly logger = new Logger(CashflowTimelineListener.name);

    constructor(private readonly cashflowTimelineService: CashflowTimelineService) {}

    @OnEvent('transaction.created')
    handleTransactionCreated(event: { organizationId: string }) {
        this.logger.log(`⚡ Debounce Trigger [transaction.created] for Org ${event.organizationId}`);
        this.cashflowTimelineService.scheduleProjectionRecompute(event.organizationId);
    }

    @OnEvent('invoice.created')
    handleInvoiceCreated(event: { organizationId: string }) {
        this.logger.log(`⚡ Debounce Trigger [invoice.created] for Org ${event.organizationId}`);
        this.cashflowTimelineService.scheduleProjectionRecompute(event.organizationId);
    }

    @OnEvent('bank.sync.completed')
    handleBankSyncCompleted(event: { organizationId: string }) {
        this.logger.log(`⚡ Debounce Trigger [bank.sync.completed] for Org ${event.organizationId}`);
        this.cashflowTimelineService.scheduleProjectionRecompute(event.organizationId);
    }
}
