import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, Prisma, TransactionType } from '@prisma/client';
import { FinancialMath } from '../common/math/financial-math.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PaginatedResult<T> {
    items: T[];
    nextCursor: string | null;
    totalCount?: number;
}

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    async create(data: Prisma.TransactionCreateInput, organizationId: string): Promise<Transaction> {
        const bankAccountId = data.bankAccount.connect?.id;
        if (!bankAccountId) {
            throw new ForbiddenException('BankAccount connection required');
        }

        // Validate BankAccount tenant ownership at service layer
        const bankAccount = await this.prisma.bankAccount.findFirst({
            where: { id: bankAccountId, organizationId, deletedAt: null },
        });

        if (!bankAccount) {
            throw new ForbiddenException('Target BankAccount does not belong to your organization');
        }

        const transaction = await this.prisma.transaction.create({
            data,
        });

        // Update Bank Account Balance using FinancialMath (Decimal precision)
        const balanceChange =
            data.type === TransactionType.INCOME ? FinancialMath.toDecimal(data.amount) :
                data.type === TransactionType.EXPENSE ? FinancialMath.toDecimal(data.amount).negated() : FinancialMath.toDecimal(0);

        if (!balanceChange.isZero()) {
            await this.prisma.bankAccount.update({
                where: { id: bankAccountId },
                data: {
                    balance: {
                        increment: balanceChange.toNumber(),
                    },
                },
            });
        }

        // Emit transaction.created event to update Redis OrgLiveState with minimal delta
        this.eventEmitter.emit('transaction.created', {
            organizationId,
            amount: FinancialMath.toString(data.amount),
            type: data.type,
        });

        return transaction;
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        cursor?: string;
        where?: Prisma.TransactionWhereInput;
        orderBy?: Prisma.TransactionOrderByWithRelationInput;
    }): Promise<PaginatedResult<Transaction>> {
        // Enforce limit: default 50, max 100
        const limit = Math.min(params.take || 50, 100);

        const items = await this.prisma.transaction.findMany({
            skip: params.skip,
            take: limit + 1,
            cursor: params.cursor ? { id: params.cursor } : undefined,
            where: params.where,
            orderBy: params.orderBy || { date: 'desc' },
            include: {
                bankAccount: true,
            },
        });

        let nextCursor: string | null = null;
        if (items.length > limit) {
            const nextItem = items.pop();
            nextCursor = nextItem?.id || null;
        }

        return { items, nextCursor };
    }

    async findOne(id: string, organizationId: string): Promise<Prisma.TransactionGetPayload<{ include: { bankAccount: true; invoice: true } }> | null> {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                bankAccount: true,
                invoice: true,
            },
        });

        if (!transaction || transaction.bankAccount?.organizationId !== organizationId) {
            throw new NotFoundException('Transaction not found');
        }

        return transaction;
    }

    async remove(id: string, organizationId: string): Promise<Transaction> {
        const transaction = await this.findOne(id, organizationId);
        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        // Revert Balance with exact decimal arithmetic
        const balanceChange =
            transaction.type === TransactionType.INCOME ? FinancialMath.toDecimal(transaction.amount).negated() :
                transaction.type === TransactionType.EXPENSE ? FinancialMath.toDecimal(transaction.amount) : FinancialMath.toDecimal(0);

        if (!balanceChange.isZero()) {
            await this.prisma.bankAccount.update({
                where: { id: transaction.bankAccountId },
                data: {
                    balance: {
                        increment: balanceChange.toNumber(),
                    },
                },
            });
        }

        const deletedTx = await this.prisma.transaction.delete({
            where: { id },
        });

        // Emit transaction.deleted event to update Redis OrgLiveState with minimal delta
        this.eventEmitter.emit('transaction.deleted', {
            organizationId,
            amount: FinancialMath.toString(transaction.amount),
            type: transaction.type,
        });

        return deletedTx;
    }
}
