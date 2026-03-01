export interface IBankingProvider {
    initiateConsent(userId: string, mobileNumber: string): Promise<{ consentHandle: string; redirectUrl: string }>;
    checkConsentStatus(consentHandle: string): Promise<'PENDING' | 'ACTIVE' | 'REJECTED'>;
    fetchAccounts(consentHandle: string): Promise<any[]>;
    fetchTransactions(accountId: string, fromDate: Date, toDate: Date): Promise<any[]>;
}
