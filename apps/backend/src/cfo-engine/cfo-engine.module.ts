import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CfoEngineController } from './cfo-engine.controller';
import { CfoEngineService } from './cfo-engine.service';
import { CfoAlertService } from './cfo-alert.service';
import { CfoBrainService } from './cfo-brain.service';
import { CfoStateService } from './cfo-state.service';
import { CfoSchedulerService } from './cfo-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StartupProfileModule } from '../startup-profile/startup-profile.module';
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

import { ReconciliationWorker } from '../events/workers/reconciliation.worker';
import { ClassificationWorker } from '../events/workers/classification.worker';
import { RunwayWorker } from '../events/workers/runway.worker';
import { CfoChatController } from './cfo-chat.controller';
import { CfoChatService } from './cfo-chat.service';

import { ExpenseIntelligenceService } from './expense-intelligence.service';
import { LiveStateEngineService } from './live-state.engine';
import { LiveStateService } from './live-state.service';
import { LiveStateListener } from './live-state.listener';
import { CashflowTimelineService } from './cashflow-timeline.service';
import { CashflowTimelineListener } from './cashflow-timeline.listener';
import { DecisionLabService } from './decision-lab.service';
import { DecisionLabController } from './decision-lab.controller';
import { ActionCenterService } from './action-center.service';
import { ActionCenterController } from './action-center.controller';
import { DailyBriefService } from './daily-brief.service';
import { DailyBriefController } from './daily-brief.controller';
import { BetaCommandCenterService } from './beta-command-center.service';
import { BetaCommandCenterController } from './beta-command-center.controller';
import { FounderDiscoveryService } from './founder-discovery.service';
import { DecisionValidationService } from './decision-validation.service';
import { AthenaJudgmentService } from './athena-judgment.service';
import { HumanCfoBenchmarkService } from './human-cfo-benchmark.service';
import { ProductionObservabilityService } from './production-observability.service';

@Module({
    imports: [
        PrismaModule,
        ConfigModule,
        ScheduleModule.forRoot(),
        forwardRef(() => StartupProfileModule),
        forwardRef(() => AiModule),
        AiExplainerModule,
    ],
    controllers: [CfoEngineController, CfoChatController, DecisionLabController, ActionCenterController, DailyBriefController, BetaCommandCenterController],
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
        ReconciliationWorker,
        ClassificationWorker,
        RunwayWorker,
        ExpenseIntelligenceService,
        LiveStateEngineService,
        LiveStateService,
        LiveStateListener,
        CashflowTimelineService,
        CashflowTimelineListener,
        DecisionLabService,
        ActionCenterService,
        DailyBriefService,
        BetaCommandCenterService,
        FounderDiscoveryService,
        DecisionValidationService,
        AthenaJudgmentService,
        HumanCfoBenchmarkService,
        ProductionObservabilityService,
    ],
    exports: [
        CfoEngineService, 
        CfoBrainService, 
        CfoStateService, 
        CfoMetricsService, 
        CfoBriefService, 
        FounderDiscoveryService,
        DecisionValidationService,
        AthenaJudgmentService,
        HumanCfoBenchmarkService,
        ProductionObservabilityService, 
        ReconciliationWorker,
        ClassificationWorker,
        RunwayWorker,
        ExpenseIntelligenceService,
        LiveStateEngineService,
        LiveStateService,
        LiveStateListener,
        CashflowTimelineService,
        CashflowTimelineListener,
        DecisionLabService,
        ActionCenterService,
        DailyBriefService,
        BetaCommandCenterService,
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
