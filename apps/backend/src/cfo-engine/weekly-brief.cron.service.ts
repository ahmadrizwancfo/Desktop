import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CfoBriefService } from './cfo-brief.service';
import { EmailService } from '../notifications/email.service';
import { CfoBehaviorService } from './cfo-behavior.service';
import { AutonomousCfoService } from './autonomous-cfo.service';

@Injectable()
export class WeeklyBriefCronService {
    private readonly logger = new Logger(WeeklyBriefCronService.name);

    constructor(
        private prisma: PrismaService,
        private briefService: CfoBriefService,
        private emailService: EmailService,
        private behaviorService: CfoBehaviorService,
        private autoCfoService: AutonomousCfoService,
    ) {}

    @Cron('0 9 * * 1', { timeZone: 'Asia/Kolkata' }) // Monday 9AM IST
    async handleWeeklyBriefCron() {
        this.logger.log('Starting Weekly Brutal Brief distribution...');
        
        const users = await this.prisma.user.findMany({
            where: { organizationId: { not: null } },
            select: { id: true, email: true, organizationId: true, name: true }
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (const user of users) {
            try {
                if (!user.organizationId) continue;

                const brief = await this.briefService.generateWeeklyBrief(user.organizationId);
                if (!brief) continue;

                const { metricsJson, topRisk, topRecommendation } = brief as any;

                const riskySims = await this.prisma.simulationLog.findMany({
                    where: { 
                        organizationId: user.organizationId,
                        riskLevel: 'DANGER',
                        createdAt: { gte: sevenDaysAgo }
                    },
                    take: 2
                });

                const behaviorAudit = (await this.behaviorService.analyzeFounderBehavior(user.id)) || {
                    behaviorScore: 0,
                    complianceScore: 0,
                    avgConfidence: 50,
                    riskProfile: 'Balanced',
                    patterns: [],
                    insights: [],
                    warnings: [],
                    recommendations: []
                };

                const autonomousRecommendations = this.autoCfoService.generateCfoActions({
                    summary: { runwayMonths: metricsJson.runway, netBurn: metricsJson.burn },
                    deathClock: { date: metricsJson.forecast?.estimated_zero_cash_date || null, daysLeft: metricsJson.forecast?.runway_days_remaining || null },
                    behavioralAudit: behaviorAudit
                } as any);
                
                const feedbacks = await this.prisma.actionFeedback.findMany({
                    where: { 
                        userId: user.id,
                        createdAt: { gte: sevenDaysAgo }
                    },
                    include: { action: true },
                    take: 5
                });

                const subject = `Your runway dropped this week.`;
                const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #060913; color: white; border-radius: 12px; border: 1px solid #333;">
                        <h1 style="color: #ef4444; font-size: 24px; text-transform: uppercase; margin-bottom: 20px;">WEEKLY BRUTAL BRIEF</h1>
                        <p style="font-size: 18px; line-height: 1.6; color: #cbd5e1;">Hello ${user.name || 'Founder'},</p>
                        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
                        
                        <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h2 style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Runway Status</h2>
                                <p style="font-size: 24px; font-weight: 800; color: #f8fafc; margin: 0;">${metricsJson.runway.toFixed(1)} months remaining.</p>
                                <p style="color: #fca5a5; font-size: 14px; margin-top: 5px;">Burn: ${metricsJson.burnTrend} | Revenue: ${metricsJson.revenueTrend}</p>
                            </div>
                            <div style="text-align: right; margin-left: 20px;">
                                <h2 style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Compliance Score</h2>
                                <div style="font-size: 24px; font-weight: 800; color: ${behaviorAudit.complianceScore < 50 ? '#ef4444' : '#22c55e'};">${behaviorAudit.complianceScore}%</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px; padding: 20px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0;">
                            <h2 style="font-size: 14px; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">CFO Verdict</h2>
                            <p style="font-size: 18px; font-weight: 600; color: #f8fafc; margin: 0;">
                                ${behaviorAudit.complianceScore < 50 ? 'UNACCEPTABLE DISCIPLINE. You are ignoring survival mandates.' : 
                                  behaviorAudit.complianceScore < 80 ? 'Inconsistent execution. You are leaking cash by de-prioritizing CFO actions.' : 
                                  'Excellent discipline. You are executing survival mandates at a high level.'}
                            </p>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <h2 style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Action Required</h2>
                            <p style="font-size: 18px; font-weight: 700; color: #fff; margin: 0;">${topRecommendation}</p>
                        </div>

                        ${riskySims.length > 0 ? `
                        <div style="margin-bottom: 30px; border: 1px dashed #444; padding: 15px; border-radius: 8px;">
                            <h2 style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Simulated Consequences</h2>
                            ${riskySims.map(sim => `
                                <div style="margin-bottom: 10px;">
                                    <p style="font-size: 13px; color: #fca5a5; margin: 0;">⚠️ Observed impact: ${ (sim.impactSummary as any).warnings?.[0] || 'High risk decision detected' }</p>
                                </div>
                            `).join('')}
                        </div>
                        </div>
                        ` : ''}

                        ${behaviorAudit ? `
                        <div style="margin-bottom: 30px; background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #1e293b;">
                            <h2 style="font-size: 11px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Decision Psychology</h2>
                            <p style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 5px;">Profile: ${behaviorAudit.riskProfile}</p>
                            <p style="font-size: 13px; color: #94a3b8; margin: 0;">Score: ${behaviorAudit.behaviorScore}/100</p>
                            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 15px 0;">
                            <p style="font-size: 14px; color: #cbd5e1; font-style: italic;">"${behaviorAudit.insights[0] || 'Continuing to observe patterns.'}"</p>
                        </div>
                        ` : ''}

                        ${autonomousRecommendations?.priorityActions && autonomousRecommendations.priorityActions.length > 0 ? `
                        <div style="margin-bottom: 30px;">
                            <h2 style="font-size: 11px; color: #f97316; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">CFO Mandates This Week</h2>
                            ${autonomousRecommendations.priorityActions.map(action => `
                                <div style="margin-bottom: 15px; background: #1c1917; border: 1px solid #444; padding: 15px; border-radius: 8px;">
                                    <p style="font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 5px;">🔥 ${action.title}</p>
                                    <p style="font-size: 12px; color: #a8a29e; margin-bottom: 5px;">${action.reasoning}</p>
                                    <p style="font-size: 12px; color: #fb923c; font-weight: 700;">Target: ${action.impact}</p>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}

                        ${feedbacks.length > 0 ? `
                        <div style="margin-bottom: 30px; background: #1e1b4b; padding: 20px; border-radius: 12px; border: 1px solid #3730a3;">
                            <h2 style="font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Strategic Review Loop</h2>
                            <p style="font-size: 14px; color: #c7d2fe; font-weight: 700; margin-bottom: 10px;">The system is learning from your recent corrections:</p>
                            ${feedbacks.map(f => `
                                <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #312e81;">
                                    <p style="font-size: 13px; font-weight: 800; color: #fff; margin: 0;">Ref: ${f.action.title}</p>
                                    <p style="font-size: 12px; color: #94a3b8; font-style: italic; margin-top: 4px;">"${f.message}"</p>
                                </div>
                            `).join('')}
                            <p style="font-size: 11px; color: #818cf8; margin-top: 5px;">Status: Penalties frozen for these items while CFO re-evaluates context.</p>
                        </div>
                        ` : ''}

                        <div style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
                            <h2 style="font-size: 14px; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">CFO Performance Report</h2>
                            <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
                                <div style="flex: 1; padding: 15px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; text-align: center;">
                                    <p style="font-size: 10px; color: #f59e0b; text-transform: uppercase; margin: 0;">Decision Accuracy</p>
                                    <p style="font-size: 24px; font-weight: 900; color: #fff; margin: 5px 0;">${behaviorAudit.avgConfidence}%</p>
                                </div>
                                <div style="flex: 2;">
                                    <p style="font-size: 13px; color: #cbd5e1; margin: 0;">The system is continuously auditing its own projections vs. your bank-sync reality.</p>
                                </div>
                            </div>
                            
                            ${autonomousRecommendations.priorityActions.filter(a => a.isSuppressed).length > 0 ? `
                                <div style="padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; margin-bottom: 15px;">
                                    <p style="font-size: 12px; color: #fca5a5; font-weight: 700; margin: 0;">⚠️ ADAPTIVE SUPPRESSION ACTIVE</p>
                                    <p style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">Some execution categories have been restricted due to recent variance. Manual review required.</p>
                                </div>
                            ` : ''}

                            <h2 style="font-size: 14px; color: #818cf8; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 30px; margin-bottom: 12px;">Decision Quality vs Outcome</h2>
                            <p style="font-size: 13px; color: #94a3b8; margin-bottom: 15px;">We distinguish between good choices and unfortunate external factors. Accuracy reflects process logic, not just market luck.</p>
                            
                            ${autonomousRecommendations.priorityActions.some(a => a.executionLogs?.[0]?.classification === 'GOOD_DECISION_BAD_OUTCOME') ? `
                                <div style="padding: 15px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; margin-bottom: 20px;">
                                    <p style="font-size: 12px; color: #818cf8; font-weight: 900; margin: 0; text-transform: uppercase;">Contextual Variance Detected</p>
                                    <p style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">Some recent actions followed financial best practices but encountered external variance. The CFO Intelligence Engine has protected your internal accuracy score for these items.</p>
                                </div>
                            ` : ''}

                            <h2 style="font-size: 14px; color: #818cf8; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 30px; margin-bottom: 12px;">Recent Execution Impact</h2>
                            ${autonomousRecommendations.priorityActions.filter(a => a.isExecutable).length > 0 ? `
                                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 15px;">Trust Zone active. Recent system-applied actions are being monitored for bank-sync verification.</p>
                                ${autonomousRecommendations.priorityActions.filter(a => a.isExecutable).slice(0, 3).map(a => `
                                    <div style="background: rgba(129, 140, 248, 0.05); border: 1px solid rgba(129, 140, 248, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                                        <p style="font-size: 14px; font-weight: 700; color: #fff; margin: 0;">${a.title}</p>
                                        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                            <span style="font-size: 11px; color: #818cf8; font-weight: 800; text-transform: uppercase;">Expected: ${a.impact}</span>
                                            <span style="font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Status: Signal Stabilizing</span>
                                        </div>
                                    </div>
                                `).join('')}
                                <p style="font-size: 11px; color: #475569; margin-top: 15px;">All system-applied actions remain protected by 1-Click Rollback.</p>
                            ` : `<p style="font-size: 12px; color: #64748b;">No system-applied actions this cycle. 1-Click execution is available for high-trust mandates.</p>`}
                        </div>

                        <p style="font-size: 14px; color: #64748b; font-style: italic; margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
                            "If this continues, you will hit risk zone in ${Math.round(metricsJson.forecast.runway_days_remaining / 7)} weeks."
                        </p>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="http://localhost:3000/dashboard" style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em;">Take Action Now</a>
                        </div>
                        
                        <p style="margin-top: 40px; font-size: 11px; color: #475569; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">
                            Generated by FounderCFO Intelligence Engine. Private & Confidential.
                        </p>
                    </div>
                `;

                await this.emailService.sendEmail(user.email, subject, html);
            } catch (error) {
                this.logger.error(`Error sending weekly brief to ${user.email}`, error.stack);
            }
        }
    }
}
