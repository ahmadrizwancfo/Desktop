import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentImportService } from './document-import.service';
import { OcrController } from './ocr.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [ConfigModule, PrismaModule, forwardRef(() => AiModule)],
    controllers: [OcrController],
    providers: [OcrService, DocumentAnalysisService, DocumentImportService],
    exports: [OcrService, DocumentAnalysisService, DocumentImportService],
})
export class OcrModule { }
