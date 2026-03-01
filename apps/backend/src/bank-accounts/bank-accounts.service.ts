import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankAccount, Prisma } from '@prisma/client';

@Injectable()
export class BankAccountsService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.BankAccountCreateInput): Promise<BankAccount> {
        return this.prisma.bankAccount.create({
            data,
        });
    }

    async findAll(organizationId: string): Promise<BankAccount[]> {
        return this.prisma.bankAccount.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { transactions: true },
                },
            },
        });
    }

    async findOne(id: string): Promise<BankAccount | null> {
        return this.prisma.bankAccount.findUnique({
            where: { id },
            include: {
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async update(id: string, data: Prisma.BankAccountUpdateInput): Promise<BankAccount> {
        return this.prisma.bankAccount.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<BankAccount> {
        return this.prisma.bankAccount.delete({
            where: { id },
        });
    }

    async updateBalance(id: string, amount: number): Promise<BankAccount> {
        return this.prisma.bankAccount.update({
            where: { id },
            data: {
                balance: {
                    increment: amount,
                },
            },
        });
    }
}

