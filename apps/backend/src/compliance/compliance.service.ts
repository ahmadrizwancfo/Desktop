import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { COMPLIANCE_DEADLINES } from '../ai/ai-config';
import { ComplianceType, ComplianceSeverity, ComplianceStatus } from '@prisma/client';

@Injectable()
export class ComplianceService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) { }

    async getStatus(organizationId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { bankAccount: { organizationId } },
            orderBy: { date: 'desc' },
            take: 200,
        });

        const tasks: Array<{
            id: string;
            title: string;
            dueDate: string;
            status: string;
            priority: string;
            category: string;
            description?: string;
            estimatedAmount?: number;
        }> = [];

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        // 1. GST Compliance
        const gstr3bDue = new Date(currentYear, currentMonth - 1, COMPLIANCE_DEADLINES.GST.GSTR3B.day);
        const gstr1Due = new Date(currentYear, currentMonth - 1, COMPLIANCE_DEADLINES.GST.GSTR1.day);

        if (today <= gstr3bDue) {
            tasks.push({
                id: `gst-3b-${currentMonth}-${currentYear}`,
                title: 'GST GSTR-3B Filing',
                description: COMPLIANCE_DEADLINES.GST.GSTR3B.description,
                dueDate: gstr3bDue.toISOString().split('T')[0],
                status: today.getDate() >= 18 ? 'PENDING' : 'UPCOMING',
                priority: today.getDate() >= 18 ? 'CRITICAL' : 'HIGH',
                category: 'GST'
            });
        }

        if (today <= gstr1Due) {
            tasks.push({
                id: `gst-1-${currentMonth}-${currentYear}`,
                title: 'GST GSTR-1 Filing',
                description: COMPLIANCE_DEADLINES.GST.GSTR1.description,
                dueDate: gstr1Due.toISOString().split('T')[0],
                status: today.getDate() >= 9 ? 'PENDING' : 'UPCOMING',
                priority: today.getDate() >= 9 ? 'CRITICAL' : 'HIGH',
                category: 'GST'
            });
        }

        // 2. TDS Deposit (7th of month)
        const tdsDepositDue = new Date(currentYear, currentMonth - 1, COMPLIANCE_DEADLINES.TDS.deposit.day);
        if (today <= tdsDepositDue) {
            const tdsLiability = await this.aiService.getTdsLiability(organizationId);
            if (tdsLiability.totalTdsPayable > 0) {
                tasks.push({
                    id: `tds-deposit-${currentMonth}-${currentYear}`,
                    title: 'TDS Deposit',
                    description: `Deposit TDS of ₹${(tdsLiability.totalTdsPayable / 1000).toFixed(0)}K for last month`,
                    dueDate: tdsDepositDue.toISOString().split('T')[0],
                    status: today.getDate() >= 5 ? 'PENDING' : 'UPCOMING',
                    priority: today.getDate() >= 5 ? 'CRITICAL' : 'HIGH',
                    category: 'TDS',
                    estimatedAmount: tdsLiability.totalTdsPayable
                });
            }
        }

        // 3. TDS Review for large transactions
        const largeExpenses = transactions.filter(t => t.type === 'EXPENSE' && Number(t.amount) > 30000);
        const professionalPayments = largeExpenses.filter(t =>
            ['Professional Fees', 'Consulting', 'Legal', 'Technical Services', 'Auditor'].includes(t.category || '')
        );

        if (professionalPayments.length > 0) {
            const total = professionalPayments.reduce((sum, t) => sum + Number(t.amount), 0);
            tasks.push({
                id: 'tds-review',
                title: 'TDS Deduction Review',
                description: `${professionalPayments.length} professional payments (₹${(total / 100000).toFixed(1)}L) require TDS @ 10% (Sec 194J)`,
                dueDate: tdsDepositDue.toISOString().split('T')[0],
                status: 'PENDING',
                priority: 'CRITICAL',
                category: 'TDS',
                estimatedAmount: total * 0.1
            });
        }

        // 4. PF/ESI Deposit (15th)
        const pfesiDue = new Date(currentYear, currentMonth - 1, COMPLIANCE_DEADLINES.PF_ESI.deposit.day);
        if (today <= pfesiDue) {
            const salaryPayments = transactions.filter(t =>
                t.category === 'Salary & Wages' || (t.description?.toLowerCase().includes('salary'))
            );
            if (salaryPayments.length > 0) {
                tasks.push({
                    id: `pf-esi-${currentMonth}-${currentYear}`,
                    title: 'PF/ESI Deposit',
                    description: COMPLIANCE_DEADLINES.PF_ESI.deposit.description,
                    dueDate: pfesiDue.toISOString().split('T')[0],
                    status: today.getDate() >= 13 ? 'PENDING' : 'UPCOMING',
                    priority: today.getDate() >= 13 ? 'HIGH' : 'MEDIUM',
                    category: 'PF_ESI'
                });
            }
        }

        // 5. Advance Tax (quarterly)
        for (const [, info] of Object.entries(COMPLIANCE_DEADLINES.ADVANCE_TAX)) {
            if (info.month === currentMonth && today.getDate() <= info.day) {
                tasks.push({
                    id: `advance-tax-q-${currentMonth}-${currentYear}`,
                    title: `Advance Tax (${info.percentage}%)`,
                    description: info.description,
                    dueDate: new Date(currentYear, info.month - 1, info.day).toISOString().split('T')[0],
                    status: 'PENDING',
                    priority: 'HIGH',
                    category: 'INCOME_TAX'
                });
            }
        }

        // 6. ROC Filings
        for (const [name, info] of Object.entries(COMPLIANCE_DEADLINES.ROC)) {
            if (info.month === currentMonth) {
                tasks.push({
                    id: `roc-${name.toLowerCase()}-${currentYear}`,
                    title: name.replace('_', '-'),
                    description: info.description,
                    dueDate: new Date(currentYear, info.month - 1, info.day).toISOString().split('T')[0],
                    status: today.getDate() >= (info.day - 5) ? 'PENDING' : 'UPCOMING',
                    priority: 'HIGH',
                    category: 'ROC'
                });
            }
        }

        // Calculate compliance score
        const pendingCritical = tasks.filter(t => t.priority === 'CRITICAL' && t.status === 'PENDING').length;
        const pendingHigh = tasks.filter(t => t.priority === 'HIGH' && t.status === 'PENDING').length;
        const complianceScore = Math.max(0, 100 - (pendingCritical * 15) - (pendingHigh * 5));

        // Determine risk level
        let riskLevel = 'LOW';
        if (pendingCritical > 0) riskLevel = 'HIGH';
        else if (pendingHigh > 1) riskLevel = 'MEDIUM';

        // Find next action
        const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        const nextAction = sortedTasks.find(t => t.status === 'PENDING')?.title || 'No pending tasks';

        return {
            score: complianceScore,
            tasks: tasks.sort((a, b) => {
                const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
            }),
            summary: {
                lastFiled: 'N/A',
                nextAction,
                riskLevel,
                pendingCount: tasks.filter(t => t.status === 'PENDING').length,
                criticalCount: pendingCritical,
            }
        };
    }

    async getCalendar(organizationId: string, months: number = 3) {
        return this.aiService.getComplianceCalendar(organizationId, months);
    }

    async getAlerts(organizationId: string) {
        return this.aiService.getComplianceAlerts(organizationId);
    }

    async markComplete(organizationId: string, itemId: string) {
        // Store completion in database
        await this.prisma.complianceItem.updateMany({
            where: { id: itemId, organizationId },
            data: { status: ComplianceStatus.COMPLETED, completedAt: new Date() }
        });

        return { success: true, message: 'Compliance item marked as complete' };
    }

    async createComplianceItem(organizationId: string, data: {
        type: ComplianceType;
        title: string;
        description?: string;
        dueDate: Date;
        severity?: ComplianceSeverity;
        amount?: number;
    }) {
        return this.prisma.complianceItem.create({
            data: {
                organizationId,
                type: data.type,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                severity: data.severity ?? ComplianceSeverity.MEDIUM,
                amount: data.amount,
            }
        });
    }

    async getComplianceItems(organizationId: string, status?: string) {
        const where: any = { organizationId };
        if (status) {
            where.status = status;
        }

        return this.prisma.complianceItem.findMany({
            where,
            orderBy: { dueDate: 'asc' }
        });
    }
}
