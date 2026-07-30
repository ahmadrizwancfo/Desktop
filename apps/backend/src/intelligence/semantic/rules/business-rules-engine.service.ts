import { Injectable, Logger } from '@nestjs/common';
import { RuleRegistryService } from './rule-registry.service';
import { BusinessRule, BusinessRuleConditionContext } from '../domain/rule.types';
import { FinancialFact } from '../../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

export interface RuleEvaluationResult {
  rule: BusinessRule;
  triggered: boolean;
  evaluatedAt: Date;
}

@Injectable()
export class BusinessRulesEngineService {
  private readonly logger = new Logger(BusinessRulesEngineService.name);

  constructor(private readonly ruleRegistry: RuleRegistryService) {}

  /**
   * Evaluate all active registered business rules against facts and metrics context.
   */
  evaluateRules(
    facts: ReadonlyArray<FinancialFact>,
    metrics: Map<MetricKey, FinancialMetric>
  ): RuleEvaluationResult[] {
    const activeRules = this.ruleRegistry.getActiveRules();
    const context: BusinessRuleConditionContext = { facts, metrics };
    const results: RuleEvaluationResult[] = [];

    for (const rule of activeRules) {
      try {
        const triggered = rule.condition(context);
        results.push({
          rule,
          triggered,
          evaluatedAt: new Date(),
        });
      } catch (err: any) {
        this.logger.error(`Error evaluating Business Rule [${rule.ruleId}]: ${err.message}`);
        results.push({
          rule,
          triggered: false,
          evaluatedAt: new Date(),
        });
      }
    }

    const triggeredCount = results.filter(r => r.triggered).length;
    this.logger.log(`Evaluated ${activeRules.length} Business Rules -> ${triggeredCount} rules triggered.`);
    return results;
  }

  getTriggeredRules(
    facts: ReadonlyArray<FinancialFact>,
    metrics: Map<MetricKey, FinancialMetric>
  ): BusinessRule[] {
    return this.evaluateRules(facts, metrics)
      .filter(r => r.triggered)
      .map(r => r.rule);
  }
}
