import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../canonical-model/canonical-model.interface';

export type EvidenceStatus = 'VERIFIED' | 'ESTIMATED' | 'INFERRED' | 'UNAVAILABLE' | 'CONFLICTING';

export interface MetricEvidenceProfile {
    metricName: string;
    value: string | number;
    status: EvidenceStatus;
    confidenceScore: number; // 0.0 - 1.0
    explanation: string;
    missingDataWarning?: string;
}

export interface CfoExplainabilityPillars {
    recommendationTitle: string;
    why: string;
    financialFacts: Array<{ label: string; value: string }>;
    rulesTriggered: string[];
    evidenceVouchers: string[];
    assumptionsMade: string[];
    uncertaintyReport: {
        hasUncertainty: boolean;
        unverifiedMetrics: string[];
        counselDisclaimer?: string;
    };
}

@Injectable()
export class UnknownStateEngine {
    private static readonly logger = new Logger(UnknownStateEngine.name);

    /**
     * Evaluates the evidence profile of the organization's financial dataset.
     * Enforces Law 18: Unknown Before Incorrect.
     */
    public static auditEvidenceProfile(
        transactions: CanonicalTransaction[],
        bankAccountCount: number,
        hasGstData: boolean,
        hasPayrollData?: boolean
    ): Record<string, MetricEvidenceProfile> {
        const now = new Date();
        const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

        const recentTxns = transactions.filter(t => new Date(t.date) >= fortyFiveDaysAgo);
        const hasRecentSalary = hasPayrollData ?? recentTxns.some(t => {
            const n = (t.narration || '').toLowerCase();
            const c = (t.category || '').toLowerCase();
            return n.includes('salary') || n.includes('payroll') || c.includes('salary');
        });

        // 1. Cash Balance Profile
        const cashProfile: MetricEvidenceProfile = {
            metricName: 'Cash in Bank',
            value: bankAccountCount > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
            status: bankAccountCount > 0 ? 'VERIFIED' : 'UNAVAILABLE',
            confidenceScore: bankAccountCount > 0 ? 1.0 : 0.0,
            explanation: bankAccountCount > 0
                ? `Verified across ${bankAccountCount} connected bank account feeds.`
                : 'No bank accounts connected. Cash in bank is unavailable.',
            missingDataWarning: bankAccountCount === 0 ? 'Connect at least one primary bank account to establish cash baseline.' : undefined,
        };

        // 2. Payroll / Burn Profile
        const payrollProfile: MetricEvidenceProfile = {
            metricName: 'Monthly Payroll Burn',
            value: hasRecentSalary ? 'DETECTED' : 'UNAVAILABLE',
            status: hasRecentSalary ? 'VERIFIED' : 'UNAVAILABLE',
            confidenceScore: hasRecentSalary ? 0.95 : 0.2,
            explanation: hasRecentSalary
                ? 'Recent payroll disbursement batch verified from statement narrations.'
                : 'No payroll transactions detected in the last 45 days. Monthly burn estimate may be incomplete.',
            missingDataWarning: !hasRecentSalary ? 'Missing recent salary outflows. Ensure full payroll statement is uploaded before committing to large hires.' : undefined,
        };

        // 3. GST Tax Exposure Profile
        const gstProfile: MetricEvidenceProfile = {
            metricName: 'GST Tax Buffer',
            value: hasGstData ? 'AVAILABLE' : 'ESTIMATED',
            status: hasGstData ? 'VERIFIED' : 'ESTIMATED',
            confidenceScore: hasGstData ? 0.98 : 0.5,
            explanation: hasGstData
                ? 'GST challan payments and filing records verified from portal / statement.'
                : 'GST filing history is incomplete. Buffer is estimated using flat 18% standard assumption on revenue.',
            missingDataWarning: !hasGstData ? 'Statutory GST liability is estimated. Verify actual GSTR-3B filings with your CA.' : undefined,
        };

        return {
            cashInBank: cashProfile,
            payrollBurn: payrollProfile,
            gstTaxBuffer: gstProfile,
        };
    }

    /**
     * Constructs the 6-Pillar CFO Explainability Model for any executive mandate.
     */
    public static buildExplainability(
        mandateTitle: string,
        why: string,
        facts: Array<{ label: string; value: string }>,
        rules: string[],
        voucherIds: string[],
        evidenceProfiles: Record<string, MetricEvidenceProfile>
    ): CfoExplainabilityPillars {
        const unverified = Object.values(evidenceProfiles)
            .filter(p => p.status !== 'VERIFIED')
            .map(p => `${p.metricName} (${p.status})`);

        const hasUncertainty = unverified.length > 0;
        const assumptions: string[] = [];

        if (hasUncertainty) {
            assumptions.push(...Object.values(evidenceProfiles)
                .filter(p => p.missingDataWarning)
                .map(p => p.missingDataWarning!));
        }

        return {
            recommendationTitle: mandateTitle,
            why,
            financialFacts: facts,
            rulesTriggered: rules,
            evidenceVouchers: voucherIds,
            assumptionsMade: assumptions,
            uncertaintyReport: {
                hasUncertainty,
                unverifiedMetrics: unverified,
                counselDisclaimer: hasUncertainty
                    ? `Law 18 Notice: ${unverified.join(', ')} rely on estimated assumptions. Verify these metrics before irreversible commitments.`
                    : undefined,
            },
        };
    }
}
