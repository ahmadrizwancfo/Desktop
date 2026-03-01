import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvestorMetricsService } from './investor-metrics.service';

@Controller('investor-metrics')
@UseGuards(AuthGuard('jwt'))
export class InvestorMetricsController {
    constructor(private readonly investorMetricsService: InvestorMetricsService) { }

    @Get(':organizationId/metrics')
    async getMetrics(@Param('organizationId') organizationId: string) {
        return this.investorMetricsService.calculateMetrics(organizationId);
    }

    @Get(':organizationId/readiness')
    async getReadinessAssessment(@Param('organizationId') organizationId: string) {
        return this.investorMetricsService.getReadinessAssessment(organizationId);
    }

    @Get(':organizationId/data-room')
    async getDataRoomDocuments(@Param('organizationId') organizationId: string) {
        return this.investorMetricsService.generateDataRoomDocuments(organizationId);
    }

    @Get(':organizationId/narrative')
    async getNarrative(
        @Param('organizationId') organizationId: string,
        @Query('tone') tone: 'founder' | 'investor' | 'board' = 'founder',
    ) {
        return this.investorMetricsService.generateNarrative(organizationId, tone);
    }
}
