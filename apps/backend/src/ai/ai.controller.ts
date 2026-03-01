import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
// AI endpoints use Gemini API which costs money - apply stricter rate limits
@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute per user
export class AiController {
    constructor(private readonly aiService: AiService) { }

    // ==================== Chat & Insights ====================

    @Get('insights')
    getInsights(@GetUser() user: any) {
        return this.aiService.getInsights(user.organizationId);
    }

    @Get('cash-flow')
    getCashFlowForecast(@GetUser() user: any) {
        return this.aiService.getCashFlowForecast(user.organizationId);
    }

    @Get('tds-liability')
    getTdsLiability(@GetUser() user: any) {
        return this.aiService.getTdsLiability(user.organizationId);
    }

    @Post('chat')
    @Throttle({ default: { limit: 20, ttl: 60000 } }) // Chat is expensive - 20/min
    async chat(@GetUser() user: any, @Body() body: { message: string }) {
        const response = await this.aiService.getChatResponse(user.organizationId, body.message);
        return { response };
    }

    // ==================== Expense Categorization ====================

    @Post('categorize')
    async categorizeTransaction(
        @GetUser() user: any,
        @Body() body: { description: string; amount: number; vendor?: string }
    ) {
        const result = await this.aiService.categorizeTransaction(
            user.organizationId,
            body.description,
            body.amount,
            body.vendor
        );
        return result;
    }

    @Post('categorize/batch')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // Batch is very expensive - 5/min
    async categorizeTransactionsBatch(
        @GetUser() user: any,
        @Body() body: { transactions: Array<{ id: string; description: string; amount: number; vendor?: string }> }
    ) {
        const results = await this.aiService.categorizeTransactionsBatch(
            user.organizationId,
            body.transactions
        );
        return { results };
    }

    // ==================== Compliance ====================

    @Get('compliance/alerts')
    async getComplianceAlerts(@GetUser() user: any) {
        const alerts = await this.aiService.getComplianceAlerts(user.organizationId);
        return { alerts };
    }

    @Get('compliance/calendar')
    async getComplianceCalendar(
        @GetUser() user: any,
        @Query('months') months?: string
    ) {
        const numMonths = months ? parseInt(months, 10) : 3;
        const calendar = await this.aiService.getComplianceCalendar(user.organizationId, numMonths);
        return { calendar };
    }

    // ==================== Predictions ====================

    @Get('predictions')
    async getPredictions(
        @GetUser() user: any,
        @Query('months') months?: string
    ) {
        const numMonths = months ? parseInt(months, 10) : 6;
        const predictions = await this.aiService.getPredictiveForecast(user.organizationId, numMonths);
        return predictions;
    }

    // ==================== Reports ====================

    @Get('board-report')
    @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour - very expensive
    async getBoardReport(@GetUser() user: any) {
        const report = await this.aiService.generateBoardReport(user.organizationId);
        return { report };
    }

    @Post('investor-update')
    @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
    async getInvestorUpdate(
        @GetUser() user: any,
        @Body() body?: { highlights?: string[] }
    ) {
        const update = await this.aiService.generateInvestorUpdate(
            user.organizationId,
            body?.highlights
        );
        return { update };
    }

    // ==================== Anomaly Detection ====================

    @Get('anomalies')
    async detectAnomalies(@GetUser() user: any) {
        const anomalies = await this.aiService.detectAnomalies(user.organizationId);
        return { anomalies };
    }

    // ==================== Analytics ====================

    @Get('analytics')
    async getAiAnalytics(@GetUser() user: any) {
        const analytics = await this.aiService.getAiAnalytics(user.organizationId);
        return analytics;
    }
}
