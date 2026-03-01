export interface BankTransaction {
    amount: number;
    date: Date;
    description: string;
    referenceNumber: string;
    type: 'INCOME' | 'EXPENSE';
    category?: string;
}

export interface BankingProvider {
    name: string;
    getTransactions(accountNumber: string, fromDate: Date, toDate: Date): Promise<BankTransaction[]>;
    getBalance(accountNumber: string): Promise<number>;
}
