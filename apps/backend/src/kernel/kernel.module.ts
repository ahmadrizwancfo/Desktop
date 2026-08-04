import { Module, Global } from '@nestjs/common';
import { CanonicalFinancialEngine } from './canonical-financial-engine';
import { FinancialLawsEngine } from './financial-laws.engine';
import { ConfidenceEngine } from './confidence.engine';
import { BusinessDnaService } from './business-dna.service';
import { FinancialStateMachineService } from './financial-state-machine.service';
import { FinancialReasoningEngine } from './financial-reasoning.engine';
import { FinancialMemoryEngine } from './financial-memory.engine';
import { FinancialContextEngine } from './financial-context.engine';

@Global()
@Module({
  providers: [
    CanonicalFinancialEngine,
    FinancialLawsEngine,
    ConfidenceEngine,
    BusinessDnaService,
    FinancialStateMachineService,
    FinancialReasoningEngine,
    FinancialMemoryEngine,
    FinancialContextEngine,
  ],
  exports: [
    CanonicalFinancialEngine,
    FinancialLawsEngine,
    ConfidenceEngine,
    BusinessDnaService,
    FinancialStateMachineService,
    FinancialReasoningEngine,
    FinancialMemoryEngine,
    FinancialContextEngine,
  ],
})
export class KernelModule {}
