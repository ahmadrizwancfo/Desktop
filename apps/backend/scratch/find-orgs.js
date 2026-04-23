const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOrgs() {
    const orgs = await prisma.organization.findMany();
    console.log("ORGS:", orgs);
    await prisma.$disconnect();
}
findOrgs();
