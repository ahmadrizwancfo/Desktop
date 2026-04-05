import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { ZohoService } from './zoho.service';
import { QuickbooksService } from './quickbooks.service';

@Module({
    imports: [PrismaModule, StartupProfileModule],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, RazorpayService, ZohoService, QuickbooksService],
    exports: [IntegrationsService, RazorpayService, ZohoService, QuickbooksService],
})
export class IntegrationsModule {}
