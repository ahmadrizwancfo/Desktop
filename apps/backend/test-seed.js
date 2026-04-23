const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * SCENARIO: AGGRESSIVE FOUNDER (Wartime V4.0)
 * Baseline: ₹50L Cash, ₹14.5L Revenue, Profitable (₹0 Burn)
 * Trigger: +₹1.5L Payroll (VP of Sales), +₹2L Marketing (Double spend)
 * Expected: Sustainable badge shatters, Runway hits ~11.7, Leak alerts fire.
 */

async function runScenario() {
    const orgId = "1d23a0b3-8d91-447f-851d-e5d97b2a9dc9"; // Raj Sharma's Org

    try {
        console.log("🚀 Starting Wartime V4.0 Scenario Simulation...");

        // 1. Clear previous test data to ensure clean numbers
        await prisma.transaction.deleteMany({ where: { source: 'SCENARIO_SIM' } });
        
        // 2. Set Current Balance to ₹50L
        let account = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } });
        if (!account) {
            account = await prisma.bankAccount.create({
                data: {
                    name: 'Primary Business Checking',
                    bankName: 'HDFC Demo',
                    balance: 5000000, // ₹50L
                    organizationId: orgId,
                }
            });
        } else {
            await prisma.bankAccount.update({
                where: { id: account.id },
                data: { balance: 5000000 }
            });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

        const txs = [];

        // --- PREVIOUS PERIOD (30-60 days ago) ---
        // Balanced State (Net Burn = 0)
        // Revenue: ₹14.5L
        txs.push({
            bankAccountId: account.id,
            amount: 1450000,
            type: 'INCOME',
            category: 'Sales',
            description: 'Monthly Sales Baseline',
            date: sixtyDaysAgo,
            source: 'SCENARIO_SIM'
        });
        // Expenses: ₹14.5L
        txs.push({ bankAccountId: account.id, amount: 600000, type: 'EXPENSE', category: 'Payroll', date: sixtyDaysAgo, source: 'SCENARIO_SIM', description: 'Core Team' });
        txs.push({ bankAccountId: account.id, amount: 100000, type: 'EXPENSE', category: 'Rent', date: sixtyDaysAgo, source: 'SCENARIO_SIM', description: 'Office HQ' });
        txs.push({ bankAccountId: account.id, amount: 200000, type: 'EXPENSE', category: 'Marketing', date: sixtyDaysAgo, source: 'SCENARIO_SIM', description: 'Performance Ads' });
        txs.push({ bankAccountId: account.id, amount: 550000, type: 'EXPENSE', category: 'Operations', date: sixtyDaysAgo, source: 'SCENARIO_SIM', description: 'Cloud & Misc' });

        // --- CURRENT PERIOD (0-30 days ago) ---
        // Revenue stays ₹14.5L
        txs.push({
            bankAccountId: account.id,
            amount: 1450000,
            type: 'INCOME',
            category: 'Sales',
            description: 'Monthly Sales Stable',
            date: thirtyDaysAgo,
            source: 'SCENARIO_SIM'
        });
        // Expenses spike to ₹18L
        // Payroll: ₹6L -> ₹7.5L (+1.5L VP Sales)
        txs.push({ bankAccountId: account.id, amount: 750000, type: 'EXPENSE', category: 'Payroll', date: thirtyDaysAgo, source: 'SCENARIO_SIM', description: 'Team + VP Sales' });
        // Marketing: ₹2L -> ₹4L (Double spend)
        txs.push({ bankAccountId: account.id, amount: 400000, type: 'EXPENSE', category: 'Marketing', date: thirtyDaysAgo, source: 'SCENARIO_SIM', description: 'Aggressive Campaign' });
        // Others stay same
        txs.push({ bankAccountId: account.id, amount: 100000, type: 'EXPENSE', category: 'Rent', date: thirtyDaysAgo, source: 'SCENARIO_SIM', description: 'Office HQ' });
        txs.push({ bankAccountId: account.id, amount: 550000, type: 'EXPENSE', category: 'Operations', date: thirtyDaysAgo, source: 'SCENARIO_SIM', description: 'Cloud & Misc' });

        console.log("Attempting to insert scenario transactions...");
        await prisma.transaction.createMany({ data: txs });
        
        // 3. Force Cache Invalidation (Mock)
        // In local dev, we usually just re-fetch the dashboard. 
        // We'll also update the startup profile to ensure we are in a 'growth' stage for the V4.0 engine.
        await prisma.startupProfile.updateMany({
            where: { organizationId: orgId },
            data: { 
                stage: 'GROWTH',
                primaryGoal: 'SCALE'
            }
        });

        console.log("✅ SCENARIO SYNCED.");
        console.log("--------------------------------------------------");
        console.log("PROJECTION CHECK:");
        console.log("Cash: ₹50,00,000");
        console.log("Net Revenue: ₹14,50,000");
        console.log("Net Expense: ₹18,00,000");
        console.log("Net Burn: ₹3,50,000");
        console.log("GST Buffer (18% of 14.5L): ₹2,61,000");
        console.log("Real Cash: ₹47,39,000");
        console.log("Real Runway: ~13.5 months (Calculated as Real Cash / Net Burn)");
        console.log("--------------------------------------------------");
        console.log("GO TO DASHBOARD: Sustainable should be gone. Look for the leaks.");

    } catch (err) {
        console.error("Simulation Failure:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runScenario();
