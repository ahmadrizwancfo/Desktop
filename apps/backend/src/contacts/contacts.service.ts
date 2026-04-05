import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateContactDto {
    name: string;
    email?: string;
    gstin?: string;
    type: 'CUSTOMER' | 'VENDOR';
}

@Injectable()
export class ContactsService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, dto: CreateContactDto) {
        if (dto.type === 'CUSTOMER') {
            return this.prisma.customer.create({
                data: {
                    organizationId,
                    name: dto.name,
                    email: dto.email,
                    gstin: dto.gstin,
                },
            });
        } else {
            return this.prisma.vendor.create({
                data: {
                    organizationId,
                    name: dto.name,
                    email: dto.email,
                    gstin: dto.gstin,
                },
            });
        }
    }

    async findAll(organizationId: string) {
        const [customers, vendors] = await Promise.all([
            this.prisma.customer.findMany({ where: { organizationId } }),
            this.prisma.vendor.findMany({ where: { organizationId } }),
        ]);

        return {
            customers,
            vendors,
            totalCount: customers.length + vendors.length,
        };
    }

    async findOne(organizationId: string, id: string) {
        // Search in both (unlikely to have collision in UUIDs)
        const customer = await this.prisma.customer.findFirst({ where: { id, organizationId } });
        if (customer) return { ...customer, type: 'CUSTOMER' };

        const vendor = await this.prisma.vendor.findFirst({ where: { id, organizationId } });
        if (vendor) return { ...vendor, type: 'VENDOR' };

        return null;
    }
}
