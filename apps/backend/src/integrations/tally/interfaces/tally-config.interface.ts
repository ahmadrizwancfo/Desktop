export interface TallyConfig {
  tallyHostUrl: string; // e.g. "http://localhost:9000" or "http://192.168.1.100:9000" or "http://tally.company.com:9000"
  companyName?: string;
  enabled: boolean;
  syncIntervalMinutes?: number;
}
