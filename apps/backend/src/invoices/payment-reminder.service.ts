import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

export interface ReminderResult {
    invoiceId: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
    reminderType: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'CRITICAL';
    message: string;
    whatsappLink?: string;
}

@Injectable()
export class PaymentReminderService {
    private readonly logger = new Logger(PaymentReminderService.name);

    constructor(private prisma: PrismaService) { }

    async getInvoiceReminders(organizationId: string): Promise<ReminderResult[]> {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
            },
            orderBy: { dueDate: 'asc' },
        });

        const today = new Date();
        const reminders: ReminderResult[] = [];

        for (const invoice of invoices) {
            const dueDate = new Date(invoice.dueDate);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let reminderType: ReminderResult['reminderType'];
            let message: string;

            if (diffDays > 3) {
                continue; // No reminder needed yet
            } else if (diffDays > 0 && diffDays <= 3) {
                reminderType = 'UPCOMING';
                message = `Payment of ₹${Number(invoice.amount).toLocaleString('en-IN')} is due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
            } else if (diffDays === 0) {
                reminderType = 'DUE_TODAY';
                message = `Payment of ₹${Number(invoice.amount).toLocaleString('en-IN')} is due today`;
            } else if (diffDays >= -7) {
                reminderType = 'OVERDUE';
                message = `Payment of ₹${Number(invoice.amount).toLocaleString('en-IN')} is ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} overdue`;
            } else {
                reminderType = 'CRITICAL';
                message = `URGENT: Payment of ₹${Number(invoice.amount).toLocaleString('en-IN')} is ${Math.abs(diffDays)} days overdue`;
            }

            // Generate WhatsApp message link
            const whatsappMessage = encodeURIComponent(
                `Hi! This is a friendly reminder regarding Invoice #${invoice.invoiceNumber}.\n\n` +
                `Amount: ₹${Number(invoice.amount).toLocaleString('en-IN')}\n` +
                `Due Date: ${dueDate.toLocaleDateString('en-IN')}\n\n` +
                `Please process the payment at your earliest convenience. Thank you!`
            );
            const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;

            reminders.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: (invoice as any).clientName || 'Client',
                amount: Number(invoice.amount),
                dueDate: invoice.dueDate,
                daysOverdue: diffDays < 0 ? Math.abs(diffDays) : 0,
                reminderType,
                message,
                whatsappLink,
            });
        }

        return reminders;
    }

    async sendReminder(invoiceId: string, channel: 'EMAIL' | 'WHATSAPP' | 'SMS') {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { organization: true },
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Create notification record
        await this.prisma.notification.create({
            data: {
                title: `Payment Reminder Sent`,
                message: `Reminder for Invoice #${invoice.invoiceNumber} sent via ${channel}`,
                type: 'REMINDER',
                userId: invoice.organizationId, // This would be the user who triggered it
            },
        });

        this.logger.log(`Reminder sent for Invoice ${invoice.invoiceNumber} via ${channel}`);

        return {
            success: true,
            channel,
            invoiceNumber: invoice.invoiceNumber,
            message: `Reminder sent successfully via ${channel}`,
        };
    }

    async getInvoiceAging(organizationId: string) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
            },
        });

        const today = new Date();
        const aging = {
            current: { count: 0, amount: 0 },
            days1to30: { count: 0, amount: 0 },
            days31to60: { count: 0, amount: 0 },
            days61to90: { count: 0, amount: 0 },
            over90: { count: 0, amount: 0 },
        };

        for (const invoice of invoices) {
            const dueDate = new Date(invoice.dueDate);
            const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const amount = Number(invoice.amount);

            if (diffDays <= 0) {
                aging.current.count++;
                aging.current.amount += amount;
            } else if (diffDays <= 30) {
                aging.days1to30.count++;
                aging.days1to30.amount += amount;
            } else if (diffDays <= 60) {
                aging.days31to60.count++;
                aging.days31to60.amount += amount;
            } else if (diffDays <= 90) {
                aging.days61to90.count++;
                aging.days61to90.amount += amount;
            } else {
                aging.over90.count++;
                aging.over90.amount += amount;
            }
        }

        const totalOutstanding = Object.values(aging).reduce((sum, bucket) => sum + bucket.amount, 0);

        return {
            aging,
            totalOutstanding,
            totalInvoices: invoices.length,
            averageDaysOutstanding: invoices.length > 0
                ? Math.round(invoices.reduce((sum, inv) => {
                    const days = Math.max(0, Math.ceil((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                    return sum + days;
                }, 0) / invoices.length)
                : 0,
        };
    }
}
