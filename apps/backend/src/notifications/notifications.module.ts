import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { SmartNotificationsService } from './smart-notifications.service';
import { NotificationsController } from './notifications.controller';
import { WeeklyBriefController } from './weekly-brief.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

import { EmailService } from './email.service';

@Global()
@Module({
    imports: [PrismaModule, ConfigModule, AiModule],
    controllers: [NotificationsController, WeeklyBriefController],
    providers: [NotificationsService, SmartNotificationsService, EmailService],
    exports: [NotificationsService, SmartNotificationsService, EmailService],
})
export class NotificationsModule { }
