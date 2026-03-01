import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBankingProvider } from './banking.interface';
import { SandboxBankingProvider } from './providers/sandbox.provider';

@Injectable()
export class BankingService {
    private readonly logger = new Logger(BankingService.name);
    private provider: IBankingProvider;

    constructor(
        private configService: ConfigService,
        private sandboxProvider: SandboxBankingProvider
    ) {
        const mode = this.configService.get<string>('BANKING_MODE') || 'sandbox';

        if (mode === 'sandbox') {
            this.logger.log('Initializing Banking Service in SANDBOX mode');
            this.provider = this.sandboxProvider;
        } else {
            // Future: Initialize Setu/Finvu here
            this.logger.warn('Production provider not configured, falling back to sandbox');
            this.provider = this.sandboxProvider;
        }
    }

    async initiateConsent(userId: string, mobile: string) {
        return this.provider.initiateConsent(userId, mobile);
    }

    async getAccounts(consentHandle: string) {
        return this.provider.fetchAccounts(consentHandle);
    }

    async syncTransactions(accountId: string) {
        // Need to add logic to persist transactions to DB
        // For now just returning fetched data
        return this.provider.fetchTransactions(accountId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
    }
}
