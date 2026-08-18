import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SimulatorModule } from './simulator/simulator.module';
import { ActionsModule } from './actions/actions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AiModule } from './ai/ai.module';
import { ComplianceModule } from './compliance/compliance.module';
import { StatementsModule } from './statements/statements.module';
import { GstModule } from './integrations/gst/gst.module';
import { BankingModule } from './integrations/banking/banking.module';
import { FinancialMetricsModule } from './financial-metrics/financial-metrics.module';
import { OcrModule } from './ocr/ocr.module';
import { InvestorMetricsModule } from './investor-metrics/investor-metrics.module';
import { UnitEconomicsModule } from './unit-economics/unit-economics.module';
import { StartupProfileModule } from './startup-profile/startup-profile.module';
import { CfoEngineModule } from './cfo-engine/cfo-engine.module';
import { ReliabilityLabModule } from './reliability-lab/reliability-lab.module';
import { AiExplainerModule } from './ai-explainer/ai-explainer.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ContactsModule } from './contacts/contacts.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SseModule } from './sse/sse.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { KernelModule } from './kernel/kernel.module';

@Module({
  imports: [
    KernelModule,
    // Global configuration
    ConfigModule.forRoot({ isGlobal: true }),

    // BullMQ Distributed Redis Connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    
    // In-memory Event Bus
    EventEmitterModule.forRoot(),

    // Background Job Scheduler
    ScheduleModule.forRoot(),

    // Real-Time SSE Gateway
    SseModule,

    // Rate Limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,    // 1 second
      limit: 10,    // 10 requests per second
    }, {
      name: 'medium',
      ttl: 60000,   // 1 minute
      limit: 100,   // 100 requests per minute
    }, {
      name: 'long',
      ttl: 3600000, // 1 hour
      limit: 1000,  // 1000 requests per hour
    }]),

    // Core Modules
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AuditLogsModule,
    NotificationsModule,
    BankAccountsModule,
    TransactionsModule,
    InvoicesModule,
    ExpensesModule,
    SimulatorModule,
    ActionsModule,
    RecommendationsModule,
    AiModule,
    ComplianceModule,
    StatementsModule,
    GstModule,
    BankingModule,
    FinancialMetricsModule,
    OcrModule,
    InvestorMetricsModule,
    UnitEconomicsModule,
    StartupProfileModule,
    CfoEngineModule,
    ReliabilityLabModule,
    AiExplainerModule,
    IntegrationsModule,
    ContactsModule,
    IntelligenceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
  }
}
