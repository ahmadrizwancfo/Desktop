import { BankingProvider, BankTransaction } from './banking.provider';

export class MockICICIProvider implements BankingProvider {
    name = 'ICICI Bank';

    async getTransactions(accountNumber: string, fromDate: Date, toDate: Date): Promise<BankTransaction[]> {
        // Simulating a real API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Return mock real-world like transactions
        return [
            {
                amount: 45000,
                date: new Date(),
                description: 'GST PAYMENT JAN 2026',
                referenceNumber: 'ICI2993881',
                type: 'EXPENSE',
                category: 'Taxes'
            },
            {
                amount: 120000,
                date: new Date(),
                description: 'SOW PAYMENT - CLIENT TRIDOT',
                referenceNumber: 'ICI2993882',
                type: 'INCOME',
                category: 'Services'
            },
            {
                amount: 4500,
                date: new Date(),
                description: 'GOOGLE CLOUD SUBSCRIPTION',
                referenceNumber: 'ICI2993883',
                type: 'EXPENSE',
                category: 'Cloud Infrastructure'
            }
        ];
    }

    async getBalance(accountNumber: string): Promise<number> {
        return 1520440.50;
    }
}
