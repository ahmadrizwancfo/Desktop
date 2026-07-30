import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { OcrService } from './ocr.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentImportService } from './document-import.service';
import { OcrReviewService } from './ocr-review.service';
import { OcrController } from './ocr.controller';
import { OcrProcessor } from './ocr.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        forwardRef(() => AiModule),
        BullModule.registerQueue({
            name: 'ocr-queue',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400, count: 1000 },
            },
        }),
    ],
    controllers: [OcrController],
    providers: [OcrService, DocumentAnalysisService, DocumentImportService, OcrReviewService, OcrProcessor],
    exports: [OcrService, DocumentAnalysisService, DocumentImportService, OcrReviewService, BullModule],
})
export class OcrModule { }
