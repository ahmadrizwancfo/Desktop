import { z } from 'zod';
import { FinancialFact } from '../../domain/financial-fact.schema';
import { FinancialMetric, MetricKey } from '../../domain/financial-metric.schema';

export const RuleCategorySchema = z.enum([
  'CASH',
  'RUNWAY',
  'BURN',
  'REVENUE',
  'RECEIVABLES',
  'PAYROLL',
  'TAX',
  'WORKING_CAPITAL',
  'VENDOR',
  'CUSTOMER',
]);

export type RuleCategory = z.infer<typeof RuleCategorySchema>;

export const RuleSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;

export interface BusinessRuleConditionContext {
  facts: ReadonlyArray<FinancialFact>;
  metrics: Map<MetricKey, FinancialMetric>;
}

export interface BusinessRule {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  description: string;
  severity: RuleSeverity;
  priority: number;
  confidence: number;
  recommendationTemplate: string;
  businessImpact: string;
  tags: string[];
  enabled: boolean;
  version: string;
  condition: (context: BusinessRuleConditionContext) => boolean;
}

export const BusinessRuleMetaSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  category: RuleCategorySchema,
  description: z.string(),
  severity: RuleSeveritySchema,
  priority: z.number().default(1),
  confidence: z.number().min(0).max(1.0).default(1.0),
  recommendationTemplate: z.string(),
  businessImpact: z.string(),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  version: z.string().default('1.0'),
});

export type BusinessRuleMeta = z.infer<typeof BusinessRuleMetaSchema>;
