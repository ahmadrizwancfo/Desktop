const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('=== STARTING EMPIRICAL DATABASE VERIFICATION ===\n');

  try {
    const bankAccounts = await prisma.bankAccount.findMany({ where: { deletedAt: null } });
    console.log(`[DATABASE] Bank Accounts Count: ${bankAccounts.length}`);
    let totalCash = 0;
    bankAccounts.forEach(b => {
      console.log(`  - Account: ${b.name || b.accountNumber}, Balance: ₹${b.balance}`);
      totalCash += Number(b.balance || 0);
    });
    console.log(`  TOTAL CASH IN BANK: ₹${totalCash.toLocaleString('en-IN')}`);

    const unpaidInvoices = await prisma.invoice.findMany({ where: { status: { not: 'PAID' } } });
    console.log(`\n[DATABASE] Unpaid Invoices Count: ${unpaidInvoices.length}`);

    const transactionsCount = await prisma.transaction.count();
    console.log(`\n[DATABASE] Total Transactions Count: ${transactionsCount}`);

    console.log('\n=== DB VERIFICATION SUCCESSFUL ===');
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
