import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CfoBrainService } from './cfo-brain.service';

@Injectable()
export class CfoMetricsService {
    private readonly logger = new Logger(CfoMetricsService.name);

    constructor(
        private prisma: PrismaService,
        private brainService: CfoBrainService
    ) { }

    /**
     * Compute CFO Metrics using CfoBrainService (SSOT AUTHORITY)
     * Store results inside MetricSnapshot
     */
    async calculateMetrics(organizationId: string) {
        this.logger.log(`Aggregating metrics for organization ${organizationId} via SSOT engine`);
        const user = await this.prisma.user.findFirst({
            where: { organizationId }
        });
        if (!user) return;

        // ── 1. AUTHORITY: Use CfoBrainService to compute all facts ────────────
        const report = await this.brainService.generateReport(organizationId, user.id);
        const { summary: s } = report;

        // ── 2. PERSISTENCE: Store synchronized snapshot to DB ─────────────────
        await this.prisma.financialSnapshot.create({
            data: {
                userId: user.id,
                organizationId,
                revenue: s.monthlyRevenue,
                expenses: s.monthlyExpenses,
                cashBalance: s.cashInBank,
                burn: s.netBurn,
                snapshotDate: new Date()
            }
        });

        // ── 3. METRIC SNAPSHOTS (Synced with Brain Report) ──────────────────────
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Calculate MRR (keep existing logic as it's a specific breakdown not in report summary but we'll use report category data)
        const mrr = report.categoryBreakdown
            .filter(c => c.category === 'Subscription Revenue' || c.category?.toLowerCase()?.includes('subscription'))
            .reduce((acc, c) => acc + c.amount, 0);

        await this.prisma.metricSnapshot.upsert({
            where: { organizationId_metricKey_period: { organizationId, metricKey: 'mrr', period } },
            update: { value: mrr },
            create: { organizationId, metricKey: 'mrr', value: mrr, period, unit: 'INR', source: 'brain_engine' }
        });

        await this.prisma.metricSnapshot.upsert({
            where: { organizationId_metricKey_period: { organizationId, metricKey: 'runway_months', period } },
            update: { value: s.runwayMonths },
            create: { organizationId, metricKey: 'runway_months', value: s.runwayMonths, period, unit: 'months', source: 'brain_engine' }
        });

        this.logger.log(`SSOT Sync: Stored metrics. Runway: ${s.runwayMonths.toFixed(1)}, Cash: ${s.cashInBank}`);

        return {
            cashBalance: s.cashInBank,
            monthlyRevenue: s.monthlyRevenue,
            monthlyBurnRate: s.monthlyExpenses,
            netBurn: s.netBurn,
            mrr,
            runwayMonths: s.runwayMonths,
            period
        };
    }

    async getLatestMetrics(userId: string) {
        const snap = await this.prisma.financialSnapshot.findFirst({
            where: { userId },
            orderBy: { snapshotDate: 'desc' }
        });
        if (!snap) return null;
        
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const mrrSnap = await this.prisma.metricSnapshot.findFirst({
            where: { organizationId: snap.organizationId, metricKey: 'mrr', period }
        });
        const runwaySnap = await this.prisma.metricSnapshot.findFirst({
            where: { organizationId: snap.organizationId, metricKey: 'runway_months', period }
        });

        return {
            cashBalance: Number(snap.cashBalance),
            monthlyRevenue: Number(snap.revenue),
            monthlyBurnRate: Number(snap.expenses),
            netBurn: Number(snap.burn),
            mrr: mrrSnap ? Number(mrrSnap.value) : 0,
            runwayMonths: runwaySnap ? Number(runwaySnap.value) : (Number(snap.burn) > 0 ? Number(snap.cashBalance) / Number(snap.burn) : 999),
            snapshotDate: snap.snapshotDate
        };
    }
}
