import { Injectable, Logger } from '@nestjs/common';
import { IBankingProvider } from '../banking.interface';

@Injectable()
export class SandboxBankingProvider implements IBankingProvider {
    private readonly logger = new Logger(SandboxBankingProvider.name);

    async initiateConsent(userId: string, mobileNumber: string): Promise<{ consentHandle: string; redirectUrl: string }> {
        this.logger.log(`[Sandbox] Initiating banking consent for ${mobileNumber}`);
        // Simulate AA interaction
        return {
            consentHandle: `CONSENT-${Date.now()}`,
            redirectUrl: `http://localhost:3005/banking/consent-success?status=success`
        };
    }

    async checkConsentStatus(consentHandle: string): Promise<'PENDING' | 'ACTIVE' | 'REJECTED'> {
        this.logger.log(`[Sandbox] Checking consent status for ${consentHandle}`);
        return 'ACTIVE';
    }

    async fetchAccounts(consentHandle: string): Promise<any[]> {
        this.logger.log(`[Sandbox] Fetching accounts for ${consentHandle}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate latency

        return [
            {
                id: 'acc_hdfc_123',
                bankName: 'HDFC Bank',
                accountNumber: 'XXXX1234',
                type: 'CURRENT',
                balance: 1450000,
                currency: 'INR'
            },
            {
                id: 'acc_sbi_456',
                bankName: 'State Bank of India',
                accountNumber: 'XXXX5678',
                type: 'SAVINGS',
                balance: 230000,
                currency: 'INR'
            }
        ];
    }

    async fetchTransactions(accountId: string, fromDate: Date, toDate: Date): Promise<any[]> {
        this.logger.log(`[Sandbox] Fetching transactions for ${accountId}`);
        return [
            {
                id: `tx_${Date.now()}_1`,
                date: new Date().toISOString(),
                amount: 50000,
                type: 'DEBIT',
                narration: 'AWS India Pvt Ltd',
                category: 'Software'
            },
            {
                id: `tx_${Date.now()}_2`,
                date: new Date(Date.now() - 86400000).toISOString(),
                amount: 150000,
                type: 'CREDIT',
                narration: 'Client Payment - TechCorp',
                category: 'Revenue'
            }
        ];
    }
}
