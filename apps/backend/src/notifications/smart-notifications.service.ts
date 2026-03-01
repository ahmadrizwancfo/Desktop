import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';

interface EmailConfig {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

interface WhatsAppConfig {
    to: string;
    message: string;
}

export interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    channels?: ('IN_APP' | 'EMAIL' | 'WHATSAPP')[];
    data?: Record<string, any>;
}

@Injectable()
export class SmartNotificationsService {
    private readonly logger = new Logger(SmartNotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private aiService: AiService,
    ) { }

    /**
     * Send a notification through multiple channels
     */
    async send(payload: NotificationPayload): Promise<void> {
        const channels = payload.channels || ['IN_APP'];

        // Always create in-app notification
        if (channels.includes('IN_APP')) {
            await this.createInAppNotification(payload);
        }

        // Send email if configured
        if (channels.includes('EMAIL')) {
            await this.sendEmail(payload);
        }

        // Send WhatsApp if configured
        if (channels.includes('WHATSAPP')) {
            await this.sendWhatsApp(payload);
        }
    }

    /**
     * Create in-app notification
     */
    private async createInAppNotification(payload: NotificationPayload): Promise<void> {
        await this.prisma.notification.create({
            data: {
                userId: payload.userId,
                title: payload.title,
                message: payload.message,
                type: payload.type,
            }
        });
        this.logger.log(`In-app notification sent to user ${payload.userId}`);
    }

    /**
     * Send email notification (mock implementation - integrate with actual email service)
     */
    private async sendEmail(payload: NotificationPayload): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { email: true, name: true }
        });

        if (!user?.email) {
            this.logger.warn(`No email found for user ${payload.userId}`);
            return;
        }

        const emailConfig: EmailConfig = {
            to: user.email,
            subject: payload.title,
            html: this.generateEmailHtml(payload, user.name || 'User'),
            text: payload.message,
        };

        // TODO: Integrate with actual email service (e.g., SendGrid, AWS SES, Resend)
        // For now, we'll log the email
        this.logger.log(`📧 Email would be sent to ${emailConfig.to}: ${emailConfig.subject}`);

        // Example integration with Resend:
        // const resend = new Resend(this.configService.get('RESEND_API_KEY'));
        // await resend.emails.send({
        //     from: 'FounderCFO <notifications@foundercfo.in>',
        //     to: emailConfig.to,
        //     subject: emailConfig.subject,
        //     html: emailConfig.html,
        // });
    }

    /**
     * Send WhatsApp notification (mock implementation)
     */
    private async sendWhatsApp(payload: NotificationPayload): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
        });

        // TODO: Store phone number in user profile
        // For now, we'll log the message
        this.logger.log(`📱 WhatsApp would be sent: ${payload.title} - ${payload.message}`);

        // Example integration with WhatsApp Business API (via Twilio):
        // const client = twilio(
        //     this.configService.get('TWILIO_ACCOUNT_SID'),
        //     this.configService.get('TWILIO_AUTH_TOKEN')
        // );
        // await client.messages.create({
        //     from: 'whatsapp:+14155238886',
        //     to: `whatsapp:${user.phone}`,
        //     body: `🔔 *${payload.title}*\n\n${payload.message}`,
        // });
    }

    /**
     * Generate beautiful HTML email template
     */
    private generateEmailHtml(payload: NotificationPayload, userName: string): string {
        const typeColors = {
            INFO: '#6366F1',    // Indigo
            SUCCESS: '#10B981', // Emerald
            WARNING: '#F59E0B', // Amber
            ERROR: '#EF4444',   // Red
        };

        const color = typeColors[payload.type] || typeColors.INFO;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155;">
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 700; color: #6366F1;">Founder</span><span style="font-size: 24px; font-weight: 700; color: #f8fafc;">CFO</span>
                </div>
                
                <!-- Greeting -->
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Hi ${userName},</p>
                
                <!-- Alert Badge -->
                <div style="background: ${color}15; border-left: 4px solid ${color}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 8px; font-weight: 600;">${payload.title}</h2>
                    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">${payload.message}</p>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                    <a href="http://localhost:3001/dashboard" style="display: inline-block; background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        Open Dashboard
                    </a>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #334155;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                        © 2026 FounderCFO • Your AI-Powered Finance Partner
                    </p>
                    <p style="color: #475569; font-size: 11px; margin: 8px 0 0;">
                        <a href="#" style="color: #475569; text-decoration: underline;">Unsubscribe</a> • 
                        <a href="#" style="color: #475569; text-decoration: underline;">Manage Preferences</a>
                    </p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    // ==================== Scheduled Notifications ====================

    /**
     * Generate and send daily AI brief
     */
    async sendDailyBrief(organizationId: string): Promise<void> {
        const users = await this.prisma.user.findMany({
            where: { organizationId },
        });

        for (const user of users) {
            try {
                const cashFlow = await this.aiService.getCashFlowForecast(organizationId);
                const tds = await this.aiService.getTdsLiability(organizationId);

                const briefMessage = `
Good morning! Here's your daily financial brief:

💰 Cash Position: ₹${(cashFlow.currentBalance / 100000).toFixed(1)}L
🔥 Monthly Burn: ₹${(cashFlow.monthlyBurn / 100000).toFixed(1)}L
⏱️ Runway: ${cashFlow.runwayMonths} months
📋 TDS Pending: ₹${(tds.totalTdsPayable / 1000).toFixed(0)}K

Risk Level: ${cashFlow.riskLevel}
                `.trim();

                await this.send({
                    userId: user.id,
                    title: '☀️ Your Daily Financial Brief',
                    message: briefMessage,
                    type: 'INFO',
                    channels: ['IN_APP', 'EMAIL'],
                });
            } catch (error) {
                this.logger.error(`Failed to send daily brief to user ${user.id}: ${error.message}`);
            }
        }
    }

    /**
     * Generate and send weekly CFO report
     */
    async sendWeeklyReport(organizationId: string): Promise<void> {
        const users = await this.prisma.user.findMany({
            where: { organizationId },
        });

        for (const user of users) {
            try {
                const report = await this.aiService.generateBoardReport(organizationId);

                await this.send({
                    userId: user.id,
                    title: '📊 Weekly CFO Report',
                    message: 'Your weekly financial summary is ready. Check the dashboard for the full report.',
                    type: 'INFO',
                    channels: ['IN_APP', 'EMAIL'],
                    data: { report },
                });
            } catch (error) {
                this.logger.error(`Failed to send weekly report to user ${user.id}: ${error.message}`);
            }
        }
    }

    // ==================== Compliance Alerts ====================

    /**
     * Check and send compliance deadline alerts
     */
    async checkComplianceDeadlines(organizationId: string): Promise<void> {
        const users = await this.prisma.user.findMany({
            where: { organizationId },
        });

        const alerts = await this.aiService.getComplianceAlerts(organizationId);
        const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');

        if (criticalAlerts.length === 0) return;

        for (const user of users) {
            for (const alert of criticalAlerts) {
                await this.send({
                    userId: user.id,
                    title: `⚠️ ${alert.title}`,
                    message: `${alert.description}\n\nDue: ${alert.dueDate}\nAction: ${alert.actionRequired}`,
                    type: alert.severity === 'CRITICAL' ? 'ERROR' : 'WARNING',
                    channels: ['IN_APP', 'EMAIL'],
                });
            }
        }
    }

    // ==================== Anomaly Alerts ====================

    /**
     * Check for anomalies and send alerts
     */
    async checkAnomalies(organizationId: string): Promise<void> {
        const users = await this.prisma.user.findMany({
            where: { organizationId },
        });

        const anomalies = await this.aiService.detectAnomalies(organizationId);
        const criticalAnomalies = anomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');

        for (const anomaly of criticalAnomalies) {
            for (const user of users) {
                await this.send({
                    userId: user.id,
                    title: `🔍 Unusual Activity Detected`,
                    message: `${anomaly.description}\n\nAmount: ₹${Number(anomaly.amount).toLocaleString('en-IN')}\nRecommendation: ${anomaly.recommendation}`,
                    type: 'WARNING',
                    channels: ['IN_APP'],
                });
            }
        }
    }

    // ==================== Invoice Reminders ====================

    /**
     * Send invoice payment reminders
     */
    async sendInvoiceReminders(organizationId: string): Promise<void> {
        const overdueInvoices = await this.prisma.invoice.findMany({
            where: {
                organizationId,
                status: 'OVERDUE',
            },
            include: { customer: true },
        });

        const users = await this.prisma.user.findMany({
            where: { organizationId },
        });

        for (const invoice of overdueInvoices) {
            const daysOverdue = Math.floor(
                (Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            for (const user of users) {
                await this.send({
                    userId: user.id,
                    title: `📋 Invoice Overdue: ${invoice.invoiceNumber}`,
                    message: `Invoice for ${invoice.customer?.name} is ${daysOverdue} days overdue.\nAmount: ₹${Number(invoice.amount).toLocaleString('en-IN')}`,
                    type: 'WARNING',
                    channels: ['IN_APP'],
                });
            }
        }
    }

    // ==================== Cash Alert ====================

    /**
     * Send low cash runway alert
     */
    async checkCashRunway(organizationId: string): Promise<void> {
        const cashFlow = await this.aiService.getCashFlowForecast(organizationId);

        if (cashFlow.runwayMonths <= 3) {
            const users = await this.prisma.user.findMany({
                where: { organizationId },
            });

            for (const user of users) {
                await this.send({
                    userId: user.id,
                    title: '🚨 Low Cash Runway Alert',
                    message: `Your cash runway is only ${cashFlow.runwayMonths} months at current burn rate of ₹${(cashFlow.monthlyBurn / 100000).toFixed(1)}L/month. Consider fundraising or cost optimization.`,
                    type: 'ERROR',
                    channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
                });
            }
        }
    }
}
