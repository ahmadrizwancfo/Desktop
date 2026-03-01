import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) { }

    @Get()
    findAll(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ) {
        return this.auditLogsService.findAll({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : 50,
        });
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.auditLogsService.findByUser(userId);
    }

    @Get('entity/:entity/:entityId')
    findByEntity(
        @Param('entity') entity: string,
        @Param('entityId') entityId: string,
    ) {
        return this.auditLogsService.findByEntity(entity, entityId);
    }
}
