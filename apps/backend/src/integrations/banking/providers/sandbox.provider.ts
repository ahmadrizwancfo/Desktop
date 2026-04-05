import { Injectable, Logger } from '@nestjs/common';
import { IBankingProvider } from '../banking.interface';

@Injectable()
export class SandboxBankingProvider implements IBankingProvider {
    private readonly logger = new Logger(SandboxBankingProvider.name);

    async initiateConsent(userId: string, mobileNumber: string): Promise<{ consentHandle: string; redirectUrl: string }> {
        this.logger.log(`[Sandbox] Initiating banking consent for ${mobileNumber}`);
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
        await new Promise(resolve => setTimeout(resolve, 500));

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
        this.logger.log(`[Sandbox] Fetching transactions for ${accountId} (${fromDate.toISOString().slice(0,10)} → ${toDate.toISOString().slice(0,10)})`);

        // Deterministic IDs so deduplication works correctly across syncs.
        // In production, the provider returns real bank transaction IDs.
        const today = new Date();
        return [
            {
                id: `${accountId}_tx_001`,
                date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
                amount: 50000,
                type: 'DEBIT',
                narration: 'AWS India Pvt Ltd - Cloud Infra',
                category: 'Software',
            },
            {
                id: `${accountId}_tx_002`,
                date: new Date(today.getFullYear(), today.getMonth(), 3).toISOString(),
                amount: 150000,
                type: 'CREDIT',
                narration: 'Client Payment - TechCorp Solutions',
                category: 'Revenue',
            },
            {
                id: `${accountId}_tx_003`,
                date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString(),
                amount: 320000,
                type: 'DEBIT',
                narration: 'Salary Payout - March 2026',
                category: 'Payroll',
            },
            {
                id: `${accountId}_tx_004`,
                date: new Date(today.getFullYear(), today.getMonth(), 7).toISOString(),
                amount: 25000,
                type: 'DEBIT',
                narration: 'Google Workspace - Annual Plan',
                category: 'Software',
            },
            {
                id: `${accountId}_tx_005`,
                date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString(),
                amount: 200000,
                type: 'CREDIT',
                narration: 'Client Payment - FinServe Inc',
                category: 'Revenue',
            },
            {
                id: `${accountId}_tx_006`,
                date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString(),
                amount: 45000,
                type: 'DEBIT',
                narration: 'WeWork Co-working - Monthly Rent',
                category: 'Office',
            },
            {
                id: `${accountId}_tx_007`,
                date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(),
                amount: 80000,
                type: 'CREDIT',
                narration: 'Freelance Project - Design Sprint',
                category: 'Revenue',
            },
            {
                id: `${accountId}_tx_008`,
                date: new Date(today.getFullYear(), today.getMonth(), 18).toISOString(),
                amount: 18000,
                type: 'DEBIT',
                narration: 'Meta Ads - Performance Marketing',
                category: 'Marketing',
            },
        ];
    }
}
