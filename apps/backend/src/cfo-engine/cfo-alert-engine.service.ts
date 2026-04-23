import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CfoForecastService } from './cfo-forecast.service';
import { EmailService } from '../notifications/email.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CfoAlertEngineService {
    private readonly logger = new Logger(CfoAlertEngineService.name);

    constructor(
        private prisma: PrismaService,
        private forecastService: CfoForecastService,
        private emailService: EmailService,
    ) { }

    /**
     * Runs every 12 hours to evaluate financial health and trigger alerts.
     */
    @Cron(CronExpression.EVERY_12_HOURS)
    async runAlertEngine() {
        this.logger.log('🚀 Starting Critical Alert Evaluation Engine...');
        
        const users = await this.prisma.user.findMany({
            where: { organizationId: { not: null } },
            select: { id: true, email: true, organizationId: true, name: true }
        });

        for (const user of users) {
            try {
                // Ensure organization check
                if (!user.organizationId) continue;
                await this.evaluateUserAlerts(user as any); // Cast or assert based on where filter
            } catch (error) {
                this.logger.error(`Error evaluating alerts for user ${user.id}: ${error.message}`, error.stack);
            }
        }
    }

    async evaluateUserAlerts(user: { id: string, email: string, organizationId: string, name: string | null }) {
        const startupProfile = await this.prisma.startupProfile.findUnique({
            where: { userId: user.id }
        });
        if (!startupProfile) return;

        // 1. Get current metrics
        const currentForecast = await this.forecastService.generateForecast(user.id, user.organizationId);
        if (!currentForecast) return;

        // 2. Get previous metrics from MetricSnapshots
        const previousMetrics = await this.getPreviousMetrics(user.organizationId);
        
        // 3. Compare and classify
        const alerts = this.classifyAlerts(currentForecast, previousMetrics);
        
        // 4. Handle Alerts
        for (const alertData of alerts) {
            await this.processAlert(user, startupProfile, alertData);
        }

        // 5. Track Inertia (Behavioral)
        await this.trackInertia(user, startupProfile);

        // 6. Save current snapshot as "previous" for next run
        await this.saveMetricSnapshots(user.organizationId, currentForecast);
    }

    private classifyAlerts(current: any, previous: any) {
        const alerts: any[] = [];
        const currentRunway = current.runway_days_remaining / 30;
        const currentBurn = current.dailyBurnRate;

        if (!previous || !previous.runway_months || !previous.daily_burn) {
            this.logger.log('First run for user, no previous metrics to compare.');
            return [];
        }

        const runwayDrop = previous.runway_months - currentRunway;
        const runwayDropPct = (runwayDrop / previous.runway_months) * 100;
        const burnIncreasePct = ((currentBurn - previous.daily_burn) / previous.daily_burn) * 100;

        // Cash zero date shift
        const prevZeroDate = previous.zero_date ? new Date(previous.zero_date).getTime() : 0;
        const currZeroDate = current.estimated_zero_cash_date ? new Date(current.estimated_zero_cash_date).getTime() : 0;
        const zeroDateShiftDays = prevZeroDate ? (prevZeroDate - currZeroDate) / (1000 * 60 * 60 * 24) : 0;

        // TIER 1: CRITICAL
        if (runwayDropPct >= 15 || burnIncreasePct >= 20 || zeroDateShiftDays >= 10 || current.runway_days_remaining < 60) {
            alerts.push({
                severity: 'CRITICAL',
                type: 'RUNWAY_CRASH',
                message: `CRITICAL: Your runway dropped by ${Math.round(runwayDropPct)}%. You have ${currentRunway.toFixed(1)} months remaining.`,
                metadata: {
                    prevRunway: previous.runway_months,
                    currRunway: currentRunway,
                    prevBurn: previous.daily_burn,
                    currBurn: currentBurn,
                    zeroShift: zeroDateShiftDays,
                    zeroDate: current.estimated_zero_cash_date
                }
            });
        }
        // TIER 2: WARNING
        else if (runwayDropPct >= 5 || burnIncreasePct >= 10 || zeroDateShiftDays >= 5) {
            alerts.push({
                severity: 'WARNING',
                type: 'BURN_WARNING',
                message: `WARNING: Burn rate increased by ${Math.round(burnIncreasePct)}%. Runway tightening.`,
                metadata: {
                    prevRunway: previous.runway_months,
                    currRunway: currentRunway,
                    prevBurn: previous.daily_burn,
                    currBurn: currentBurn
                }
            });
        }

        return alerts;
    }

    private async processAlert(user: any, profile: any, alertData: any) {
        // Create Alert Record
        await this.prisma.alert.create({
            data: {
                userId: String(user.id),
                organizationId: String(user.organizationId),
                alertType: String(alertData.type),
                severity: String(alertData.severity),
                message: String(alertData.message),
                metadata: alertData.metadata || {}
            }
        });

        // Email logic (CRITICAL only + Cooldown)
        if (alertData.severity === 'CRITICAL') {
            const cooldownWindow = 24 * 60 * 60 * 1000; // 24 hours
            const lastEmail = profile.lastCriticalEmailSentAt;
            const now = new Date();

            if (!lastEmail || (now.getTime() - lastEmail.getTime() > cooldownWindow)) {
                await this.sendCriticalEmail(user, alertData);
                await this.prisma.startupProfile.update({
                    where: { id: profile.id },
                    data: { lastCriticalEmailSentAt: now }
                });
            }
        }

        // Update lastAlertGeneratedAt
        await this.prisma.startupProfile.update({
            where: { id: profile.id },
            data: { lastAlertGeneratedAt: new Date() }
        });
    }

    private async sendCriticalEmail(user: any, alertData: any) {
        const userDisplayName = user.fullName || user.name || 'Founder';
        const subject = "Your runway just changed.";
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; background-color: #060913; color: white; border-radius: 16px; border: 1px solid #ef444450;">
                <h2 style="color: #ef4444; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 20px;">Critical Intelligence Alert</h2>
                <p style="font-size: 18px; line-height: 1.6; color: #94a3b8;">${userDisplayName},</p>
                <h1 style="font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 30px; color: #fff;">
                    At your current pace, you hit zero cash on <span style="color: #ef4444;">${new Date(alertData.metadata.zeroDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>.
                </h1>
                
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 40px;">
                    <p style="font-size: 18px; font-weight: bold; margin: 0; color: #fecaca;">${alertData.message}</p>
                </div>

                <p style="font-size: 16px; color: #94a3b8; line-height: 1.8; margin-bottom: 40px;">
                    This delay in correcting spend or accelerating revenue is compounding. If you ignore this signal, your options for recovery diminish by the day.
                </p>

                <div style="text-align: center;">
                    <a href="http://localhost:3000/dashboard" style="background-color: #ef4444; color: white; padding: 18px 36px; text-decoration: none; border-radius: 12px; font-weight: 900; display: inline-block; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);">Review & Fix Decisions Now</a>
                </div>
            </div>
        `;
        await this.emailService.sendEmail(user.email, subject, html);
    }

    private async trackInertia(user: any, profile: any) {
        // Track ignored alerts count (unread alerts older than 24h)
        const unreadAlerts = await this.prisma.alert.count({
            where: {
                userId: user.id,
                acknowledged: false,
                createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        });

        // Track days since last decision action
        const lastAction = await this.prisma.cfoDecision.findFirst({
            where: { startupProfileId: profile.id, status: { in: ['ACKNOWLEDGED', 'RESOLVED'] } },
            orderBy: { updatedAt: 'desc' }
        });

        const lastActionDate = lastAction ? lastAction.updatedAt : profile.createdAt;
        const daysSinceLastAction = Math.floor((Date.now() - lastActionDate.getTime()) / (24 * 60 * 60 * 1000));

        await this.prisma.startupProfile.update({
            where: { id: profile.id },
            data: {
                ignoredAlertsCount: unreadAlerts,
                daysSinceLastAction: daysSinceLastAction
            }
        });

        if (unreadAlerts > 3 || daysSinceLastAction > 7) {
            // Generate synthetic inertia alert
            await this.prisma.alert.create({
                data: {
                    userId: user.id,
                    organizationId: user.organizationId,
                    alertType: 'INERTIA_WARNING',
                    severity: 'WARNING',
                    message: `CRITICAL INERTIA: You have ignored signals for ${daysSinceLastAction} days. Financial decay is accelerating.`,
                }
            });
        }
    }

    private async getPreviousMetrics(organizationId: string) {
        const snapshots = await this.prisma.metricSnapshot.findMany({
            where: { 
                organizationId,
                metricKey: { in: ['runway_months', 'burn_rate', 'zero_date_ts'] }
            },
            orderBy: { recordedAt: 'desc' },
        });

        if (snapshots.length < 2) return null;

        return {
            runway_months: Number(snapshots.find(s => s.metricKey === 'runway_months')?.value || 0),
            daily_burn: Number(snapshots.find(s => s.metricKey === 'burn_rate')?.value || 0),
            zero_date: Number(snapshots.find(s => s.metricKey === 'zero_date_ts')?.value || 0)
        };
    }

    private async saveMetricSnapshots(organizationId: string, data: any) {
        const timestamp = new Date().toISOString().slice(0, 13); // Cache per hour for precision
        
        const metrics = [
            { key: 'runway_months', val: data.runway_days_remaining / 30 },
            { key: 'burn_rate', val: data.dailyBurnRate },
            { key: 'zero_date_ts', val: data.estimated_zero_cash_date ? new Date(data.estimated_zero_cash_date).getTime() : 0 }
        ];

        for (const m of metrics) {
            await this.prisma.metricSnapshot.upsert({
                where: {
                    organizationId_metricKey_period: {
                        organizationId,
                        metricKey: m.key,
                        period: timestamp
                    }
                },
                create: {
                    organizationId,
                    metricKey: m.key,
                    period: timestamp,
                    value: m.val,
                    recordedAt: new Date()
                },
                update: {
                    value: m.val,
                    recordedAt: new Date()
                }
            });
        }
    }
}
