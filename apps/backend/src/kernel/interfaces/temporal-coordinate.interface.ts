export type HorizonType = 'ACTUAL' | 'FORECAST' | 'SIMULATION' | 'HISTORICAL_REPLAY';

export interface TemporalCoordinate {
  asOfTimestamp: string;       // ISO 8601 Timestamp of fact validity
  effectiveDate: string;       // Primary accounting date (YYYY-MM-DD)
  horizonType: HorizonType;
  projectionDaysOut?: number;  // 0 for actuals; +N for forecasts/simulations
}
