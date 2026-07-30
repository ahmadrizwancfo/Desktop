import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RazorpayService } from './razorpay.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { ZohoService } from './zoho.service';
import { QuickbooksService } from './quickbooks.service';
import { SyncEngineService } from './sync-engine.service';
import { BankSyncProcessor } from './bank-sync.processor';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';
import { WebhooksController } from './webhooks.controller';
import { TallyModule } from './tally/tally.module';
import { IntegrationRegistryService } from './services/integration-registry.service';
import { MockProviderAdapter } from './providers/mock/mock-provider-adapter.service';
import { INTEGRATION_PROVIDER_TOKEN } from './interfaces/base-provider-adapter.interface';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
    imports: [
        PrismaModule,
        StartupProfileModule,
        forwardRef(() => CfoEngineModule),
        TallyModule,
        PipelineModule,
        BullModule.registerQueue({
            name: 'bank-sync-queue',
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 3000,
                },
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400, count: 1000 },
            },
        }),
    ],
    controllers: [IntegrationsController, WebhooksController],
    providers: [
        IntegrationsService,
        RazorpayService,
        ZohoService,
        QuickbooksService,
        SyncEngineService,
        BankSyncProcessor,
        IntegrationRegistryService,
        MockProviderAdapter,
        {
            provide: INTEGRATION_PROVIDER_TOKEN,
            useFactory: (mockAdapter: MockProviderAdapter) => [mockAdapter],
            inject: [MockProviderAdapter],
        },
    ],
    exports: [
        IntegrationsService,
        RazorpayService,
        ZohoService,
        QuickbooksService,
        SyncEngineService,
        TallyModule,
        BullModule,
        IntegrationRegistryService,
        MockProviderAdapter,
        PipelineModule,
    ],
})
export class IntegrationsModule {}

