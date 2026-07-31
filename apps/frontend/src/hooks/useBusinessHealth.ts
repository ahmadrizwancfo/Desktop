import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface BusinessSystemState {
  systemId: string;
  systemName: string;
  healthScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'AT_RISK' | 'CRITICAL';
  keyInsights: string[];
}

export interface BusinessHealthReportData {
  overallHealthScore: number;
  healthTier: string;
  systemStates: BusinessSystemState[];
  violatedLaws: any[];
  executionTimeMs: number;
}

export function useBusinessHealth(organizationId?: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthReport, setHealthReport] = useState<BusinessHealthReportData | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orgId = organizationId || '00000000-0000-0000-0000-000000000001';
      const response = await apiClient.get(`/intelligence/dynamics/health?organizationId=${orgId}`);

      const json = response.data;
      if (json && json.success && json.data) {
        setHealthReport({
          overallHealthScore: json.data.healthReport?.overallHealthScore ?? 80,
          healthTier: json.data.healthReport?.healthTier ?? 'GOOD',
          systemStates: json.data.systemStates || [],
          violatedLaws: json.data.violatedLaws || [],
          executionTimeMs: json.data.executionTimeMs || 0,
        });
      } else {
        throw new Error(json?.message || 'Invalid response schema');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error fetching business health');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return {
    loading,
    error,
    healthReport,
    refetch: fetchHealth,
  };
}
