import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notification, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        userId: string;
        title: string;
        message: string;
        type: string;
    }): Promise<Notification> {
        return this.prisma.notification.create({
            data: {
                title: data.title,
                message: data.message,
                type: data.type,
                user: {
                    connect: { id: data.userId },
                },
            },
        });
    }

    async findAllForUser(
        userId: string,
        params?: {
            skip?: number;
            take?: number;
            isRead?: boolean;
        },
    ): Promise<Notification[]> {
        const { skip, take, isRead } = params || {};
        return this.prisma.notification.findMany({
            where: {
                userId,
                ...(isRead !== undefined ? { isRead } : {}),
            },
            skip,
            take: take || 20,
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }

    async delete(id: string): Promise<Notification> {
        return this.prisma.notification.delete({
            where: { id },
        });
    }
}
