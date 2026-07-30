import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../common/guards/tenant.guard';
import { DailyBriefService } from './daily-brief.service';

@Controller('daily-brief')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class DailyBriefController {
    constructor(private readonly dailyBriefService: DailyBriefService) {}

    /**
     * Fetch the 2-minute channel-agnostic Founder Daily Brief.
     */
    @Get()
    async getDailyBrief(@Req() req: any) {
        const organizationId = req.user.organizationId;
        const brief = await this.dailyBriefService.generateDailyBrief(organizationId);

        return {
            success: true,
            brief,
        };
    }

    /**
     * Force re-generate Daily Brief.
     */
    @Post('generate')
    async generateDailyBrief(@Req() req: any) {
        const organizationId = req.user.organizationId;
        const brief = await this.dailyBriefService.generateDailyBrief(organizationId);

        return {
            success: true,
            brief,
        };
    }
}
