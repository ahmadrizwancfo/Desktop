import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
    constructor(private readonly recommendationsService: RecommendationsService) { }

    /**
     * Get CFO recommendations for the organization
     */
    @Get()
    async getRecommendations(@Request() req: any) {
        return this.recommendationsService.getRecommendations(req.user.organizationId);
    }

    /**
     * Get risk assessment
     */
    @Get('risks')
    async getRisks(@Request() req: any) {
        return this.recommendationsService.getRisks(req.user.organizationId);
    }

    /**
     * Get monthly narrative summary
     */
    @Get('narrative')
    async getNarrative(@Request() req: any) {
        return this.recommendationsService.getMonthlyNarrative(req.user.organizationId);
    }

    /**
     * Get contextual AI prompts
     */
    @Get('prompts')
    async getPrompts(@Request() req: any) {
        return this.recommendationsService.getContextualPrompts(req.user.organizationId);
    }
}
