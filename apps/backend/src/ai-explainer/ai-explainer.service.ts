import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiExplainerService {
    private readonly logger = new Logger(AiExplainerService.name);
    private model: GenerativeModel | null = null;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.initModel();
    }

    private initModel(): void {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey || apiKey.startsWith('PASTE') || apiKey.startsWith('YOUR')) {
            this.logger.warn('GEMINI_API_KEY not configured – falling back to template explanations');
            return;
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.logger.log('AiExplainer initialized with gemini-1.5-flash');
    }

    // ─── Tone helper ────────────────────────────────────────────────────────────

    private getTone(severity: string): 'urgent' | 'calm' | 'neutral' {
        if (severity === 'CRITICAL' || severity === 'HIGH') return 'urgent';
        if (severity === 'MEDIUM') return 'calm';
        return 'neutral';
    }

    // ─── Public: explain a decision ─────────────────────────────────────────────

    async explain(decisionId: string): Promise<{ explanation: string; cached: boolean }> {
        // Return cached explanation if already exists
        const existing = await this.prisma.aiExplanation.findUnique({
            where: { cfoDecisionId: decisionId },
        });
        if (existing) {
            return { explanation: existing.explanationText, cached: true };
        }

        const decision = await this.prisma.cfoDecision.findUnique({
            where: { id: decisionId },
            include: { startupProfile: true },
        });
        if (!decision) throw new Error(`CfoDecision not found: ${decisionId}`);

        const tone = this.getTone(decision.severity);
        const startTime = Date.now();
        let explanationText: string;
        let modelUsed = 'fallback';

        if (this.model) {
            const prompt = this.buildPrompt(decision, tone);
            try {
                const result = await this.model.generateContent(prompt);
                explanationText = result.response.text().trim();
                modelUsed = 'gemini-1.5-flash';
            } catch (err) {
                this.logger.error(`Gemini explanation failed: ${err.message}`);
                explanationText = this.buildFallback(decision, tone);
            }
        } else {
            explanationText = this.buildFallback(decision, tone);
        }

        const latencyMs = Date.now() - startTime;

        await this.prisma.aiExplanation.create({
            data: {
                cfoDecisionId: decisionId,
                modelUsed,
                explanationText,
                tone,
                latencyMs,
            },
        });

        return { explanation: explanationText, cached: false };
    }

    async getExplanation(decisionId: string) {
        return this.prisma.aiExplanation.findUnique({
            where: { cfoDecisionId: decisionId },
        });
    }

    // ─── Prompt builder ──────────────────────────────────────────────────────────

    private buildPrompt(decision: any, tone: string): string {
        const toneInstruction = {
            urgent: 'Write in a direct, urgent tone. Be concise and action-oriented. No fluff.',
            calm: 'Write in a calm, informative tone. Be reassuring but honest.',
            neutral: 'Write in a neutral, factual tone.',
        }[tone];

        return `You are a plain-English CFO advisor explaining a structured financial decision to a startup founder.

CRITICAL RULES:
- DO NOT recalculate any numbers
- DO NOT change or dispute the severity, facts, or recommended actions
- ONLY explain what the data means in simple, founder-friendly language
- Write exactly 3 sentences — no more, no less
- ${toneInstruction}
- Write in second person ("Your runway..." not "The company's runway...")

DECISION DATA:
Domain: ${decision.decisionDomain}
Type: ${decision.decisionType}
Severity: ${decision.severity}
Facts: ${JSON.stringify(decision.facts, null, 2)}
Top Action: ${(decision.recommendedActions as string[])[0] ?? 'Review your dashboard'}

Company Context:
- Stage: ${decision.startupProfile?.stage}
- Goal: ${decision.startupProfile?.primaryGoal}
- Industry: ${decision.startupProfile?.industry}

Write the 3-sentence explanation now:`;
    }

    // ─── Fallback templates ──────────────────────────────────────────────────────

    private buildFallback(decision: any, tone: string): string {
        const facts = decision.facts as Record<string, any>;
        const isUrgent = tone === 'urgent';

        switch (decision.decisionType) {
            case 'RUNWAY_RISK':
                return isUrgent
                    ? `Your runway is critically low at ${facts.runway_months ?? '?'} months — you are burning ₹${(Number(facts.monthly_burn) / 100000).toFixed(1)}L per month against ₹${(Number(facts.cash_balance) / 100000).toFixed(1)}L in the bank. At this rate, action within the next few weeks is not optional — it is survival. Start cost cuts and fundraising conversations immediately.`
                    : `Your runway is ${facts.runway_months ?? '?'} months based on your current burn of ₹${(Number(facts.monthly_burn) / 100000).toFixed(1)}L/month. This gives you a reasonable window to plan — but you should start building a financial buffer now. Consider setting a hard target to extend runway beyond 12 months.`;

            case 'BURN_UNSUSTAINABLE':
                return isUrgent
                    ? `Your expenses are running at ${facts.burn_ratio}x your revenue, meaning you are spending significantly more than you earn. This burn rate is unsustainable and will deplete your cash reserves faster than expected. Audit your top expense categories this week and target a 20% reduction.`
                    : `Your expenses are at ${facts.burn_ratio}x revenue — slightly above breakeven. While not an emergency, this gap needs to close as you scale. Focus on growing revenue faster than costs to improve your efficiency ratio.`;

            case 'REVENUE_SLOWDOWN':
                return `Your revenue is covering only ${Math.round((facts.revenue_coverage_ratio ?? 0) * 100)}% of your expense base, signaling that revenue growth may not be keeping pace with costs. This is a common challenge at the ${facts.stage ?? 'early'} stage, but it requires attention before it compounds. Review your pricing, acquisition channels, and cut non-performing spend.`;

            case 'HIRING_RISK':
                return isUrgent
                    ? `Adding a new team member would reduce your runway to ${facts.post_hire_runway_months ?? '?'} months — dangerously low. Hiring at this juncture could put the company at serious risk if revenues don't accelerate. Consider contractors or delaying this hire until runway exceeds 6 months post-hire.`
                    : `Your runway remains solid at ${facts.post_hire_runway_months ?? '?'} months even after accounting for a new hire. This is a manageable position — proceed with hiring but ensure each new team member has a clear path to ROI. Reassess after each hire.`;

            case 'FUNDRAISE_URGENCY':
                return isUrgent
                    ? `With ${facts.runway_months ?? '?'} months of runway and a goal to raise capital, you are entering the critical fundraising window right now. Fundraising typically takes 3–4 months, meaning your window is narrowing. Start investor outreach, freeze major expenses, and treat this as your top priority.`
                    : `Your runway of ${facts.runway_months ?? '?'} months gives you moderate time to run a fundraising process. Begin preparing your deck and building investor relationships now so you have options before it becomes urgent. Freeze non-essential capital expenses during the raise.`;

            case 'GST_DUE':
                return `Your GSTR-3B filing is due in ${facts.days_until_deadline ?? '?'} day${facts.days_until_deadline === 1 ? '' : 's'} — missing this deadline incurs a ₹50/day late fee and can trigger scrutiny. Ensure all input tax credits are reconciled and the payment is submitted before the 20th. Contact your CA today if anything is pending.`;

            default:
                return `Your CFO engine detected a ${decision.severity?.toLowerCase()} severity issue in the ${decision.decisionDomain?.toLowerCase()} domain. Review the recommended actions and address this before your next financial review. Contact a CFO advisor if you need further guidance.`;
        }
    }
}
