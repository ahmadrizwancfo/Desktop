import { PrismaClient, TransactionType, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Seeding comprehensive demo data for AI features...\n');

    // 1. Create/Update Demo User
    const hashedPassword = await bcrypt.hash('demo123', 10);
    let user = await prisma.user.upsert({
        where: { email: 'demo@foundercfo.in' },
        update: {},
        create: {
            email: 'demo@foundercfo.in',
            password: hashedPassword,
            name: 'Rahul Sharma',
            role: 'FOUNDER',
        }
    });
    console.log('✅ User created:', user.email);

    // 2. Create Organization
    let org = await prisma.organization.findFirst({
        where: { users: { some: { id: user.id } } }
    });

    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'TechNova Solutions Pvt Ltd',
                industry: 'SaaS',
                country: 'IN',
                currency: 'INR',
                fiscalYearStartMonth: 4,
                users: { connect: { id: user.id } }
            }
        });
    }
    console.log('✅ Organization ready:', org.name);

    // 3. Create Bank Accounts
    await prisma.bankAccount.deleteMany({ where: { organizationId: org.id } });

    const accounts = await Promise.all([
        prisma.bankAccount.create({
            data: {
                name: 'ICICI Current Account',
                bankName: 'ICICI Bank',
                accountNumber: 'XXXX4522',
                balance: 2845230,
                currency: 'INR',
                organizationId: org.id
            }
        }),
        prisma.bankAccount.create({
            data: {
                name: 'HDFC Savings',
                bankName: 'HDFC Bank',
                accountNumber: 'XXXX8821',
                balance: 1250000,
                currency: 'INR',
                organizationId: org.id
            }
        }),
        prisma.bankAccount.create({
            data: {
                name: 'Razorpay Account',
                bankName: 'Razorpay',
                accountNumber: 'RZPAY001',
                balance: 425000,
                currency: 'INR',
                organizationId: org.id
            }
        })
    ]);
    console.log('✅ Bank accounts created:', accounts.length);

    // 4. Create Vendors (for TDS tracking)
    await prisma.vendor.deleteMany({ where: { organizationId: org.id } });
    const vendors = await Promise.all([
        prisma.vendor.create({ data: { name: 'Infosys Consulting', email: 'payments@infosys.com', gstin: '29AABCI1234A1Z5', organizationId: org.id } }),
        prisma.vendor.create({ data: { name: 'AWS India', email: 'billing@aws.amazon.com', gstin: '29AABCW1234A1Z5', organizationId: org.id } }),
        prisma.vendor.create({ data: { name: 'WeWork India', email: 'rent@wework.co.in', gstin: '29AABCW5678A1Z5', organizationId: org.id } }),
        prisma.vendor.create({ data: { name: 'Deloitte LLP', email: 'invoices@deloitte.com', gstin: '27AABCD1234A1Z5', organizationId: org.id } }),
        prisma.vendor.create({ data: { name: 'TechRecruit HR', email: 'payroll@techrecruit.in', organizationId: org.id } }),
    ]);
    console.log('✅ Vendors created:', vendors.length);

    // 5. Create Customers
    await prisma.customer.deleteMany({ where: { organizationId: org.id } });
    const customers = await Promise.all([
        prisma.customer.create({ data: { name: 'Acme Corp India', email: 'ap@acme.in', gstin: '27AABCA1234A1Z5', organizationId: org.id } }),
        prisma.customer.create({ data: { name: 'BigRetail Pvt Ltd', email: 'finance@bigretail.co.in', gstin: '29AABCB5678A1Z5', organizationId: org.id } }),
        prisma.customer.create({ data: { name: 'FinTech Solutions', email: 'accounts@fintech.in', gstin: '07AABCF1234A1Z5', organizationId: org.id } }),
    ]);
    console.log('✅ Customers created:', customers.length);

    // 6. Create Transactions (with proper TDS categories)
    await prisma.transaction.deleteMany({ where: { bankAccountId: { in: accounts.map(a => a.id) } } });

    const txData: Array<{
        amount: number;
        type: TransactionType;
        category: string;
        description: string;
        date: Date;
        bankAccountId: string;
    }> = [];

    // Income transactions (last 6 months)
    const incomeTransactions = [
        { amount: 850000, category: 'Service Revenue', description: 'Acme Corp - Monthly SaaS Subscription', daysAgo: 5 },
        { amount: 425000, category: 'Service Revenue', description: 'BigRetail - API Integration Fee', daysAgo: 12 },
        { amount: 1200000, category: 'Service Revenue', description: 'FinTech Solutions - Enterprise License', daysAgo: 25 },
        { amount: 680000, category: 'Service Revenue', description: 'Acme Corp - Monthly SaaS Subscription', daysAgo: 35 },
        { amount: 320000, category: 'Consulting', description: 'FinTech Solutions - Technical Consulting', daysAgo: 45 },
        { amount: 750000, category: 'Service Revenue', description: 'BigRetail - Quarterly Retainer', daysAgo: 60 },
        { amount: 500000, category: 'Service Revenue', description: 'Acme Corp - Monthly SaaS Subscription', daysAgo: 65 },
        { amount: 1500000, category: 'Investment', description: 'Angel Investment - Tranche 2', daysAgo: 90 },
    ];

    // Expense transactions (with TDS-relevant categories)
    const expenseTransactions = [
        // Professional Fees (194J - 10% TDS)
        { amount: 150000, category: 'Professional Fees', description: 'Infosys - Software Development Services', daysAgo: 8 },
        { amount: 85000, category: 'Consulting', description: 'Deloitte - Tax Advisory Services', daysAgo: 15 },
        { amount: 120000, category: 'Legal', description: 'Cyril Amarchand - Contract Review', daysAgo: 22 },
        { amount: 75000, category: 'Technical Services', description: 'Cloud Architect Consultation', daysAgo: 30 },
        { amount: 200000, category: 'Auditor', description: 'KPMG - Quarterly Audit', daysAgo: 45 },

        // Rent (194I - 10% TDS)
        { amount: 250000, category: 'Rent', description: 'WeWork - Office Space Monthly Rent', daysAgo: 3 },
        { amount: 250000, category: 'Rent', description: 'WeWork - Office Space Monthly Rent', daysAgo: 33 },
        { amount: 250000, category: 'Rent', description: 'WeWork - Office Space Monthly Rent', daysAgo: 63 },

        // Contractor (194C - 1-2% TDS)
        { amount: 45000, category: 'Contractor', description: 'Freelance Backend Developer', daysAgo: 10 },
        { amount: 35000, category: 'Contractor', description: 'UI/UX Designer Contract', daysAgo: 18 },
        { amount: 55000, category: 'Contractor', description: 'DevOps Consultant', daysAgo: 28 },

        // Commission (194H - 5% TDS)
        { amount: 65000, category: 'Commission', description: 'Sales Partner Commission - Q4', daysAgo: 40 },
        { amount: 42000, category: 'Brokerage', description: 'Recruitment Agency Fee', daysAgo: 55 },

        // Salaries (no TDS at source, company handles)
        { amount: 850000, category: 'Salary & Wages', description: 'Monthly Payroll - January', daysAgo: 5 },
        { amount: 850000, category: 'Salary & Wages', description: 'Monthly Payroll - December', daysAgo: 35 },
        { amount: 780000, category: 'Salary & Wages', description: 'Monthly Payroll - November', daysAgo: 65 },

        // Cloud & SaaS (no TDS, but GST ITC eligible)
        { amount: 125000, category: 'SaaS Subscriptions', description: 'AWS Monthly Bill', daysAgo: 7 },
        { amount: 45000, category: 'SaaS Subscriptions', description: 'Slack + Notion + GitHub', daysAgo: 7 },
        { amount: 28000, category: 'SaaS Subscriptions', description: 'Figma + Adobe CC', daysAgo: 12 },
        { amount: 18000, category: 'SaaS Subscriptions', description: 'Hubspot CRM', daysAgo: 15 },

        // Marketing
        { amount: 85000, category: 'Marketing & Advertising', description: 'Google Ads - January Campaign', daysAgo: 10 },
        { amount: 55000, category: 'Marketing & Advertising', description: 'LinkedIn Ads', daysAgo: 20 },
        { amount: 25000, category: 'Marketing & Advertising', description: 'Content Marketing Agency', daysAgo: 30 },

        // Others
        { amount: 12000, category: 'Utilities', description: 'Internet + Electricity', daysAgo: 8 },
        { amount: 8500, category: 'Travel & Conveyance', description: 'Client Meeting - Bangalore', daysAgo: 14 },
        { amount: 15000, category: 'Office Supplies', description: 'Laptops & Peripherals', daysAgo: 25 },
        { amount: 5500, category: 'Bank Charges', description: 'Banking Fees + Payment Gateway', daysAgo: 5 },
    ];

    // Add income transactions
    for (const tx of incomeTransactions) {
        const date = new Date();
        date.setDate(date.getDate() - tx.daysAgo);
        txData.push({
            amount: tx.amount,
            type: 'INCOME',
            category: tx.category,
            description: tx.description,
            date,
            bankAccountId: accounts[Math.floor(Math.random() * 2)].id,
        });
    }

    // Add expense transactions
    for (const tx of expenseTransactions) {
        const date = new Date();
        date.setDate(date.getDate() - tx.daysAgo);
        txData.push({
            amount: tx.amount,
            type: 'EXPENSE',
            category: tx.category,
            description: tx.description,
            date,
            bankAccountId: accounts[0].id,
        });
    }

    await prisma.transaction.createMany({ data: txData });
    console.log('✅ Transactions created:', txData.length);

    // 7. Create Invoices
    await prisma.invoice.deleteMany({ where: { organizationId: org.id } });

    const invoiceData = [
        { customer: customers[0], amount: 850000, status: 'PAID' as InvoiceStatus, daysAgo: 5 },
        { customer: customers[1], amount: 425000, status: 'PAID' as InvoiceStatus, daysAgo: 12 },
        { customer: customers[2], amount: 1200000, status: 'SENT' as InvoiceStatus, daysAgo: 2 },
        { customer: customers[0], amount: 680000, status: 'SENT' as InvoiceStatus, daysAgo: 8 },
        { customer: customers[1], amount: 320000, status: 'OVERDUE' as InvoiceStatus, daysAgo: 45 },
        { customer: customers[2], amount: 750000, status: 'DRAFT' as InvoiceStatus, daysAgo: 0 },
    ];

    for (let i = 0; i < invoiceData.length; i++) {
        const inv = invoiceData[i];
        const date = new Date();
        date.setDate(date.getDate() - inv.daysAgo);
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + 30);

        await prisma.invoice.create({
            data: {
                invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
                amount: inv.amount,
                tax: inv.amount * 0.18,
                status: inv.status,
                dueDate,
                organizationId: org.id,
                customerId: inv.customer.id,
            }
        });
    }
    console.log('✅ Invoices created:', invoiceData.length);

    // 8. Create some notifications
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.notification.createMany({
        data: [
            { userId: user.id, title: 'TDS Deposit Due', message: 'TDS for January is due by February 7th. Estimated liability: ₹1.2L', type: 'WARNING' },
            { userId: user.id, title: 'Invoice Overdue', message: 'Invoice INV-2026-0005 for BigRetail is 15 days overdue', type: 'ERROR' },
            { userId: user.id, title: 'GST Filing Reminder', message: 'GSTR-3B for January due by February 20th', type: 'INFO' },
        ]
    });
    console.log('✅ Notifications created');

    // 9. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEMO DATA SUMMARY');
    console.log('='.repeat(50));
    console.log(`   User: ${user.email}`);
    console.log(`   Organization: ${org.name}`);
    console.log(`   Bank Accounts: ${accounts.length}`);
    console.log(`   Total Balance: ₹${((accounts.reduce((sum, a) => sum + Number(a.balance), 0)) / 100000).toFixed(2)}L`);
    console.log(`   Transactions: ${txData.length}`);
    console.log(`   Invoices: ${invoiceData.length}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Demo data seeding complete!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: demo@foundercfo.in');
    console.log('   Password: demo123\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
