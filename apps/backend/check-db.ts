import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        include: { organization: true }
    });
    console.log('USERS:', JSON.stringify(users, null, 2));

    const orgs = await prisma.organization.findMany();
    console.log('ORGS:', JSON.stringify(orgs, null, 2));

    const txs = await prisma.transaction.findMany({ take: 5 });
    console.log('TXS Sample:', JSON.stringify(txs, null, 2));
}

check().finally(() => prisma.$disconnect());
