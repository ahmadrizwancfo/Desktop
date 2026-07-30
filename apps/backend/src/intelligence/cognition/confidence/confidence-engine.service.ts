import { Injectable, Logger } from '@nestjs/common';
import { ConfidenceEvaluation, ConfidenceEvaluationSchema, ConfidenceBand } from '../domain/confidence.types';
import { EvidenceItem } from '../domain/evidence.types';

@Injectable()
export class ConfidenceEngineService {
  private readonly logger = new Logger(ConfidenceEngineService.name);

  /**
   * Universal Confidence Framework: Evaluates 8 key factors to compute a unified confidence score & band.
   */
  evaluateConfidence(params: {
    evidence: ReadonlyArray<EvidenceItem>;
    hasConflictingSignals?: boolean;
    dataAgeHours?: number;
  }): ConfidenceEvaluation {
    const { evidence, hasConflictingSignals = false, dataAgeHours = 0 } = params;

    // 1. Evidence Quality (Weighted average of evidence item confidence & weight)
    let evidenceQuality = 1.0;
    if (evidence.length > 0) {
      const sumWeight = evidence.reduce((acc, e) => acc + (e.weight * e.confidence), 0);
      evidenceQuality = Number((sumWeight / evidence.length).toFixed(2));
    }

    // 2. Data Freshness (Degrades linearly over 72 hours)
    const dataFreshness = Number(Math.max(0.5, 1.0 - (dataAgeHours / 72)).toFixed(2));

    // 3. Completeness & Coverage
    const dataCompleteness = evidence.length >= 3 ? 1.0 : Number((evidence.length / 3).toFixed(2));
    const coverage = 0.95;
    const historicalConsistency = 0.90;
    const ruleCertainty = 1.0;
    const metricReliability = 1.0;

    // 4. Conflicting Evidence Penalty
    const conflictingEvidencePenalty = hasConflictingSignals ? 0.25 : 0.0;

    // 5. Composite Confidence Score Calculation
    const rawScore = (
      (evidenceQuality * 0.3) +
      (dataFreshness * 0.2) +
      (dataCompleteness * 0.2) +
      (ruleCertainty * 0.15) +
      (metricReliability * 0.15)
    ) - conflictingEvidencePenalty;

    const confidenceScore = Number(Math.min(1.0, Math.max(0.1, rawScore)).toFixed(2));

    // 6. Confidence Band Categorization
    let confidenceBand: ConfidenceBand = 'MEDIUM';
    if (confidenceScore >= 0.90) confidenceBand = 'VERY_HIGH';
    else if (confidenceScore >= 0.75) confidenceBand = 'HIGH';
    else if (confidenceScore >= 0.50) confidenceBand = 'MEDIUM';
    else confidenceBand = 'LOW';

    const explanation = `Confidence score of ${(confidenceScore * 100).toFixed(0)}% (${confidenceBand}) derived from ${evidence.length} evidence items with freshness score ${(dataFreshness * 100).toFixed(0)}%.`;

    const result = {
      confidenceScore,
      confidenceBand,
      factors: {
        dataCompleteness,
        dataFreshness,
        historicalConsistency,
        evidenceQuality,
        ruleCertainty,
        metricReliability,
        coverage,
        conflictingEvidencePenalty,
      },
      confidenceExplanation: explanation,
    };

    this.logger.log(`Evaluated Universal Confidence: [Score: ${confidenceScore} | Band: ${confidenceBand}]`);
    return Object.freeze(ConfidenceEvaluationSchema.parse(result));
  }
}
