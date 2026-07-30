import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VendorItem {
  name: string;
  category: string;
  monthlySpend: number;
  transactionCount: number;
}

export interface ExpenseIntelligenceReport {
  topVendors: VendorItem[];
  categoryBreakdown: Record<string, number>;
  totalExpenses: number;
}

export interface PredictiveRunwayReport {
  projectedRunwayDays: number;
  daysUntilDeathClock: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  burnTrend: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
  revenueTrend: 'GROWING' | 'STABLE' | 'DECLINING';
}

export interface TrueIndianRunwayReport {
  trueRunwayMonths: number;
  trueRunwayDays: number;
  netRealizableCapital: number;
  adjustedMonthlyGrossBurn: number;
  lockedTaxReserves: number;
  advanceTaxDeadlineRisk: boolean;
  advanceTaxMessage: string | null;
  complianceBuffer: number;
}

@Injectable()
export class ExpenseIntelligenceService {
  private readonly logger = new Logger(ExpenseIntelligenceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * INDIAN RUNWAY MATRIX: Calculates True Indian Runway using 1.15 compliance buffer & tax reserves
   */
  public async calculateTrueIndianRunway(organizationId: string): Promise<TrueIndianRunwayReport> {
    const state = await this.prisma.orgFinancialState.findUnique({
      where: { organizationId },
    });

    const cash = state ? Number(state.cashInBank) : 0;
    const monthlyBurn = state ? Number(state.monthlyBurn) : 0;

    // Advance Tax Deadlines: June 15, Sept 15, Dec 15, March 15
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let advanceTaxDeadlineRisk = false;
    let advanceTaxMessage: string | null = null;

    const advanceTaxDeadlines = [
      { month: 6, day: 15, label: 'Q1 (June 15 - 15%)' },
      { month: 9, day: 15, label: 'Q2 (September 15 - 45%)' },
      { month: 12, day: 15, label: 'Q3 (December 15 - 75%)' },
      { month: 3, day: 15, label: 'Q4 (March 15 - 100%)' },
    ];

    for (const d of advanceTaxDeadlines) {
      if (d.month === currentMonth && currentDay <= d.day) {
        advanceTaxDeadlineRisk = true;
        advanceTaxMessage = `Advance Tax Tranche ${d.label} is due in ${d.day - currentDay} days! Reserve tax funds.`;
        break;
      }
    }

    const lockedTaxReserves = Math.round(cash * 0.05);
    const payables = Math.round(monthlyBurn * 0.15);
    const receivables = Math.round(cash * 0.1);

    const netRealizableCapital = cash - lockedTaxReserves - payables + Math.min(receivables, cash * 0.2);
    const complianceBuffer = 1.15;
    const adjustedMonthlyGrossBurn = monthlyBurn * complianceBuffer;

    const trueRunwayMonths = adjustedMonthlyGrossBurn > 0 ? Number((netRealizableCapital / adjustedMonthlyGrossBurn).toFixed(2)) : 999;
    const trueRunwayDays = Math.round(trueRunwayMonths * 30.4);

    return {
      trueRunwayMonths,
      trueRunwayDays,
      netRealizableCapital,
      adjustedMonthlyGrossBurn,
      lockedTaxReserves,
      advanceTaxDeadlineRisk,
      advanceTaxMessage,
      complianceBuffer,
    };
  }

  /**
   * 1. EXPENSE INTELLIGENCE ENGINE: Parses 30-day transactions to detect vendors & category breakdown
   */
  public async analyzeExpenseIntelligence(organizationId: string): Promise<ExpenseIntelligenceReport> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const txs = await this.prisma.transaction.findMany({
      where: {
        bankAccount: { organizationId },
        date: { gte: thirtyDaysAgo },
        type: 'EXPENSE',
      },
      select: { amount: true, description: true, category: true },
    });

    const vendorMap = new Map<string, { category: string; monthlySpend: number; transactionCount: number }>();
    const categoryBreakdown: Record<string, number> = {
      SaaS: 0,
      Payroll: 0,
      Marketing: 0,
      Infrastructure: 0,
      Misc: 0,
    };

    let totalExpenses = 0;

    for (const tx of txs) {
      const amt = Number(tx.amount);
      totalExpenses += amt;

      const vendor = this.extractVendorName(tx.description, tx.category);
      const cat = this.classifyCategory(vendor, tx.category);

      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;

      if (!vendorMap.has(vendor)) {
        vendorMap.set(vendor, { category: cat, monthlySpend: amt, transactionCount: 1 });
      } else {
        const item = vendorMap.get(vendor)!;
        item.monthlySpend += amt;
        item.transactionCount += 1;
      }
    }

    const topVendors: VendorItem[] = Array.from(vendorMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.monthlySpend - a.monthlySpend);

    return {
      topVendors,
      categoryBreakdown,
      totalExpenses,
    };
  }

  /**
   * 3. PREDICTIVE RUNWAY ENGINE: Computes forward-looking trend curves & days until death clock
   */
  public async computePredictiveRunway(organizationId: string): Promise<PredictiveRunwayReport> {
    const state = await this.prisma.orgFinancialState.findUnique({
      where: { organizationId },
    });

    if (!state) {
      return {
        projectedRunwayDays: 0,
        daysUntilDeathClock: 0,
        riskLevel: 'CRITICAL',
        burnTrend: 'STABLE',
        revenueTrend: 'STABLE',
      };
    }

    const trueIndianRunway = await this.calculateTrueIndianRunway(organizationId);
    const currentRunwayDays = trueIndianRunway.trueRunwayDays;
    const netBurn = Number(state.netBurn);
    const cashInBank = Number(state.cashInBank);

    // Compute trend curves from historical transaction snapshots
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentTxs = await this.prisma.transaction.findMany({
      where: { bankAccount: { organizationId }, date: { gte: thirtyDaysAgo } },
      select: { amount: true, type: true },
    });

    const olderTxs = await this.prisma.transaction.findMany({
      where: { bankAccount: { organizationId }, date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      select: { amount: true, type: true },
    });

    let recentBurn = 0;
    let olderBurn = 0;

    for (const t of recentTxs) {
      if (t.type === 'EXPENSE' || (t.type as any) === 'DEBIT') recentBurn += Number(t.amount);
    }
    for (const t of olderTxs) {
      if (t.type === 'EXPENSE' || (t.type as any) === 'DEBIT') olderBurn += Number(t.amount);
    }

    let burnTrend: 'EXPANDING' | 'STABLE' | 'CONTRACTING' = 'STABLE';
    if (recentBurn > olderBurn * 1.15) burnTrend = 'EXPANDING';
    else if (recentBurn < olderBurn * 0.85) burnTrend = 'CONTRACTING';

    const daysUntilDeathClock = Math.max(0, currentRunwayDays - 30);

    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (currentRunwayDays < 30 || trueIndianRunway.advanceTaxDeadlineRisk) riskLevel = 'CRITICAL';
    else if (currentRunwayDays < 90) riskLevel = 'HIGH';
    else if (currentRunwayDays < 180 || burnTrend === 'EXPANDING') riskLevel = 'MEDIUM';

    return {
      projectedRunwayDays: currentRunwayDays,
      daysUntilDeathClock,
      riskLevel,
      burnTrend,
      revenueTrend: 'STABLE',
    };
  }

  /**
   * Helper: Extracts vendor name from description/narration
   */
  private extractVendorName(desc?: string | null, category?: string | null): string {
    const d = (desc || '').toUpperCase();
    if (d.includes('AWS') || d.includes('AMAZON WEB')) return 'AWS';
    if (d.includes('NOTION')) return 'Notion';
    if (d.includes('SLACK')) return 'Slack';
    if (d.includes('GITHUB')) return 'GitHub';
    if (d.includes('GOOGLE') || d.includes('GCP')) return 'Google Cloud';
    if (d.includes('META') || d.includes('FACEBOOK')) return 'Meta Ads';
    if (d.includes('SALARY') || d.includes('PAYROLL') || d.includes('RAZORPAYX')) return 'Payroll / Salary';
    if (d.includes('LINKEDIN')) return 'LinkedIn Ads';

    return category || (desc || '').split(' ')[0] || 'Unclassified Vendor';
  }

  private classifyCategory(vendor: string, category?: string | null): string {
    const cat = (category || '').toUpperCase();
    if (['AWS', 'Notion', 'Slack', 'GitHub', 'Google Cloud'].includes(vendor)) return 'SaaS';
    if (['Payroll / Salary'].includes(vendor) || cat.includes('PAYROLL')) return 'Payroll';
    if (['Meta Ads', 'LinkedIn Ads'].includes(vendor) || cat.includes('MARKETING')) return 'Marketing';
    if (['AWS', 'Google Cloud'].includes(vendor)) return 'Infrastructure';
    return 'Misc';
  }
}
