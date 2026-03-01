import { Module } from '@nestjs/common';
import { AiExplainerController } from './ai-explainer.controller';
import { AiExplainerService } from './ai-explainer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AiExplainerController],
    providers: [AiExplainerService],
    exports: [AiExplainerService],
})
export class AiExplainerModule { }
