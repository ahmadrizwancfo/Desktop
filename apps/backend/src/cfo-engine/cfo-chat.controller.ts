import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CfoChatService } from './cfo-chat.service';

@Controller('cfo-chat')
@UseGuards(DevAuthGuard)
export class CfoChatController {
    constructor(private readonly chatService: CfoChatService) {}

    @Post('query')
    async query(@Req() req: any, @Body('query') query: string) {
        const organizationId = req.user.organizationId;
        return this.chatService.processQuery(organizationId, query);
    }

    @Post('proactive-signals')
    async getProactiveSignals(@Req() req: any) {
        return this.chatService.getProactiveSignals(req.user.organizationId);
    }

    @Post('suggestions')
    async getSuggestions(@Req() req: any) {
        return this.chatService.getSuggestedQuestions(req.user.organizationId);
    }

    @Post('convert-to-action')
    async convertToAction(@Req() req: any, @Body() body: { insight: string; title?: string }) {
        return this.chatService.convertToDecision(req.user.organizationId, body.insight, body.title);
    }
}
