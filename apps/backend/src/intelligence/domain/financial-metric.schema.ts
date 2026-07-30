import { z } from 'zod';

export const MetricKeySchema = z.enum([
  'CASH_BALANCE',
  'GROSS_BURN',
  'NET_BURN',
  'RUNWAY_MONTHS',
  'RUNWAY_DAYS',
  'MRR',
  'ARR',
  'REVENUE_GROWTH_PERCENT',
  'WORKING_CAPITAL',
  'CURRENT_RATIO',
  'QUICK_RATIO',
  'CASH_RATIO',
  'DSO',
  'DPO',
  'INVENTORY_DAYS',
  'CASH_CONVERSION_CYCLE',
  'GROSS_MARGIN_PERCENT',
  'CONTRIBUTION_MARGIN_PERCENT',
  'EBITDA',
  'OPERATING_CASH_FLOW',
  'FREE_CASH_FLOW',
]);

export type MetricKey = z.infer<typeof MetricKeySchema>;

/**
 * Computed Financial Metric Schema
 */
export const FinancialMetricSchema = z.object({
  metricKey: MetricKeySchema,
  organizationId: z.string().uuid(),
  value: z.number(),
  formattedValue: z.string(),
  formula: z.string(),
  inputs: z.record(z.any()),
  confidence: z.number().min(0).max(1.0).default(1.0),
  timestamp: z.date().default(() => new Date()),
  calculationVersion: z.string().default('1.0'),
});

export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;
