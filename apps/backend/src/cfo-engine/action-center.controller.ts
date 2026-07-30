import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Req,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActionCenterService, CreateActionDto } from './action-center.service';

@Controller('action-center')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class ActionCenterController {
    constructor(private readonly actionCenterService: ActionCenterService) {}

    /**
     * Fetch all prepared, scheduled, and completed actions + executive metrics.
     */
    @Get()
    async getActions(@Req() req: any) {
        const organizationId = req.user.organizationId;
        const grouped = await this.actionCenterService.getActionsGrouped(organizationId);
        const metrics = await this.actionCenterService.getActionMetrics(organizationId);

        return {
            success: true,
            actions: grouped,
            metrics,
        };
    }

    /**
     * Prepare a new Action Card (AI / User Prepares Work for Founder Approval).
     */
    @Post('prepare')
    async prepareAction(@Req() req: any, @Body() body: Omit<CreateActionDto, 'organizationId'>) {
        const organizationId = req.user.organizationId;
        const action = await this.actionCenterService.createAction({
            ...body,
            organizationId,
            userId: req.user.id,
        });

        return {
            success: true,
            action,
        };
    }

    /**
     * Founder Approves Action -> Executes Integration Adapters & Log Audit Trail.
     */
    @Post(':id/approve')
    async approveAction(@Req() req: any, @Param('id') id: string) {
        const organizationId = req.user.organizationId;
        const updated = await this.actionCenterService.approveAction(id, organizationId, req.user.id);

        return {
            success: true,
            action: updated,
        };
    }

    /**
     * Founder Rejects Action.
     */
    @Post(':id/reject')
    async rejectAction(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
        const organizationId = req.user.organizationId;
        const updated = await this.actionCenterService.rejectAction(id, organizationId, req.user.id, body.reason);

        return {
            success: true,
            action: updated,
        };
    }

    /**
     * Snooze Action for 24 hours.
     */
    @Post(':id/snooze')
    async snoozeAction(@Req() req: any, @Param('id') id: string) {
        const organizationId = req.user.organizationId;
        const updated = await this.actionCenterService.snoozeAction(id, organizationId);

        return {
            success: true,
            action: updated,
        };
    }

    /**
     * Edit Action payload or title before approval.
     */
    @Patch(':id/edit')
    async editAction(@Req() req: any, @Param('id') id: string, @Body() body: { title?: string; payload?: any }) {
        const organizationId = req.user.organizationId;
        const updated = await this.actionCenterService.editAction(id, organizationId, body.title, body.payload);

        return {
            success: true,
            action: updated,
        };
    }
}
