import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { BankingService } from './banking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
    async syncTransactions(@Body() body: { accountId: string }) {
        return this.bankingService.syncTransactions(body.accountId);
    }
}
