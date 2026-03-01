import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UnitEconomicsService, UnitEconomicsMetrics, CohortData, DecisionImpact } from './unit-economics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('unit-economics')
@UseGuards(JwtAuthGuard)
export class UnitEconomicsController {
    constructor(private readonly unitEconomicsService: UnitEconomicsService) { }

    @Get(':organizationId/metrics')
    async getMetrics(@Param('organizationId') organizationId: string) {
        return this.unitEconomicsService.calculateMetrics(organizationId);
    }

    @Get(':organizationId/cohorts')
    async getCohorts(@Param('organizationId') organizationId: string) {
        return this.unitEconomicsService.getCohortAnalysis(organizationId);
    }

    @Get(':organizationId/decisions')
    async getDecisionScenarios(@Param('organizationId') organizationId: string) {
        return this.unitEconomicsService.getAllDecisionScenarios(organizationId);
    }

    @Post(':organizationId/impact')
    async calculateImpact(
        @Param('organizationId') organizationId: string,
        @Body() decision: {
            type: 'increase_marketing' | 'reduce_churn' | 'raise_prices' | 'cut_cogs' | 'expand_sales';
            magnitude: number;
        }
    ) {
        return this.unitEconomicsService.calculateDecisionImpact(organizationId, decision);
    }
}
