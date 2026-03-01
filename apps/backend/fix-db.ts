import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
    const user = await prisma.user.findUnique({ where: { email: 'demo@foundercfo.in' } });
    const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'desc' } });

    if (user && org) {
        console.log(`Linking user ${user.email} to org ${org.name}`);
        await prisma.user.update({
            where: { id: user.id },
            data: { organizationId: org.id }
        });

        // Also ensure some accounts exist for this org
        const account = await prisma.bankAccount.findFirst({ where: { organizationId: org.id } });
        if (!account) {
            console.log('Creating demo account for org...');
            const newAcc = await prisma.bankAccount.create({
                data: {
                    name: 'Main Business Account',
                    bankName: 'HDFC Bank',
                    accountNumber: 'XXXX1234',
                    balance: 1250000,
                    organizationId: org.id
                }
            });

            // Seed some transactions
            console.log('Seeding transactions...');
            await prisma.transaction.createMany({
                data: [
                    { amount: 50000, type: 'INCOME', category: 'Sales', description: 'Client Payment', date: new Date(), bankAccountId: newAcc.id },
                    { amount: 15000, type: 'EXPENSE', category: 'Rent', description: 'Office Rent', date: new Date(), bankAccountId: newAcc.id },
                    { amount: 45000, type: 'EXPENSE', category: 'Professional Fees', description: 'Auditor Payment', date: new Date(), bankAccountId: newAcc.id }
                ]
            });
        }
    }
}

fix().finally(() => prisma.$disconnect());
