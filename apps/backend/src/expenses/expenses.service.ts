import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CfoStateService } from '../cfo-engine/cfo-state.service';
import { CfoEngineService } from '../cfo-engine/cfo-engine.service';

@Injectable()
export class ExpensesService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => CfoStateService))
        private readonly cfoState: CfoStateService,
        @Inject(forwardRef(() => CfoEngineService))
        private readonly cfoEngine: CfoEngineService,
    ) { }

    async create(organizationId: string, dto: CreateExpenseDto) {
        // First, get or create a default bank account for the organization
        let bankAccount = await this.prisma.bankAccount.findFirst({
            where: { organizationId }
        });

        if (!bankAccount) {
            bankAccount = await this.prisma.bankAccount.create({
                data: {
                    name: 'Default Account',
                    bankName: 'Primary Bank',
                    balance: 0,
                    organizationId
                }
            });
        }

        // Create expense as a transaction
        return this.prisma.transaction.create({
            data: {
                amount: dto.amount,
                type: 'EXPENSE',
                category: dto.category,
                description: dto.description,
                date: new Date(dto.date),
                bankAccountId: bankAccount.id,
                metadata: {
                    vendor: dto.vendor,
                    status: dto.status || 'PENDING',
                    tdsApplicable: dto.tdsApplicable || false,
                    tdsAmount: dto.tdsAmount || 0,
                    gstAmount: dto.gstAmount || 0,
                    receiptUrl: dto.receiptUrl
                }
            }
        });
    }

    async findAll(organizationId: string) {
        // Get all bank accounts for the organization first
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
            select: { id: true }
        });

        const bankAccountIds = bankAccounts.map(a => a.id);

        return this.prisma.transaction.findMany({
            where: {
                bankAccountId: { in: bankAccountIds },
                type: 'EXPENSE'
            },
            orderBy: { date: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.transaction.findUnique({
            where: { id }
        });
    }

    async update(id: string, dto: UpdateExpenseDto, userId?: string) {
        const existing = await this.prisma.transaction.findUnique({
            where: { id },
            include: { bankAccount: true }
        });
        if (!existing) {
            throw new Error('Expense not found');
        }

        const existingMetadata = (existing.metadata as Record<string, any>) || {};
        const incomingMetadata = dto.metadata || {};

        // Merge notes
        const notesValue = dto.notes !== undefined ? dto.notes : incomingMetadata.notes;

        const updatedMetadata = {
            ...existingMetadata,
            ...incomingMetadata,
            ...(dto.vendor !== undefined && { vendor: dto.vendor }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(notesValue !== undefined && { notes: notesValue }),
            ...(dto.tdsApplicable !== undefined && { tdsApplicable: dto.tdsApplicable }),
            ...(dto.tdsAmount !== undefined && { tdsAmount: dto.tdsAmount }),
            ...(dto.gstAmount !== undefined && { gstAmount: dto.gstAmount }),
            ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
        };

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                amount: dto.amount,
                category: dto.category,
                description: dto.description !== undefined ? dto.description : (notesValue !== undefined ? notesValue : undefined),
                date: dto.date ? new Date(dto.date) : undefined,
                metadata: updatedMetadata
            }
        });

        // Trigger cache invalidation and engine recalculations
        const organizationId = existing.bankAccount.organizationId;
        this.cfoState.invalidateCache(organizationId);

        if (userId) {
            const profile = await this.prisma.startupProfile.findFirst({
                where: { organizationId }
            });
            if (profile) {
                // Run diagnostic engine asynchronously so update isn't blocked
                this.cfoEngine.runEngine(profile.id, userId)
                    .then(() => {
                        this.cfoState.invalidateCache(organizationId);
                    })
                    .catch(err => {
                        // Log but don't crash
                        console.error('Failed to run diagnostic engine after expense update:', err);
                    });
            }
        }

        return updated;
    }

    async remove(id: string) {
        return this.prisma.transaction.delete({
            where: { id }
        });
    }

    async getStats(organizationId: string) {
        const bankAccounts = await this.prisma.bankAccount.findMany({
            where: { organizationId },
            select: { id: true }
        });

        const bankAccountIds = bankAccounts.map(a => a.id);

        const expenses = await this.prisma.transaction.findMany({
            where: {
                bankAccountId: { in: bankAccountIds },
                type: 'EXPENSE',
                date: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        });

        const thisMonth = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const pending = expenses.filter(e => (e.metadata as any)?.status === 'PENDING');
        const pendingAmount = pending.reduce((sum, e) => sum + Number(e.amount), 0);

        // Calculate TDS liability
        const tdsLiability = expenses
            .filter(e => (e.metadata as any)?.tdsApplicable)
            .reduce((sum, e) => sum + Number((e.metadata as any)?.tdsAmount || 0), 0);

        // Get top category
        const categories: Record<string, number> = {};
        expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
        });
        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

        return {
            thisMonth,
            pendingReview: pendingAmount,
            pendingCount: pending.length,
            topCategory: topCategory ? topCategory[0] : 'N/A',
            topCategoryPercent: topCategory ? Math.round((topCategory[1] / thisMonth) * 100) : 0,
            tdsLiability
        };
    }
}
