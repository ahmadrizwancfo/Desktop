import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, Prisma, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
        const transaction = await this.prisma.transaction.create({
            data,
        });

        // Update Bank Account Balance
        const balanceChange =
            data.type === TransactionType.INCOME ? Number(data.amount) :
                data.type === TransactionType.EXPENSE ? -Number(data.amount) : 0;

        if (balanceChange !== 0) {
            await this.prisma.bankAccount.update({
                where: { id: data.bankAccount.connect?.id },
                data: {
                    balance: {
                        increment: balanceChange,
                    },
                },
            });
        }

        return transaction;
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.TransactionWhereInput;
        orderBy?: Prisma.TransactionOrderByWithRelationInput;
    }): Promise<Transaction[]> {
        return this.prisma.transaction.findMany({
            ...params,
            include: {
                bankAccount: true,
            },
        });
    }

    async findOne(id: string): Promise<Transaction | null> {
        return this.prisma.transaction.findUnique({
            where: { id },
            include: {
                bankAccount: true,
                invoice: true,
            },
        });
    }

    async remove(id: string): Promise<Transaction> {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
        });

        if (transaction) {
            // Revert Balance
            const balanceChange =
                transaction.type === TransactionType.INCOME ? -Number(transaction.amount) :
                    transaction.type === TransactionType.EXPENSE ? Number(transaction.amount) : 0;

            if (balanceChange !== 0) {
                await this.prisma.bankAccount.update({
                    where: { id: transaction.bankAccountId },
                    data: {
                        balance: {
                            increment: balanceChange,
                        },
                    },
                });
            }
        }

        return this.prisma.transaction.delete({
            where: { id },
        });
    }
}

