import { Injectable, Logger } from '@nestjs/common';
import { CausalChain, CausalChainSchema } from '../domain/causal.types';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';
import { BusinessRule } from '../../semantic/domain/rule.types';

@Injectable()
export class CausalReasoningEngineService {
  private readonly logger = new Logger(CausalReasoningEngineService.name);

  /**
   * Constructs deterministic Cause-and-Effect chains based on triggered rules & metrics.
   */
  deriveCausalChain(params: {
    triggeredRules: ReadonlyArray<BusinessRule>;
    metricsMap: Map<MetricKey, FinancialMetric>;
  }): CausalChain {
    const { triggeredRules, metricsMap } = params;
    const ruleIds = triggeredRules.map(r => r.ruleId);

    const netBurn = metricsMap.get('NET_BURN')?.value || 0;
    const dso = metricsMap.get('DSO')?.value || 0;

    // Chain 1: Critical Runway & Burn Acceleration
    if (ruleIds.includes('RULE_RUNWAY_CRITICAL')) {
      return Object.freeze(CausalChainSchema.parse({
        chainFormula: 'Operating Expenses > Revenue → Net Burn Accelerated → Cash Balance Depleted → Critical Runway Horizon',
        rootCause: 'Monthly operating spend significantly outpaces monthly revenue inflows.',
        intermediateCauses: ['Net monthly burn accelerated', 'Cash balance depleted below safety threshold'],
        ultimateEffect: 'Imminent cash exhaustion within 90 days.',
        financialImpactEstimate: netBurn * 3,
        confidenceScore: 1.0,
      }));
    }

    // Chain 2: Collections Slowdown & Working Capital Lockup
    if (ruleIds.includes('RULE_RECEIVABLE_GROWTH_FAST')) {
      return Object.freeze(CausalChainSchema.parse({
        chainFormula: 'Delayed Customer Collections → High DSO (Days Sales Outstanding) → Working Capital Lockup → Short-term Liquidity Squeeze',
        rootCause: 'Customers paying invoices beyond standard 30-day billing terms.',
        intermediateCauses: [`DSO expanded to ${dso} days`, 'Operating cash trapped in accounts receivable'],
        ultimateEffect: 'Constrained cash flow for daily operational expenses.',
        financialImpactEstimate: (metricsMap.get('WORKING_CAPITAL')?.value || 0) * 0.4,
        confidenceScore: 0.95,
      }));
    }

    // Chain 3: Payroll Concentration & Opex Spikes
    if (ruleIds.includes('RULE_PAYROLL_CONCENTRATION')) {
      return Object.freeze(CausalChainSchema.parse({
        chainFormula: 'Headcount / Compensation Expansion → Fixed Payroll Commitments Increased → Gross Burn Spiked → Reduced Runway Flexibility',
        rootCause: 'Rapid headcount expansion increases fixed monthly payroll commitments.',
        intermediateCauses: ['Fixed opex commitments increased', 'Gross burn elevated'],
        ultimateEffect: 'Reduced financial flexibility to absorb revenue fluctuations.',
        financialImpactEstimate: netBurn,
        confidenceScore: 0.90,
      }));
    }

    // Default Fallback Causal Chain: Healthy Solvency
    return Object.freeze(CausalChainSchema.parse({
      chainFormula: 'Disciplined Capital Allocation → Predictable Inflows → Cash Balance Preserved → Extended Runway Buffer',
      rootCause: 'Operating revenue covers monthly expenses with positive operating cash flow.',
      intermediateCauses: ['Cash balance preserved', 'Low net burn velocity'],
      ultimateEffect: 'Sustained long-term financial independence and strategic optionality.',
      financialImpactEstimate: 0,
      confidenceScore: 1.0,
    }));
  }
}
