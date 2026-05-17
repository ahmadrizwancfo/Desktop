import { Injectable, Logger } from '@nestjs/common';
import { CfoBrainService } from './cfo-brain.service';
import { CfoStateService } from './cfo-state.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatResponse {
    insight: string;
    data?: any;
    chart?: {
        type: 'line' | 'bar' | 'pie';
        data: any[];
    };
    action?: {
        title: string;
        decisionId?: string;
    };
}

@Injectable()
export class CfoChatService {
    private readonly logger = new Logger(CfoChatService.name);

    constructor(
        private readonly brain: CfoBrainService,
        private readonly state: CfoStateService,
        private readonly ai: AiService,
        private readonly prisma: PrismaService,
    ) {}

    async processQuery(organizationId: string, query: string): Promise<ChatResponse> {
        // 1. Get current context
        const report = await this.brain.generateReport(organizationId);
        const cfoState = await this.state.getState(organizationId);
        
        // v7.0 Memory: Retrieve past context (simplified for now)
        const memory = "No previous history";

        // 2. Define tools for the AI
        const tools = {
            get_runway: () => ({
                runwayMonths: report.summary.runwayMonths,
                netBurn: report.summary.netBurn,
                cashInBank: report.summary.cashInBank,
                deathClock: report.decisionEngine.deathClock
            }),
            get_expenses: () => ({
                topCategories: report.categoryBreakdown.slice(0, 5),
                totalExpenses: report.summary.monthlyExpenses
            }),
            simulate_hiring: (count: number, avgSalary: number) => {
                const addedBurn = count * avgSalary;
                const newBurn = report.summary.netBurn + addedBurn;
                const newRunway = report.summary.cashInBank / (newBurn || 1);
                return {
                    originalRunway: report.summary.runwayMonths,
                    newRunway: Number(newRunway.toFixed(1)),
                    impact: Number((report.summary.runwayMonths - newRunway).toFixed(1)),
                    addedBurn
                };
            },
            get_decisions: () => ({
                pending: cfoState.decisionEngine.decisions.filter(d => d.statusV4 !== 'done'),
                completionRate: cfoState.decisionEngine.completionRate
            })
        };

        const context = {
            runway: report.summary.runwayMonths,
            burn: report.summary.netBurn,
            cash: report.summary.cashInBank,
            completionRate: cfoState.decisionEngine.completionRate,
            oneThing: cfoState.decisionEngine.dailyFocus.oneThing?.title,
            memory: memory
        };

        const response = await this.ai.processCfoChat(query, context, tools);

        // v7.0 Memory: Store this interaction (Disabled for now)

        return response;
    }

    // v7.0 PROACTIVE INTELLIGENCE
    async getProactiveSignals(organizationId: string): Promise<any> {
        const report = await this.brain.generateReport(organizationId);
        const { summary, predictiveSignals } = report;

        const signals: any[] = [];

        // 1. Burn Anomaly Detection (Signal Filtering: > 8% spike)
        if (summary.netBurn > (summary.avgBurn3m * 1.08)) {
            signals.push({
                type: 'ANOMALY',
                message: `Your burn increased ${Math.round((summary.netBurn/summary.avgBurn3m - 1) * 100)}% vs last 3 months. Want me to break down where the leakage is?`,
                query: "Break down the burn spike"
            });
        }

        // 2. Runway Risk Trigger
        if (summary.runwayMonths < 6 && (predictiveSignals?.runwayBreachDays || 0) < 150) {
            signals.push({
                type: 'RISK',
                message: `Runway alert: At current acceleration, you breach the 3-month survival zone in ${predictiveSignals?.runwayBreachDays || 0} days. Shall we simulate cost-cutting scenarios?`,
                query: "Simulate cost-cutting for survival"
            });
        }

        // 3. Execution Laggard Trigger
        const cfoState = await this.state.getState(organizationId);
        const completionRate = cfoState.decisionEngine?.completionRate || 0;
        if (completionRate < 40) {
            signals.push({
                type: 'EXECUTION',
                message: `Decision velocity is low (${completionRate}%). Should we review the pending mandates?`,
                query: "Review pending mandates"
            });
        }

        return signals;
    }

    async getSuggestedQuestions(organizationId: string): Promise<string[]> {
        const report = await this.brain.generateReport(organizationId);
        const suggestions = [
            "How long can I survive?",
            "Why did burn increase?",
            "What if I hire 2 people?"
        ];

        if (report.summary.runwayMonths < 12) suggestions.push("Where can I cut costs?");
        if (report.summary.netBurn > report.summary.prevNetBurn) suggestions.push("Explain my spending spikes");

        return suggestions;
    }

    // v7.0 AUTO DECISION CREATION
    async convertToDecision(organizationId: string, insight: string, title?: string): Promise<any> {
        const profile = await this.prisma.startupProfile.findUnique({ where: { organizationId }});
        if (!profile) throw new Error('Startup profile not found.');

        // Use AI to extract structured decision from chat text
        const decisionData = await this.ai.extractDecisionFromChat(insight, title);

        return await this.prisma.cfoDecision.create({
            data: {
                startupProfileId: profile.id,
                decisionDomain: 'GROWTH', // Default to GROWTH for chat-derived actions
                decisionType: decisionData.key || 'CHAT_DERIVED_ACTION',
                severity: 'MEDIUM',
                confidence: 0.9,
                facts: { message: insight, originalTitle: title } as any,
                recommendedActions: (decisionData.recommendedActions || []) as any,
                status: 'OPEN'
            }
        });
    }
}
