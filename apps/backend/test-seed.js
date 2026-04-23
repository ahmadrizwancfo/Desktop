const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSeed() {
    try {
        const orgId = "5e2af0e8-1052-4294-a772-35f3d0db7000"; // Raj Sharma's Org
        
        let account = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } });
        if (!account) {
            account = await prisma.bankAccount.create({
                data: {
                    name: 'Primary Business Checking',
                    bankName: 'HDFC Demo',
                    balance: 15400000,
                    organizationId: orgId,
                }
            });
        }

        const txs = [];
        for (let i = 0; i < 15; i++) {
            const isRevenue = i % 3 === 0;
            const amount = isRevenue ? 150000 + Math.random() * 200000 : 30000 + Math.random() * 100000;
            txs.push({
                bankAccountId: account.id,
                amount: amount,
                type: isRevenue ? 'INCOME' : 'EXPENSE',
                category: isRevenue ? 'Sales' : 'Software Subscriptions',
                description: isRevenue ? 'Stripe Payout' : 'Cloud Hosting',
                date: new Date(Date.now() - i * 86400000 * 2),
                source: 'DEMO',
            });
        }
        
        console.log("Attempting to insert transactions...");
        const result = await prisma.transaction.createMany({ data: txs });
        console.log("Success!", result);
    } catch(err) {
        console.error("Prisma Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}
testSeed();
