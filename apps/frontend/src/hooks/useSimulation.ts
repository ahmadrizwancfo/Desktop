import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export type SimulationDecisionType =
  | 'HIRING'
  | 'SALARY_CHANGE'
  | 'EXPENSE_REDUCTION'
  | 'MARKETING_SPEND'
  | 'PRICING'
  | 'COLLECTIONS_IMPROVEMENT'
  | 'VENDOR_PAYMENT_TERMS'
  | 'DEBT'
  | 'EQUITY_FUNDING';

export interface SimulationRequestPayload {
  organizationId?: string;
  decisionType: SimulationDecisionType;
  value: number;
  description?: string;
  params?: Record<string, any>;
}

export interface SimulationComparisonMetric {
  metricName: string;
  baselineValue: number;
  simulatedValue: number;
  absoluteDelta: number;
  percentageDelta: number;
  impactStatus: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CRITICAL';
}

export interface SimulationResultData {
  simulationId: string;
  organizationId: string;
  decision: SimulationRequestPayload;
  assumptions: string[];
  affectedSystems: string[];
  impactSummary: string;
  businessHealthChanges: {
    baselineScore: number;
    simulatedScore: number;
    delta: number;
    baselineTier: string;
    simulatedTier: string;
  };
  financialMetricChanges: Record<string, SimulationComparisonMetric>;
  recommendation: {
    isRecommended: boolean;
    recommendedTiming: string;
    rationale: string;
    alternativeStrategy: string;
  };
  confidence: number;
  executionTimeMs: number;
  timestamp: string;
}

export function useSimulation(defaultOrgId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatedResult, setSimulatedResult] = useState<SimulationResultData | null>(null);

  const runScenario = useCallback(
    async (payload: SimulationRequestPayload) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post('/intelligence/simulation/run', {
          organizationId: payload.organizationId || defaultOrgId || '00000000-0000-0000-0000-000000000001',
          decisionType: payload.decisionType,
          value: payload.value,
          description: payload.description,
          params: payload.params || {},
        });

        const json = response.data;
        if (json && json.success && json.data) {
          setSimulatedResult(json.data);
          return json.data as SimulationResultData;
        } else {
          throw new Error(json?.message || 'Failed to parse simulation response');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'An unexpected error occurred during decision simulation';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultOrgId]
  );

  const resetSimulation = useCallback(() => {
    setSimulatedResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    simulatedResult,
    runScenario,
    resetSimulation,
  };
}
