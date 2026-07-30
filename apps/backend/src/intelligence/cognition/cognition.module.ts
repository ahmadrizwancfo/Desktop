import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EvidenceEngineService } from './evidence/evidence-engine.service';
import { ConfidenceEngineService } from './confidence/confidence-engine.service';
import { CausalReasoningEngineService } from './causal/causal-reasoning-engine.service';
import { BusinessContextEngineService } from './context/business-context.service';
import { ReasoningTreeService } from './reasoning/reasoning-tree.service';
import { UniversalDecisionService } from './decision/universal-decision.service';
import { CognitionPlatformService } from './cognition-platform.service';
import { IntelligenceBusService } from '../bus/intelligence-bus.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [
    IntelligenceBusService,
    EvidenceEngineService,
    ConfidenceEngineService,
    CausalReasoningEngineService,
    BusinessContextEngineService,
    ReasoningTreeService,
    UniversalDecisionService,
    CognitionPlatformService,
  ],
  exports: [
    EvidenceEngineService,
    ConfidenceEngineService,
    CausalReasoningEngineService,
    BusinessContextEngineService,
    ReasoningTreeService,
    UniversalDecisionService,
    CognitionPlatformService,
  ],
})
export class CognitionModule {}
