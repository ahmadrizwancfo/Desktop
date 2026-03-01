import { Module } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountsController } from './bank-accounts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BankSyncService } from './bank-sync/bank-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [BankAccountsController],
  providers: [BankAccountsService, BankSyncService],
  exports: [BankAccountsService],
})
export class BankAccountsModule { }
