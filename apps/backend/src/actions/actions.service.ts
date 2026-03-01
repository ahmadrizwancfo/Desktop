import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ActionStatus, Assignee } from '@prisma/client';

@Injectable()
export class ActionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new action item
     */
    async create(organizationId: string, dto: CreateActionDto) {
        return this.prisma.actionItem.create({
            data: {
                title: dto.title,
                description: dto.description,
                organizationId,
                assignee: (dto.assignee as Assignee) || Assignee.FOUNDER,
                expectedImpact: dto.expectedImpact || 0,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                sourceInsight: dto.sourceInsight,
                sourceMetric: dto.sourceMetric,
            }
        });
    }

    /**
     * Get all actions for an organization
     */
    async findAll(organizationId: string, status?: ActionStatus) {
        const where: any = { organizationId };
        if (status) {
            where.status = status;
        }

        return this.prisma.actionItem.findMany({
            where,
            orderBy: [
                { status: 'asc' }, // Open first
                { dueDate: 'asc' }
            ]
        });
    }

    /**
     * Get a single action
     */
    async findOne(id: string) {
        return this.prisma.actionItem.findUnique({
            where: { id }
        });
    }

    /**
     * Update an action (status, assignee, actual impact, etc.)
     */
    async update(id: string, dto: UpdateActionDto) {
        const data: any = { ...dto };

        // If marking as done, set completedAt
        if (dto.status === ActionStatus.DONE) {
            data.completedAt = new Date();
        }

        // Parse dueDate if provided
        if (dto.dueDate) {
            data.dueDate = new Date(dto.dueDate);
        }

        return this.prisma.actionItem.update({
            where: { id },
            data
        });
    }

    /**
     * Delete an action
     */
    async remove(id: string) {
        return this.prisma.actionItem.delete({
            where: { id }
        });
    }

    /**
     * Get action stats for an organization
     */
    async getStats(organizationId: string) {
        const actions = await this.prisma.actionItem.findMany({
            where: { organizationId }
        });

        const open = actions.filter(a => a.status === ActionStatus.OPEN || a.status === ActionStatus.IN_PROGRESS);
        const done = actions.filter(a => a.status === ActionStatus.DONE);

        // Calculate impact
        const expectedImpact = open.reduce((sum, a) => sum + Number(a.expectedImpact), 0);
        const actualImpact = done.reduce((sum, a) => sum + Number(a.actualImpact || 0), 0);

        // Calculate completion rate
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const completedThisMonth = done.filter(a =>
            a.completedAt && new Date(a.completedAt) >= thisMonth
        );

        return {
            totalActions: actions.length,
            openCount: open.length,
            doneCount: done.length,
            completedThisMonth: completedThisMonth.length,
            expectedImpact,
            actualImpact,
            impactHitRate: expectedImpact > 0 ? Math.round((actualImpact / expectedImpact) * 100) : 0,
            byAssignee: this.groupByAssignee(actions),
            recentCompleted: done.slice(0, 5).map(a => ({
                id: a.id,
                title: a.title,
                expectedImpact: Number(a.expectedImpact),
                actualImpact: Number(a.actualImpact || 0),
                completedAt: a.completedAt
            }))
        };
    }

    /**
     * Group actions by assignee
     */
    private groupByAssignee(actions: any[]) {
        const grouped: Record<string, { open: number; done: number }> = {};

        for (const action of actions) {
            if (!grouped[action.assignee]) {
                grouped[action.assignee] = { open: 0, done: 0 };
            }

            if (action.status === ActionStatus.DONE) {
                grouped[action.assignee].done++;
            } else {
                grouped[action.assignee].open++;
            }
        }

        return grouped;
    }

    /**
     * Get overdue actions
     */
    async getOverdue(organizationId: string) {
        const now = new Date();

        return this.prisma.actionItem.findMany({
            where: {
                organizationId,
                status: { in: [ActionStatus.OPEN, ActionStatus.IN_PROGRESS] },
                dueDate: { lt: now }
            },
            orderBy: { dueDate: 'asc' }
        });
    }
}
