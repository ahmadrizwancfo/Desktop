import { Module } from '@nestjs/common';
import { RegressionRunnerService } from './regression-runner.service';
import { DriftDetectorService } from './drift-detector.service';
import { ReliabilityLabService } from './reliability-lab.service';
import { ReliabilityLabController } from './reliability-lab.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StatementsModule } from '../statements/statements.module';

@Module({
    imports: [PrismaModule, StatementsModule],
    controllers: [ReliabilityLabController],
    providers: [
        RegressionRunnerService,
        DriftDetectorService,
        ReliabilityLabService,
    ],
    exports: [
        RegressionRunnerService,
        DriftDetectorService,
        ReliabilityLabService,
    ],
})
export class ReliabilityLabModule {}
