import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BankingService } from './banking.service';
import { SandboxBankingProvider } from './providers/sandbox.provider';
import { BankingController } from './banking.controller';

@Module({
    imports: [ConfigModule],
    controllers: [BankingController],
    providers: [BankingService, SandboxBankingProvider],
    exports: [BankingService]
})
export class BankingModule { }
