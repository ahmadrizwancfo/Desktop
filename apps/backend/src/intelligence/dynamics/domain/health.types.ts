import { z } from 'zod';

export const HealthTierSchema = z.enum(['EXCELLENT', 'GOOD', 'MODERATE', 'AT_RISK', 'CRITICAL']);
export type HealthTier = z.infer<typeof HealthTierSchema>;

/**
 * Multi-dimensional Business Health Report Schema
 */
export const BusinessHealthReportSchema = z.object({
  organizationId: z.string().uuid(),
  overallHealthScore: z.number().min(0).max(100),
  healthTier: HealthTierSchema,
  dimensions: z.object({
    liquidity: z.number().min(0).max(100),
    growth: z.number().min(0).max(100),
    efficiency: z.number().min(0).max(100),
    profitability: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
    resilience: z.number().min(0).max(100),
    customerQuality: z.number().min(0).max(100),
    vendorStability: z.number().min(0).max(100),
    capitalReadiness: z.number().min(0).max(100),
  }),
  systemHealthScores: z.record(z.number()),
  timestamp: z.date().default(() => new Date()),
});

export type BusinessHealthReport = z.infer<typeof BusinessHealthReportSchema>;
