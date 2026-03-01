import { Module } from '@nestjs/common';
import { InvestorMetricsController } from './investor-metrics.controller';
import { InvestorMetricsService } from './investor-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [InvestorMetricsController],
    providers: [InvestorMetricsService],
    exports: [InvestorMetricsService],
})
export class InvestorMetricsModule { }
