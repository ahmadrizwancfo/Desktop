import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiMetricsService } from './ai-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [AiService, AiMetricsService],
  controllers: [AiController],
  exports: [AiService, AiMetricsService]
})
export class AiModule { }
