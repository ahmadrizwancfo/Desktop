import { z } from 'zod';
import { EvidenceItemSchema } from './evidence.types';
import { ConfidenceEvaluationSchema } from './confidence.types';
import { BusinessContextSchema } from './context.types';
import { CausalChainSchema } from './causal.types';

export const DecisionStatusSchema = z.enum([
  'PROPOSED',
  'REVIEWED',
  'ACKNOWLEDGED',
  'EXECUTED',
  'DISMISSED',
]);

export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

/**
 * Universal Decision Object Schema
 * FounderCFO's master decision data model consumed by all downstream modules.
 */
export const UniversalDecisionObjectSchema = z.object({
  decisionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string(),
  businessProblem: z.string(),
  evidence: z.array(EvidenceItemSchema).default([]),
  confidence: ConfidenceEvaluationSchema,
  context: BusinessContextSchema,
  supportingMetrics: z.record(z.number()).default({}),
  supportingFacts: z.array(z.string()).default([]),
  supportingRules: z.array(z.string()).default([]),
  supportingInsights: z.array(z.string()).default([]),
  causalChain: CausalChainSchema,
  financialImpact: z.number().default(0),
  businessImpactNarrative: z.string(),
  priority: z.number().default(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  recommendedActions: z.array(z.string()).default([]),
  alternativeActions: z.array(z.string()).default([]),
  recommendedOwner: z.enum(['FOUNDER', 'CFO', 'ACCOUNTANT', 'COLLECTIONS_TEAM']).default('FOUNDER'),
  executionTimeline: z.string().default('Immediate (1-3 days)'),
  expectedOutcome: z.string(),
  monitoringMetrics: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  status: DecisionStatusSchema.default('PROPOSED'),
  timestamp: z.date().default(() => new Date()),
});

export type UniversalDecisionObject = z.infer<typeof UniversalDecisionObjectSchema>;
