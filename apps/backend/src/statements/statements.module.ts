import { Module } from '@nestjs/common';
import { StatementsService } from './statements.service';
import { StatementsController } from './statements.controller';
import { AiModule } from '../ai/ai.module';
import { UniversalParserService } from './parsers/universal-parser.service';
import { FinancialAnalyzerService } from './analyzers/financial-analyzer.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AiModule, ConfigModule],
  controllers: [StatementsController],
  providers: [StatementsService, UniversalParserService, FinancialAnalyzerService],
  exports: [StatementsService],
})
export class StatementsModule { }
