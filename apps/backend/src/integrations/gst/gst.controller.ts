import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { GstService } from './gst.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('integrations/gst')
@UseGuards(JwtAuthGuard)
export class GstController {
    constructor(private readonly gstService: GstService) { }

    @Get('returns')
    async getReturns(@Query('gstin') gstin: string, @Query('period') period: string) {
        return this.gstService.getReturns(gstin, period);
    }

    @Get('liability')
    async getLiability(@Query('gstin') gstin: string, @Query('period') period: string) {
        return this.gstService.getLiability(gstin, period);
    }

    @Get('status')
    async getStatus(@Query('gstin') gstin: string, @Query('period') period: string) {
        return this.gstService.getStatus(gstin, period);
    }
}
