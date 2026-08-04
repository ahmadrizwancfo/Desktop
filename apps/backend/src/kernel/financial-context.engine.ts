import { Injectable } from '@nestjs/common';
import { FinancialContextCompileInput, UnifiedFinancialContext } from './interfaces/financial-context.interface';
import { CanonicalFinancialEngine } from './canonical-financial-engine';
import { FinancialLawsEngine } from './financial-laws.engine';
import { ConfidenceEngine } from './confidence.engine';
import { BusinessDnaService } from './business-dna.service';
import { FinancialStateMachineService } from './financial-state-machine.service';
import { FinancialReasoningEngine } from './financial-reasoning.engine';
import { FinancialMemoryEngine } from './financial-memory.engine';
import { TemporalCoordinate } from './interfaces/temporal-coordinate.interface';
import { FinancialProvenance } from './interfaces/financial-provenance.interface';

@Injectable()
export class FinancialContextEngine {
  constructor(
    private readonly dnaService: BusinessDnaService,
    private readonly stateMachine: FinancialStateMachineService,
    private readonly reasoningEngine: FinancialReasoningEngine,
    private readonly memoryEngine: FinancialMemoryEngine,
  ) {}

  /**
   * Unifies all Kernel outputs into a single canonical Financial Context Layer.
   * Single Source of Truth for AI, Timeline, Dashboard, Reports, and Decision Lab.
   */
  public compileContext(input: FinancialContextCompileInput): UnifiedFinancialContext {
    const nowIso = new Date().toISOString();

    // 1. Calculate Canonical Metrics
    const runwayRes = CanonicalFinancialEngine.calculateRunway(input.cashBalance, input.monthlyBurn);

    // 2. Evaluate Financial Laws Gate
    const lawsApplied = FinancialLawsEngine.evaluateLaws({
      cashInBank: input.cashBalance,
      monthlyBurn: input.monthlyBurn,
      monthlyRevenue: input.monthlyRevenue || 0,
      gstPayable: input.gstPayable || 0,
    });

    // 3. Compute Deterministic Confidence
    const confidence = ConfidenceEngine.calculateConfidence({
      hoursSinceLastSync: 0,
      bankAccountCoverage: 1.0,
      reconciliationRate: 0.98,
      invoiceCompleteness: 0.95,
      projectionDaysOut: 0,
    });

    // 4. Compile Business DNA & Intent
    const dna = this.dnaService.compileDnaProfile(input.organizationId, input.rawProfile);

    // 5. Evaluate State Machine Transition
    const state = this.stateMachine.evaluateState({
      cashInBank: input.cashBalance,
      monthlyBurn: input.monthlyBurn,
      runwayDays: runwayRes.runwayDays,
      gstPayable: input.gstPayable,
      lawsResults: lawsApplied,
    });

    // 6. Assemble Temporal & Provenance Envelopes
    const temporal: TemporalCoordinate = input.temporal || {
      asOfTimestamp: nowIso,
      effectiveDate: nowIso.split('T')[0],
      horizonType: 'ACTUAL',
      projectionDaysOut: 0,
    };

    // 7. Generate Deterministic Financial Reasoning
    const reasoning = this.reasoningEngine.generateReasoning({
      organizationId: input.organizationId,
      cashBalance: input.cashBalance,
      monthlyBurn: input.monthlyBurn,
      runwayMonths: runwayRes.runwayMonths,
      runwayDays: runwayRes.runwayDays,
      financialState: state.currentState,
      primaryIntent: dna.intent.primaryObjective,
      confidenceScore: confidence,
      gstPayable: input.gstPayable,
      temporal,
    });

    // 8. Query Strategic Memory History
    const historicalMemories = this.memoryEngine.queryMemories(input.organizationId);

    const provenance: FinancialProvenance = {
      engineVersion: CanonicalFinancialEngine.KERNEL_VERSION,
      computedAt: nowIso,
      formulaUsed: 'FinancialContextEngine.compileContext(Metrics+Laws+State+Reasoning+Memory+DNA)',
      sourceRecordIds: [input.organizationId],
      lawsApplied,
      confidenceScore: confidence,
    };

    return {
      organizationId: input.organizationId,
      metrics: {
        cashBalance: input.cashBalance,
        monthlyBurn: input.monthlyBurn,
        runwayMonths: runwayRes.runwayMonths,
        runwayDays: runwayRes.runwayDays,
        formattedZeroCashDate: runwayRes.formattedZeroCashDate,
      },
      state,
      reasoning,
      dna,
      intent: dna.intent,
      lawsApplied,
      historicalMemories,
      confidence,
      temporal,
      provenance,
      compiledAt: nowIso,
    };
  }
}
