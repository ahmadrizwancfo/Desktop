import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ComplianceType, ComplianceSeverity } from '@prisma/client';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Get('status')
    getStatus(@GetUser() user: any) {
        return this.complianceService.getStatus(user.organizationId);
    }

    @Get('calendar')
    getCalendar(
        @GetUser() user: any,
        @Query('months') months?: string
    ) {
        const numMonths = months ? parseInt(months, 10) : 3;
        return this.complianceService.getCalendar(user.organizationId, numMonths);
    }

    @Get('alerts')
    getAlerts(@GetUser() user: any) {
        return this.complianceService.getAlerts(user.organizationId);
    }

    @Get('items')
    getItems(
        @GetUser() user: any,
        @Query('status') status?: string
    ) {
        return this.complianceService.getComplianceItems(user.organizationId, status);
    }

    @Post('items')
    createItem(
        @GetUser() user: any,
        @Body() body: {
            type: string;
            title: string;
            description?: string;
            dueDate: string;
            severity?: string;
            amount?: number;
        }
    ) {
        return this.complianceService.createComplianceItem(user.organizationId, {
            ...body,
            type: body.type as ComplianceType,
            severity: body.severity as ComplianceSeverity | undefined,
            dueDate: new Date(body.dueDate),
        });
    }

    @Post('items/:id/complete')
    markComplete(
        @GetUser() user: any,
        @Param('id') id: string
    ) {
        return this.complianceService.markComplete(user.organizationId, id);
    }
}
