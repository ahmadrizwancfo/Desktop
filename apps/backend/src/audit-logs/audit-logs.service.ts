import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLog, Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        action: string;
        entity: string;
        entityId: string;
        userId: string;
        details?: any;
    }): Promise<AuditLog> {
        return this.prisma.auditLog.create({
            data: {
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                details: data.details,
                user: {
                    connect: { id: data.userId },
                },
            },
        });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.AuditLogWhereInput;
        orderBy?: Prisma.AuditLogOrderByWithRelationInput;
    }): Promise<AuditLog[]> {
        const { skip, take, where, orderBy } = params;
        return this.prisma.auditLog.findMany({
            skip,
            take,
            where,
            orderBy: orderBy || { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
    }

    async findByUser(userId: string): Promise<AuditLog[]> {
        return this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async findByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
        return this.prisma.auditLog.findMany({
            where: { entity, entityId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });
    }
}
