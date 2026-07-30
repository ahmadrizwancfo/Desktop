import { Injectable, Logger } from '@nestjs/common';
import { SimulationImpactOutput } from '../impact/simulation-impact.service';
import { EvaluatedScenarioParams } from '../scenario/scenario-engine.service';
import { SimulationComparisonResult } from '../domain/simulation.types';

export interface GeneratedRecommendation {
  isRecommended: boolean;
  recommendedTiming: string;
  rationale: string;
  alternativeStrategy: string;
}

@Injectable()
export class SimulationRecommendationService {
  private readonly logger = new Logger(SimulationRecommendationService.name);

  /**
   * Evaluates deterministic rules to produce actionable CFO recommendations.
   */
  generateRecommendation(
    scenario: EvaluatedScenarioParams,
    impact: SimulationImpactOutput,
    comparison: Record<string, SimulationComparisonResult>
  ): GeneratedRecommendation {
    const baseRunway = comparison['RUNWAY_MONTHS']?.baselineValue ?? 12;
    const simRunway = comparison['RUNWAY_MONTHS']?.simulatedValue ?? 12;
    const baseHealth = impact.baselineDynamics.healthReport.overallHealthScore;
    const simHealth = impact.simulatedDynamics.healthReport.overallHealthScore;
    const violatedLaws = impact.simulatedDynamics.laws.filter(l => l.isViolated);

    let isRecommended = true;
    let recommendedTiming = 'Execute immediately within the current fiscal quarter.';
    let rationale = '';
    let alternativeStrategy = 'Proceed as planned with continuous weekly runway monitoring.';

    // Universal Rule 1: Runway Criticality Threshold (< 6 months)
    if (simRunway < 6.0) {
      isRecommended = false;
      recommendedTiming = 'Defer execution until cash reserves or monthly collections improve.';
      rationale = `Simulated runway decreases to ${simRunway} months (below the 6.0 month liquidity safety threshold).`;
      alternativeStrategy = 'Stage the decision in 50% phased tranches or secure short-term bridge financing first.';
    }
    // Universal Rule 2: Financial Law Violations
    else if (violatedLaws.length > 0) {
      isRecommended = false;
      recommendedTiming = 'Hold execution until compliance and liquidity violations are resolved.';
      rationale = `Decision triggers ${violatedLaws.length} financial law violation(s): [${violatedLaws.map(l => l.identifier).join(', ')}].`;
      alternativeStrategy = 'Optimize working capital DSO/DPO or execute expense reductions before taking this action.';
    }
    // Scenario-Specific Rules
    else {
      switch (scenario.decision.type) {
        case 'HIRING': {
          if (simRunway >= 12) {
            isRecommended = true;
            recommendedTiming = 'Execute hiring plan immediately.';
            rationale = `Post-hiring runway remains healthy at ${simRunway} months with stable health score (${simHealth}/100).`;
            alternativeStrategy = 'Stagger start dates across 60 days to smooth cash outlay.';
          } else {
            isRecommended = true;
            recommendedTiming = 'Execute after milestone validation.';
            rationale = `Post-hiring runway is ${simRunway} months. Capital buffer absorbs head-count expansion.`;
            alternativeStrategy = 'Hire key leadership first, followed by individual contributors after revenue milestone.';
          }
          break;
        }
        case 'EXPENSE_REDUCTION': {
          isRecommended = true;
          recommendedTiming = 'Execute immediately.';
          rationale = `Expense reduction extends runway by +${(simRunway - baseRunway).toFixed(1)} months and improves business health score to ${simHealth}/100.`;
          alternativeStrategy = 'Reinvest savings into high-ROI customer acquisition channels.';
          break;
        }
        case 'PRICING': {
          isRecommended = true;
          recommendedTiming = 'Implement at next contract renewal cycle.';
          rationale = `Price adjustment increases MRR and boosts health score from ${baseHealth} to ${simHealth}.`;
          alternativeStrategy = 'Grandfather existing loyal customers while applying new pricing to new sign-ups.';
          break;
        }
        case 'COLLECTIONS_IMPROVEMENT': {
          isRecommended = true;
          recommendedTiming = 'Initiate collection campaign immediately.';
          rationale = `DSO reduction improves cash velocity and extends spendable cash reserves without equity dilution.`;
          alternativeStrategy = 'Offer 2% early payment discount for invoices settled within 10 days.';
          break;
        }
        case 'EQUITY_FUNDING':
        case 'DEBT': {
          isRecommended = true;
          recommendedTiming = 'Proceed with transaction closing.';
          rationale = `Capital injection extends runway horizon to ${simRunway >= 999 ? 'Sustainable (>99 mos)' : simRunway + ' months'}.`;
          alternativeStrategy = 'Maintain strict capital allocation discipline to avoid burn rate expansion post-raise.';
          break;
        }
        default: {
          isRecommended = simHealth >= baseHealth;
          rationale = `Simulated business health score changes by ${(simHealth - baseHealth).toFixed(1)} points.`;
          break;
        }
      }
    }

    this.logger.log(`Generated Recommendation [${scenario.decision.type}]: Recommended = ${isRecommended}`);
    return {
      isRecommended,
      recommendedTiming,
      rationale,
      alternativeStrategy,
    };
  }
}
