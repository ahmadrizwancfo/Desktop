import { Module, forwardRef } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { ZohoService } from './zoho.service';
import { QuickbooksService } from './quickbooks.service';
import { SyncEngineService } from './sync-engine.service';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';
import { WebhooksController } from './webhooks.controller';

@Module({
    imports: [PrismaModule, StartupProfileModule, forwardRef(() => CfoEngineModule)],
    controllers: [IntegrationsController, WebhooksController],
    providers: [IntegrationsService, RazorpayService, ZohoService, QuickbooksService, SyncEngineService],
    exports: [IntegrationsService, RazorpayService, ZohoService, QuickbooksService, SyncEngineService],
})
export class IntegrationsModule {}
