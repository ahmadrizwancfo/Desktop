import { Module } from '@nestjs/common';
import { RuleRegistryService } from './rules/rule-registry.service';
import { BusinessRulesEngineService } from './rules/business-rules-engine.service';
import { FinancialInsightEngineService } from './insights/financial-insight-engine.service';
import { ExplainabilityEngineService } from './explainability/explainability-engine.service';
import { FinancialOntologyService } from './ontology/financial-ontology.service';
import { SemanticPlatformService } from './semantic-platform.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [
    IntelligenceBusService,
    RuleRegistryService,
    BusinessRulesEngineService,
    FinancialInsightEngineService,
    ExplainabilityEngineService,
    FinancialOntologyService,
    SemanticPlatformService,
  ],
  exports: [
    RuleRegistryService,
    BusinessRulesEngineService,
    FinancialInsightEngineService,
    ExplainabilityEngineService,
    FinancialOntologyService,
    SemanticPlatformService,
  ],
})
export class SemanticModule {}
