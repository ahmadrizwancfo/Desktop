import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { SmartNotificationsService } from './smart-notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
    imports: [PrismaModule, ConfigModule, AiModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, SmartNotificationsService],
    exports: [NotificationsService, SmartNotificationsService],
})
export class NotificationsModule { }
