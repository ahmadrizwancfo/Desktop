import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { AiExplainerModule } from './ai-explainer/ai-explainer.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({ isGlobal: true }),

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
    AiExplainerModule,
    IntegrationsModule,
    ContactsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enable rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
