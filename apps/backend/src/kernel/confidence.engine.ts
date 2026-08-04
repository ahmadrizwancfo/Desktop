export interface ConfidenceCalculationParams {
  hoursSinceLastSync?: number;
  bankAccountCoverage?: number;   // 0.0 to 1.0
  reconciliationRate?: number;    // 0.0 to 1.0
  invoiceCompleteness?: number;   // 0.0 to 1.0
  projectionDaysOut?: number;     // 0 for actuals, >0 for forecasts
}

export class ConfidenceEngine {
  /**
   * Deterministically calculates a mathematical confidence score (0.00 - 1.00).
   */
  public static calculateConfidence(params: ConfidenceCalculationParams): number {
    const hours = params.hoursSinceLastSync ?? 0;
    const freshnessFactor = Math.max(0, 1.0 - Math.min(1.0, hours / 72.0)); // Degrades to 0 over 72h
    
    const bankCoverage = params.bankAccountCoverage ?? 1.0;
    const reconRate = params.reconciliationRate ?? 1.0;
    const invoiceComp = params.invoiceCompleteness ?? 1.0;

    const baseConfidence = (
      0.35 * freshnessFactor +
      0.25 * bankCoverage +
      0.25 * reconRate +
      0.15 * invoiceComp
    );

    // Apply horizon penalty for forecasts/simulations
    const horizonDays = params.projectionDaysOut ?? 0;
    const horizonPenalty = horizonDays > 0 ? Math.min(0.35, (horizonDays / 180.0) * 0.25) : 0;

    const finalScore = Math.max(0.05, Math.min(1.0, baseConfidence - horizonPenalty));
    return Math.round(finalScore * 100) / 100;
  }
}
