import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialMetricsService } from './financial-metrics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('financial-metrics')
@UseGuards(JwtAuthGuard)
export class FinancialMetricsController {
    constructor(
        private prisma: PrismaService,
        private financialMetricsService: FinancialMetricsService
    ) { }

    @Get(':orgId/latest')
    async getLatest(
        @Param('orgId') organizationId: string,
        @GetUser('organizationId') userOrgId: string
    ) {
        if (!userOrgId || userOrgId !== organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.prisma.financialMetrics.findFirst({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' }
        });
    }

    @Get(':orgId/dashboard')
    async getDashboardMetrics(
        @Param('orgId') organizationId: string,
        @GetUser('organizationId') userOrgId: string
    ) {
        if (!userOrgId || userOrgId !== organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        console.log('GET /financial-metrics/:orgId/dashboard hit with orgId:', organizationId);
        return this.financialMetricsService.getDashboardMetrics(organizationId);
    }

    @Get(':orgId/history')
    async getHistory(
        @Param('orgId') organizationId: string,
        @GetUser('organizationId') userOrgId: string
    ) {
        if (!userOrgId || userOrgId !== organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.prisma.financialMetrics.findMany({
            where: { organizationId },
            orderBy: { uploadedAt: 'desc' },
            take: 10
        });
    }
}
