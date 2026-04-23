import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend;
    private fromEmail: string;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        this.resend = new Resend(apiKey);
        this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'founder-cfo@foundercfo.in';
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const data = await this.resend.emails.send({
                from: this.fromEmail,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully to ${to}. ID: ${data.data?.id}`);
            return data;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.stack);
            // Graceful fallback: just log it but don't crash
            return null;
        }
    }
}
