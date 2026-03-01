import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStartupProfileDto } from './dto/create-startup-profile.dto';

@Injectable()
export class StartupProfileService {
    private readonly logger = new Logger(StartupProfileService.name);

    constructor(private prisma: PrismaService) { }

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

        return this.prisma.startupProfile.upsert({
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
