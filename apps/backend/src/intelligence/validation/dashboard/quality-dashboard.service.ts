import { Injectable } from '@nestjs/common';
import { QualityMetrics } from '../domain/validation.types';

@Injectable()
export class QualityDashboardService {
  /**
   * Render internal developer console quality report.
   */
  renderDashboard(metrics: QualityMetrics): string {
    return `
============================================================
FOUNDERCFO FINANCIAL INTELLIGENCE QUALITY DASHBOARD (INTERNAL)
============================================================
Scenario Coverage           : ${metrics.scenarioCoverageCount} deterministic scenarios
Decision Accuracy           : ${metrics.decisionAccuracyPercent.toFixed(1)}%
Financial Law Compliance    : ${metrics.lawCompliancePercent.toFixed(1)}%
Determinism Score           : ${metrics.determinismPercent.toFixed(1)}%
Regression Pass Rate        : ${metrics.regressionPassRatePercent.toFixed(1)}%
Average Decision Latency    : ${metrics.avgDecisionLatencyMs.toFixed(1)} ms
Platform Confidence Score   : ${metrics.platformConfidencePercent.toFixed(1)}%
Timestamp                   : ${metrics.timestamp.toISOString()}
============================================================
`;
  }
}
