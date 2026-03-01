
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    const user = await prisma.user.findFirst({
        where: { email: 'founder@example.com' }, // Adjust if needed
        include: { organization: true }
    });

    if (!user || !user.organizationId) {
        console.log('No user/org found. Create a user first.');
        return;
    }

    const orgId = user.organizationId;
    console.log(`Seeding data for Org: ${orgId}`);

    // 1. Create Bank Account
    const bankAccount = await prisma.bankAccount.create({
        data: {
            name: 'HDFC Current Account',
            bankName: 'HDFC Bank',
            accountNumber: '1234567890',
            balance: 1500000.00, // 15 Lakhs opening balance
            currency: 'INR',
            organizationId: orgId
        }
    });
    console.log('Created Bank Account:', bankAccount.id);

    // 2. Create Income Transactions (Last 30 days)
    await prisma.transaction.create({
        data: {
            amount: 500000.00,
            type: 'INCOME', // Using enum string
            category: 'Sales',
            description: 'Client Payment - ABC Corp',
            date: new Date(), // Today
            bankAccountId: bankAccount.id
        }
    });

    // 3. Create Expense Transactions (Last 30 days)
    await prisma.transaction.create({
        data: {
            amount: 200000.00,
            type: 'EXPENSE',
            category: 'Salary',
            description: 'Payroll - Founder',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            bankAccountId: bankAccount.id
        }
    });

    await prisma.transaction.create({
        data: {
            amount: 50000.00,
            type: 'EXPENSE',
            category: 'Server',
            description: 'AWS Bill',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            bankAccountId: bankAccount.id
        }
    });

    console.log('Seeding complete!');
}

seed()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
