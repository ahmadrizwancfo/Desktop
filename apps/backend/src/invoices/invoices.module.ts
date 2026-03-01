import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentReminderService } from './payment-reminder.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PaymentReminderService],
  exports: [InvoicesService, PaymentReminderService],
})
export class InvoicesModule { }
