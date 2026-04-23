import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BankingService } from './banking.service';
import { SandboxBankingProvider } from './providers/sandbox.provider';
import { BankingController } from './banking.controller';
import { CfoEngineModule } from '../../cfo-engine/cfo-engine.module';

@Module({
    imports: [ConfigModule, CfoEngineModule],
    controllers: [BankingController],
    providers: [BankingService, SandboxBankingProvider],
    exports: [BankingService]
})
export class BankingModule { }
