import {
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiExplainerService } from './ai-explainer.service';

@Controller('ai-explainer')
@UseGuards(AuthGuard('jwt'))
export class AiExplainerController {
    constructor(private readonly service: AiExplainerService) { }

    /**
     * Generate and save a Gemini explanation for a given CfoDecision ID.
     * Returns cached explanation if already generated.
     */
    @Post('explain/:decisionId')
    async explain(@Param('decisionId') decisionId: string) {
        try {
            return await this.service.explain(decisionId);
        } catch (err) {
            throw new NotFoundException(err.message);
        }
    }

    /**
     * Retrieve an already-saved explanation for a decision.
     */
    @Get('explanation/:decisionId')
    async getExplanation(@Param('decisionId') decisionId: string) {
        const result = await this.service.getExplanation(decisionId);
        if (!result) {
            throw new NotFoundException('No explanation found for this decision. Call POST /explain/:id first.');
        }
        return result;
    }
}
