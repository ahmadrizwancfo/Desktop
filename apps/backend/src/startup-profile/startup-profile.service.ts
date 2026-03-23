import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStartupProfileDto } from './dto/create-startup-profile.dto';
import { CfoEngineService } from '../cfo-engine/cfo-engine.service';
import { AiExplainerService } from '../ai-explainer/ai-explainer.service';

@Injectable()
export class StartupProfileService {
    private readonly logger = new Logger(StartupProfileService.name);

    constructor(
        private prisma: PrismaService,
        private cfoEngine: CfoEngineService,
        private aiExplainer: AiExplainerService,
    ) { }

    async upsert(userId: string, dto: CreateStartupProfileDto) {
        this.logger.log(`Upserting startup profile for user ${userId}`);

        // Resolve organizationId — get from user if not provided
        let organizationId = dto.organizationId;
        if (!organizationId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { organizationId: true },
            });
            organizationId = user?.organizationId ?? userId; // fallback to userId as org key
        }

        const profile = await this.prisma.startupProfile.upsert({
            where: { userId },
            create: {
                userId,
                organizationId,
                companyName: dto.companyName,
                stage: dto.stage,
                monthlyRevenue: dto.monthlyRevenue,
                monthlyExpenses: dto.monthlyExpenses,
                cashInBank: dto.cashInBank,
                teamSize: dto.teamSize,
                country: dto.country ?? 'IN',
                industry: dto.industry,
                primaryGoal: dto.primaryGoal,
            },
            update: {
                companyName: dto.companyName,
                stage: dto.stage,
                monthlyRevenue: dto.monthlyRevenue,
                monthlyExpenses: dto.monthlyExpenses,
                cashInBank: dto.cashInBank,
                teamSize: dto.teamSize,
                country: dto.country ?? 'IN',
                industry: dto.industry,
                primaryGoal: dto.primaryGoal,
            },
        });

        // ── AUTO-TRIGGER: CFO Decision Engine ─────────────────────────────────
        // Engine runs deterministically on every profile save. This is the core product loop.
        this.runEngineAndExplain(profile.id, userId).catch((err) =>
            this.logger.error(`Engine auto-trigger failed: ${err.message}`),
        );

        // ── AUTO-TRIGGER: Financial Snapshot ──────────────────────────────────
        this.createSnapshot(userId, organizationId, dto).catch((err) =>
            this.logger.error(`Snapshot creation failed: ${err.message}`),
        );

        return profile;
    }

    /**
     * Run the 6-domain CFO engine, then generate AI explanations for all new decisions.
     * Non-blocking — errors are logged but don't affect the profile save.
     */
    private async runEngineAndExplain(profileId: string, userId: string): Promise<void> {
        this.logger.log(`Auto-triggering CFO engine for profile ${profileId}`);
        const decisions = await this.cfoEngine.runEngine(profileId, userId);

        // Generate AI explanations for each new decision (fire-and-forget per decision)
        for (const decision of decisions) {
            this.aiExplainer.explain(decision.id).catch((err) =>
                this.logger.warn(`AI explanation failed for decision ${decision.id}: ${err.message}`),
            );
        }

        this.logger.log(`CFO engine completed: ${decisions.length} decisions, explanations queued`);
    }

    /**
     * Save a point-in-time financial snapshot for trend tracking.
     */
    private async createSnapshot(
        userId: string,
        organizationId: string,
        dto: CreateStartupProfileDto,
    ): Promise<void> {
        const revenue = Number(dto.monthlyRevenue) || 0;
        const expenses = Number(dto.monthlyExpenses) || 0;
        const burn = Math.max(expenses - revenue, 0);

        await this.prisma.financialSnapshot.create({
            data: {
                userId,
                organizationId,
                revenue: dto.monthlyRevenue,
                expenses: dto.monthlyExpenses,
                cashBalance: dto.cashInBank,
                burn,
            },
        });
        this.logger.log(`Financial snapshot saved for user ${userId}`);
    }

    async findByUser(userId: string) {
        return this.prisma.startupProfile.findUnique({
            where: { userId },
            include: {
                cfoDecisions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: { aiExplanation: true },
                },
            },
        });
    }

    async findById(id: string) {
        return this.prisma.startupProfile.findUnique({
            where: { id },
        });
    }
}

