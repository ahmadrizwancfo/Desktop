import { Controller, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../common/guards/tenant.guard';
import { DecisionLabService, ScenarioDefinition } from './decision-lab.service';

@Controller('decision-lab')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class DecisionLabController {
    constructor(private readonly decisionLabService: DecisionLabService) {}

    /**
     * Run up to 4 parallel scenario simulations purely inside isolated memory.
     */
    @Post('simulate')
    async simulateScenarios(
        @Req() req: any,
        @Body() body: { scenarios: ScenarioDefinition[] }
    ) {
        if (!body.scenarios || !Array.isArray(body.scenarios)) {
            throw new BadRequestException('Body parameter "scenarios" must be an array.');
        }

        const organizationId = req.user.organizationId;
        const comparison = await this.decisionLabService.runMultiScenarioComparison(organizationId, body.scenarios);

        return {
            success: true,
            comparison,
        };
    }

    /**
     * Generate exportable Zod-validated Decision Card from scenario comparison.
     */
    @Post('decision-card')
    async generateDecisionCard(
        @Req() req: any,
        @Body() body: { scenarios: ScenarioDefinition[] }
    ) {
        if (!body.scenarios || !Array.isArray(body.scenarios)) {
            throw new BadRequestException('Body parameter "scenarios" must be an array.');
        }

        const organizationId = req.user.organizationId;
        const comparison = await this.decisionLabService.runMultiScenarioComparison(organizationId, body.scenarios);
        const card = await this.decisionLabService.generateDecisionCard(organizationId, comparison);

        return {
            success: true,
            comparison,
            card,
        };
    }
}
