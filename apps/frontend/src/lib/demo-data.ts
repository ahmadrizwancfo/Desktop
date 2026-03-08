/**
 * Demo Data Seeder
 * ─────────────────
 * Realistic Indian SaaS startup data so founders can try FounderCFO
 * instantly without uploading files.
 *
 * Uses existing API endpoints — no backend changes required.
 */

import type { AxiosInstance } from 'axios';

// ── Demo Startup Profile ──────────────────────────────────────────────────────

export const DEMO_STARTUP_PROFILE = {
    companyName: 'NexaTech Solutions Pvt Ltd',
    stage: 'SEED',
    monthlyRevenue: 320000,
    monthlyExpenses: 550000,
    cashInBank: 2800000,
    teamSize: 8,
    country: 'IN',
    industry: 'Technology / SaaS',
    primaryGoal: 'SCALE',
};

// ── Demo Transactions ─────────────────────────────────────────────────────────

function getMonthDates(monthsBack: number) {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsBack);
    return d.toISOString().split('T')[0];
}

export const DEMO_TRANSACTIONS = [
    // ── Revenue ───────────────────────────────────────────
    { description: 'Subscription Revenue — Enterprise Plan', amount: 150000, type: 'INCOME', category: 'Revenue', date: getMonthDates(0) },
    { description: 'Subscription Revenue — Pro Plans (12 customers)', amount: 96000, type: 'INCOME', category: 'Revenue', date: getMonthDates(0) },
    { description: 'Onboarding & Setup Fee — ABC Corp', amount: 45000, type: 'INCOME', category: 'Revenue', date: getMonthDates(0) },
    { description: 'API Integration Fee', amount: 29000, type: 'INCOME', category: 'Revenue', date: getMonthDates(0) },

    // ── Salaries ──────────────────────────────────────────
    { description: 'Payroll — Engineering Team (4)', amount: 280000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(0) },
    { description: 'Payroll — Sales & Marketing (2)', amount: 90000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(0) },
    { description: 'Payroll — Operations (2)', amount: 60000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(0) },
    { description: 'Founder Salary', amount: 50000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(0) },

    // ── SaaS Tools ────────────────────────────────────────
    { description: 'AWS — Cloud Infrastructure', amount: 22000, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },
    { description: 'Slack — Team Communication', amount: 4500, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },
    { description: 'Notion — Documentation', amount: 3000, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },
    { description: 'GitHub — Code Repository', amount: 5500, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },
    { description: 'Zoho CRM — Sales Pipeline', amount: 6000, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },
    { description: 'Freshdesk — Customer Support', amount: 3500, type: 'EXPENSE', category: 'Technology', date: getMonthDates(0) },

    // ── Marketing ─────────────────────────────────────────
    { description: 'Google Ads — SaaS Keywords', amount: 35000, type: 'EXPENSE', category: 'Marketing', date: getMonthDates(0) },
    { description: 'LinkedIn Ads — B2B Campaign', amount: 20000, type: 'EXPENSE', category: 'Marketing', date: getMonthDates(0) },
    { description: 'Content Marketing — Freelancer', amount: 15000, type: 'EXPENSE', category: 'Marketing', date: getMonthDates(0) },

    // ── Office & Compliance ───────────────────────────────
    { description: 'CoWorking Space — WeWork', amount: 25000, type: 'EXPENSE', category: 'Rent & Utilities', date: getMonthDates(0) },
    { description: 'CA Fees — Monthly Accounting', amount: 8000, type: 'EXPENSE', category: 'Professional Fees', date: getMonthDates(0) },
    { description: 'GST Payment', amount: 18000, type: 'EXPENSE', category: 'Tax', date: getMonthDates(0) },

    // ── Previous Month (for trend analysis) ───────────────
    { description: 'Subscription Revenue — Enterprise', amount: 120000, type: 'INCOME', category: 'Revenue', date: getMonthDates(1) },
    { description: 'Subscription Revenue — Pro Plans (10 customers)', amount: 80000, type: 'INCOME', category: 'Revenue', date: getMonthDates(1) },
    { description: 'Payroll — Full Team', amount: 420000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(1) },
    { description: 'AWS + SaaS Tools', amount: 38000, type: 'EXPENSE', category: 'Technology', date: getMonthDates(1) },
    { description: 'Marketing — Ads + Content', amount: 55000, type: 'EXPENSE', category: 'Marketing', date: getMonthDates(1) },
    { description: 'Office + Professional', amount: 30000, type: 'EXPENSE', category: 'Rent & Utilities', date: getMonthDates(1) },

    // ── Month before (3 months of history) ────────────────
    { description: 'Subscription Revenue', amount: 95000, type: 'INCOME', category: 'Revenue', date: getMonthDates(2) },
    { description: 'Consulting Revenue', amount: 50000, type: 'INCOME', category: 'Revenue', date: getMonthDates(2) },
    { description: 'Payroll — Full Team', amount: 380000, type: 'EXPENSE', category: 'Salary & Wages', date: getMonthDates(2) },
    { description: 'AWS + SaaS Tools', amount: 32000, type: 'EXPENSE', category: 'Technology', date: getMonthDates(2) },
    { description: 'Marketing — Ads', amount: 40000, type: 'EXPENSE', category: 'Marketing', date: getMonthDates(2) },
    { description: 'Office + Professional', amount: 28000, type: 'EXPENSE', category: 'Rent & Utilities', date: getMonthDates(2) },
];

// ── Seeder Function ───────────────────────────────────────────────────────────

export async function seedDemoData(api: AxiosInstance): Promise<{ success: boolean; profileId?: string; error?: string }> {
    try {
        // 1. Create org
        const orgRes = await api.post('/organizations', {
            name: DEMO_STARTUP_PROFILE.companyName,
            industry: DEMO_STARTUP_PROFILE.industry,
            country: DEMO_STARTUP_PROFILE.country,
        });
        const orgId = orgRes.data.id;

        // 2. Create startup profile
        const profileRes = await api.post('/startup-profile', {
            ...DEMO_STARTUP_PROFILE,
            organizationId: orgId,
        });

        // 3. Create a demo bank account
        const bankRes = await api.post('/bank-accounts', {
            accountName: 'HDFC Current Account (Demo)',
            bankName: 'HDFC Bank',
            accountNumber: 'DEMO-9876543210',
            accountType: 'CURRENT',
            currency: 'INR',
            currentBalance: DEMO_STARTUP_PROFILE.cashInBank,
            organizationId: orgId,
        });
        const bankAccountId = bankRes.data.id;

        // 4. Bulk insert demo transactions
        for (const txn of DEMO_TRANSACTIONS) {
            await api.post('/transactions', {
                ...txn,
                bankAccountId,
                organizationId: orgId,
            });
        }

        // 5. Trigger CFO Engine to generate decisions
        await api.post('/cfo-engine/run').catch(() => { /* non-blocking */ });

        return { success: true, profileId: profileRes.data.id };
    } catch (err: any) {
        console.error('Demo seed failed:', err);
        return { success: false, error: err?.response?.data?.message || 'Failed to seed demo data' };
    }
}
