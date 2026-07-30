import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FinancialEventStoreService } from './events/financial-event-store.service';
import { MetricsEngineService } from './metrics/metrics-engine.service';
import { FinancialFactsEngineService } from './facts/financial-facts.service';
import { IntelligenceBusService } from './bus/intelligence-bus.service';
import { IntelligencePlatformService } from './intelligence-platform.service';
import { SemanticModule } from './semantic/semantic.module';
import { CognitionModule } from './cognition/cognition.module';
import { DynamicsModule } from './dynamics/dynamics.module';
import { ValidationModule } from './validation/validation.module';
import { SimulationModule } from './simulation/simulation.module';

import { PrismaModule } from '../prisma/prisma.module';
import { CanonicalPrismaAdapter } from './adapters/canonical-prisma.adapter';
import { IntelligenceController } from './intelligence.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    SemanticModule,
    CognitionModule,
    DynamicsModule,
    ValidationModule,
    SimulationModule,
  ],
  controllers: [IntelligenceController],
  providers: [
    FinancialEventStoreService,
    MetricsEngineService,
    FinancialFactsEngineService,
    IntelligenceBusService,
    IntelligencePlatformService,
    CanonicalPrismaAdapter,
  ],
  exports: [
    FinancialEventStoreService,
    MetricsEngineService,
    FinancialFactsEngineService,
    IntelligenceBusService,
    IntelligencePlatformService,
    CanonicalPrismaAdapter,
    SemanticModule,
    CognitionModule,
    DynamicsModule,
    ValidationModule,
    SimulationModule,
  ],
})
export class IntelligenceModule {}
