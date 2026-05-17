import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CfoEngineController } from './cfo-engine.controller';
import { CfoEngineService } from './cfo-engine.service';
import { CfoAlertService } from './cfo-alert.service';
import { CfoBrainService } from './cfo-brain.service';
import { CfoStateService } from './cfo-state.service';
import { CfoSchedulerService } from './cfo-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiExplainerModule } from '../ai-explainer/ai-explainer.module';
import { AiModule } from '../ai/ai.module';

import { CfoMetricsService } from './cfo-metrics.service';
import { CfoBriefService } from './cfo-brief.service';
import { CfoForecastService } from './cfo-forecast.service';
import { WeeklyBriefCronService } from './weekly-brief.cron.service';
import { CfoAlertEngineService } from './cfo-alert-engine.service';
import { CfoBehaviorService } from './cfo-behavior.service';
import { AutonomousCfoService } from './autonomous-cfo.service';
import { CfoExecutionService } from './cfo-execution.service';
import { CfoAutoExecutionService } from './cfo-auto-execution.service';
import { CfoExecutionIntelligenceService } from './cfo-execution-intelligence.service';
import { CfoContextService } from './cfo-context.service';
import { CfoAutoPilotService } from './cfo-auto-pilot.service';
import { AutoPilotCronService } from './auto-pilot.cron.service';
import { AutoPilotExecutionCron } from './auto-pilot-execution.cron';
import { TrustLanguageService } from './trust-language.service';
import { DecisionEngineService } from './decision-engine.service';
import { CfoResolutionService } from './cfo-resolution.service';

import { CfoChatController } from './cfo-chat.controller';
import { CfoChatService } from './cfo-chat.service';

@Module({
    imports: [
        PrismaModule,
        ScheduleModule.forRoot(),
        forwardRef(() => StartupProfileModule),
        forwardRef(() => AiModule),
        AiExplainerModule,
    ],
    controllers: [CfoEngineController, CfoChatController],
    providers: [
        CfoEngineService, 
        CfoAlertService, 
        CfoBrainService, 
        CfoStateService, 
        CfoSchedulerService, 
        CfoMetricsService, 
        CfoBriefService, 
        CfoForecastService, 
        WeeklyBriefCronService, 
        CfoAlertEngineService, 
        CfoBehaviorService, 
        AutonomousCfoService,
        CfoExecutionService,
        CfoAutoExecutionService,
        CfoExecutionIntelligenceService,
        CfoContextService,
        TrustLanguageService,
        CfoAutoPilotService,
        AutoPilotCronService,
        AutoPilotExecutionCron,
        DecisionEngineService,
        CfoResolutionService,
        CfoChatService,
    ],
    exports: [
        CfoEngineService, 
        CfoBrainService, 
        CfoStateService, 
        CfoMetricsService, 
        CfoBriefService, 
        CfoForecastService, 
        CfoAlertEngineService, 
        CfoBehaviorService, 
        AutonomousCfoService,
        CfoExecutionService,
        CfoAutoExecutionService,
        CfoExecutionIntelligenceService,
        CfoContextService,
        CfoAutoPilotService,
        TrustLanguageService,
        DecisionEngineService,
        CfoResolutionService,
        CfoChatService,
    ],
})
export class CfoEngineModule { }

