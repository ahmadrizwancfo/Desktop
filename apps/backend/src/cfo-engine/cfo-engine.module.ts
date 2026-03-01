import { Module } from '@nestjs/common';
import { CfoEngineController } from './cfo-engine.controller';
import { CfoEngineService } from './cfo-engine.service';
import { CfoAlertService } from './cfo-alert.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, StartupProfileModule, NotificationsModule],
    controllers: [CfoEngineController],
    providers: [CfoEngineService, CfoAlertService],
    exports: [CfoEngineService],
})
export class CfoEngineModule { }
