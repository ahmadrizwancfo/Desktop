import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Invoice, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.InvoiceCreateInput): Promise<Invoice> {
        return this.prisma.invoice.create({
            data,
        });
    }

    async findAll(organizationId: string): Promise<Invoice[]> {
        return this.prisma.invoice.findMany({
            where: { organizationId },
            include: {
                customer: true,
                vendor: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string): Promise<Invoice | null> {
        return this.prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                vendor: true,
                transactions: true,
            },
        });
    }

    async update(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
        return this.prisma.invoice.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<Invoice> {
        return this.prisma.invoice.delete({
            where: { id },
        });
    }
}

