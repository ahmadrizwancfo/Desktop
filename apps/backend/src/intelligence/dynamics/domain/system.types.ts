import { z } from 'zod';

/**
 * Deterministic Business System State Schema
 */
export const BusinessSystemStateSchema = z.object({
  systemId: z.string(),
  systemName: z.string(),
  purpose: z.string(),
  inputs: z.record(z.number()).default({}),
  outputs: z.record(z.number()).default({}),
  upstreamSystems: z.array(z.string()).default([]),
  downstreamSystems: z.array(z.string()).default([]),
  criticalMetrics: z.array(z.string()).default([]),
  healthScore: z.number().min(0).max(100).default(100),
  stabilityScore: z.number().min(0).max(100).default(100),
  timestamp: z.date().default(() => new Date()),
});

export type BusinessSystemState = z.infer<typeof BusinessSystemStateSchema>;
