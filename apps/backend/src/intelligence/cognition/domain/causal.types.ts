import { z } from 'zod';

/**
 * Deterministic Cause-and-Effect Chain Schema
 */
export const CausalChainSchema = z.object({
  chainFormula: z.string(), // e.g. "Revenue↓ -> Cash↓ -> Runway↓"
  rootCause: z.string(),
  intermediateCauses: z.array(z.string()).default([]),
  ultimateEffect: z.string(),
  financialImpactEstimate: z.number().default(0),
  confidenceScore: z.number().min(0).max(1.0).default(1.0),
});

export type CausalChain = z.infer<typeof CausalChainSchema>;
