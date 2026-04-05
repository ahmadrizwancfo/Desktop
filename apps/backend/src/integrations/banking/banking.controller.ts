import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('integrations/banking')
@UseGuards(JwtAuthGuard)
export class BankingController {
    constructor(private readonly bankingService: BankingService) { }

    @Post('consent')
    async initiateConsent(@Body() body: { mobile: string; userId: string }) {
        return this.bankingService.initiateConsent(body.userId, body.mobile);
    }

    @Get('accounts')
    async getAccounts(@Query('consentHandle') consentHandle: string) {
        return this.bankingService.getAccounts(consentHandle);
    }

    @Post('sync')
    async syncTransactions(
        @GetUser('id') userId: string,
        @GetUser('organizationId') organizationId: string,
        @Body() body: { accountId: string }
    ) {
        return this.bankingService.syncTransactions(body.accountId, organizationId, userId);
    }

    /**
     * Get transaction summary for the authenticated user's organization.
     * Used by the dashboard to show real financial data.
     */
    @Get('summary')
    async getTransactionSummary(
        @GetUser('organizationId') organizationId: string,
    ) {
        return this.bankingService.getTransactionSummary(organizationId);
    }
}
