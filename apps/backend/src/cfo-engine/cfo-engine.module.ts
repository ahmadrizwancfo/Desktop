import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CfoEngineController } from './cfo-engine.controller';
import { CfoEngineService } from './cfo-engine.service';
import { CfoAlertService } from './cfo-alert.service';
import { CfoSchedulerService } from './cfo-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiExplainerModule } from '../ai-explainer/ai-explainer.module';

@Module({
    imports: [
        PrismaModule,
        ScheduleModule.forRoot(),
        forwardRef(() => StartupProfileModule),
        NotificationsModule,
        AiExplainerModule,
    ],
    controllers: [CfoEngineController],
    providers: [CfoEngineService, CfoAlertService, CfoSchedulerService],
    exports: [CfoEngineService],
})
export class CfoEngineModule { }

