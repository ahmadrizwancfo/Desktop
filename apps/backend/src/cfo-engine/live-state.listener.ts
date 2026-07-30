import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LiveStateService } from './live-state.service';
import { FinancialMath } from '../common/math/financial-math.util';

export interface TransactionCreatedEvent {
    organizationId: string;
    amount: number | string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    timestamp?: string;
}

export interface TransactionUpdatedEvent {
    organizationId: string;
    oldAmount: number | string;
    newAmount: number | string;
    oldType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    newType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    timestamp?: string;
}

export interface TransactionDeletedEvent {
    organizationId: string;
    amount: number | string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    timestamp?: string;
}

@Injectable()
export class LiveStateListener {
    private readonly logger = new Logger(LiveStateListener.name);

    constructor(private readonly liveStateService: LiveStateService) {}

    /**
     * Minimal Delta Recalculation on Transaction Creation with event ordering and high-value transaction snapshot trigger.
     */
    @OnEvent('transaction.created')
    async handleTransactionCreated(event: TransactionCreatedEvent) {
        this.logger.log(`⚡ Event Listener [transaction.created] for Org ${event.organizationId} [Type: ${event.type}, Amount: ${event.amount}]`);
        const currentState = await this.liveStateService.getState(event.organizationId);

        let cashBalance = FinancialMath.toDecimal(currentState.cashBalance);
        let monthlyBurn = FinancialMath.toDecimal(currentState.monthlyBurn);
        let monthlyRevenue = FinancialMath.toDecimal(currentState.monthlyRevenue);

        const delta = FinancialMath.toDecimal(event.amount);

        if (event.type === 'INCOME') {
            cashBalance = cashBalance.plus(delta);
            monthlyRevenue = monthlyRevenue.plus(delta);
        } else if (event.type === 'EXPENSE') {
            cashBalance = cashBalance.minus(delta);
            monthlyBurn = monthlyBurn.plus(delta);
        }

        const updatedState = await this.liveStateService.updateState(
            event.organizationId,
            {
                cashBalance: FinancialMath.toString(cashBalance),
                monthlyBurn: FinancialMath.toString(monthlyBurn),
                monthlyRevenue: FinancialMath.toString(monthlyRevenue),
            },
            'TRANSACTION_CREATED',
            event.timestamp
        );

        // High-Value Transaction Trigger (> ₹50k): Persist PostgreSQL Snapshot immediately
        if (delta.greaterThan(50000)) {
            this.logger.log(`High-Value Transaction (> ₹50k) detected for Org ${event.organizationId}. Persisting PostgreSQL snapshot...`);
            await this.liveStateService.persistSnapshotToDB(event.organizationId, updatedState);
        }
    }

    /**
     * Minimal Delta Recalculation on Transaction Update with event ordering check.
     */
    @OnEvent('transaction.updated')
    async handleTransactionUpdated(event: TransactionUpdatedEvent) {
        this.logger.log(`⚡ Event Listener [transaction.updated] for Org ${event.organizationId}`);
        const currentState = await this.liveStateService.getState(event.organizationId);

        let cashBalance = FinancialMath.toDecimal(currentState.cashBalance);
        let monthlyBurn = FinancialMath.toDecimal(currentState.monthlyBurn);
        let monthlyRevenue = FinancialMath.toDecimal(currentState.monthlyRevenue);

        // 1. Revert Old Transaction Delta
        const oldDelta = FinancialMath.toDecimal(event.oldAmount);
        if (event.oldType === 'INCOME') {
            cashBalance = cashBalance.minus(oldDelta);
            monthlyRevenue = monthlyRevenue.minus(oldDelta);
        } else if (event.oldType === 'EXPENSE') {
            cashBalance = cashBalance.plus(oldDelta);
            monthlyBurn = monthlyBurn.minus(oldDelta);
        }

        // 2. Apply New Transaction Delta
        const newDelta = FinancialMath.toDecimal(event.newAmount);
        if (event.newType === 'INCOME') {
            cashBalance = cashBalance.plus(newDelta);
            monthlyRevenue = monthlyRevenue.plus(newDelta);
        } else if (event.newType === 'EXPENSE') {
            cashBalance = cashBalance.minus(newDelta);
            monthlyBurn = monthlyBurn.plus(newDelta);
        }

        await this.liveStateService.updateState(
            event.organizationId,
            {
                cashBalance: FinancialMath.toString(cashBalance),
                monthlyBurn: FinancialMath.toString(monthlyBurn),
                monthlyRevenue: FinancialMath.toString(monthlyRevenue),
            },
            'TRANSACTION_UPDATED',
            event.timestamp
        );
    }

    /**
     * Minimal Delta Recalculation on Transaction Deletion with event ordering check.
     */
    @OnEvent('transaction.deleted')
    async handleTransactionDeleted(event: TransactionDeletedEvent) {
        this.logger.log(`⚡ Event Listener [transaction.deleted] for Org ${event.organizationId}`);
        const currentState = await this.liveStateService.getState(event.organizationId);

        let cashBalance = FinancialMath.toDecimal(currentState.cashBalance);
        let monthlyBurn = FinancialMath.toDecimal(currentState.monthlyBurn);
        let monthlyRevenue = FinancialMath.toDecimal(currentState.monthlyRevenue);

        const delta = FinancialMath.toDecimal(event.amount);

        if (event.type === 'INCOME') {
            cashBalance = cashBalance.minus(delta);
            monthlyRevenue = monthlyRevenue.minus(delta);
        } else if (event.type === 'EXPENSE') {
            cashBalance = cashBalance.plus(delta);
            monthlyBurn = monthlyBurn.minus(delta);
        }

        await this.liveStateService.updateState(
            event.organizationId,
            {
                cashBalance: FinancialMath.toString(cashBalance),
                monthlyBurn: FinancialMath.toString(monthlyBurn),
                monthlyRevenue: FinancialMath.toString(monthlyRevenue),
            },
            'TRANSACTION_DELETED',
            event.timestamp
        );
    }

    /**
     * Rebuild LiveState strictly from DB SSOT after full bank sync and persist snapshot.
     */
    @OnEvent('bank.sync.completed')
    async handleBankSyncCompleted(event: { organizationId: string }) {
        this.logger.log(`⚡ Event Listener [bank.sync.completed] for Org ${event.organizationId}. Rebuilding LiveState & persisting snapshot...`);
        const newState = await this.liveStateService.initializeStateFromDB(event.organizationId);
        await this.liveStateService.persistSnapshotToDB(event.organizationId, newState);
    }
}
