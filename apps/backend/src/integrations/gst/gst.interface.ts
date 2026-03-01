export interface IGSTProvider {
    validateGSTIN(gstin: string): Promise<boolean>;
    fetchReturns(gstin: string, period: string): Promise<any>;
    fetchLiability(gstin: string, period: string): Promise<any>;
    fetchFilingStatus(gstin: string, period: string): Promise<any>;
}
