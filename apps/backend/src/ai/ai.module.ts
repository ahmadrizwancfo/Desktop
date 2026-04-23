import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiMetricsService } from './ai-metrics.service';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule,
    forwardRef(() => CfoEngineModule)
  ],
  providers: [AiService, AiMetricsService],
  controllers: [AiController],
  exports: [AiService, AiMetricsService]
})
export class AiModule { }
