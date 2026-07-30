import { z } from 'zod';

export const DecisionDomainSchema = z.enum([
    'SURVIVAL',
    'EFFICIENCY',
    'GROWTH',
    'HIRING',
    'FUNDRAISING',
    'COMPLIANCE'
]);

export const SeverityLevelSchema = z.enum([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
]);

export const ExecutableActionStepSchema = z.object({
    stepNumber: z.number().int().positive(),
    title: z.string(),
    actionType: z.string(),
    expectedBurnImpact: z.string().default('0.00'),
    timeUrgencyDays: z.number().int().nonnegative().default(7),
    requiresApproval: z.boolean().default(true),
});

export const CfoStructuredDecisionSchema = z.object({
    decisionId: z.string().default(() => `DEC-${Date.now()}`),
    status: z.enum(['SUCCESS', 'INSUFFICIENT_DATA', 'REVIEW_REQUIRED']).default('SUCCESS'),
    domain: DecisionDomainSchema.default('SURVIVAL'),
    severity: SeverityLevelSchema.default('MEDIUM'),
    confidenceScore: z.number().min(0).max(1).default(0.95),
    hasStrongRecommendation: z.boolean().default(true),
    headline: z.string(),
    narrative: z.string(),
    primaryMetric: z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(['IMPROVING', 'DETERIORATING', 'STABLE']).default('STABLE'),
    }),
    actionPlan: z.array(ExecutableActionStepSchema).default([]),
    risksIdentified: z.array(z.string()).default([]),
    dataSources: z.array(z.string()).default(['transactions', 'embeddings', 'liveState']),
    reasoningSteps: z.array(z.string()).default([]),
    ghostLiabilitiesTotal: z.string().default('0.00'),
    isCrisisMode: z.boolean().default(false),
    generatedAt: z.string().default(() => new Date().toISOString()),
});

export type CfoStructuredDecision = z.infer<typeof CfoStructuredDecisionSchema>;
