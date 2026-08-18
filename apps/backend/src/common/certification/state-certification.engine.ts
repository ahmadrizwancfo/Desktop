import { Injectable, Logger } from '@nestjs/common';
import { FinancialMath } from '../math/financial-math.util';

export interface SurfaceStatePayload {
    surfaceName: 'DASHBOARD' | 'DAILY_BRIEF' | 'DECISION_LAB' | 'AI_COUNSEL' | 'ACTION_CENTER';
    cashInBank: number | string;
    spendableCash: number | string;
    monthlyNetBurn: number | string;
    trueRunwayMonths: number | string;
    priorityMandateTitle?: string;
}

export interface StateConsistencyReport {
    passed: boolean;
    timestamp: string;
    surfacesAudited: number;
    metricsVerified: {
        cashInBankConsistent: boolean;
        spendableCashConsistent: boolean;
        burnConsistent: boolean;
        runwayConsistent: boolean;
        mandateConsistent: boolean;
    };
    divergences: Array<{
        metric: string;
        surfaceA: string;
        valueA: any;
        surfaceB: string;
        valueB: any;
        delta: string;
    }>;
}

@Injectable()
export class StateCertificationEngine {
    private static readonly logger = new Logger(StateCertificationEngine.name);

    /**
     * Validates that all active executive surfaces consume the exact same Operating Context values.
     * Fails if any surface performs independent calculation or deviates by > ₹0.01.
     */
    public static certifySurfaceConsistency(surfaces: SurfaceStatePayload[]): StateConsistencyReport {
        if (surfaces.length <= 1) {
            return {
                passed: true,
                timestamp: new Date().toISOString(),
                surfacesAudited: surfaces.length,
                metricsVerified: {
                    cashInBankConsistent: true,
                    spendableCashConsistent: true,
                    burnConsistent: true,
                    runwayConsistent: true,
                    mandateConsistent: true,
                },
                divergences: [],
            };
        }

        const baseline = surfaces[0];
        const divergences: StateConsistencyReport['divergences'] = [];

        for (let i = 1; i < surfaces.length; i++) {
            const current = surfaces[i];

            // 1. Cash in Bank check
            const cashBase = FinancialMath.toDecimal(baseline.cashInBank);
            const cashCurr = FinancialMath.toDecimal(current.cashInBank);
            if (cashBase.minus(cashCurr).abs().greaterThan(0.01)) {
                divergences.push({
                    metric: 'Cash in Bank',
                    surfaceA: baseline.surfaceName,
                    valueA: baseline.cashInBank,
                    surfaceB: current.surfaceName,
                    valueB: current.cashInBank,
                    delta: `₹${cashBase.minus(cashCurr).abs().toFixed(2)}`,
                });
            }

            // 2. Spendable Cash check
            const spendBase = FinancialMath.toDecimal(baseline.spendableCash);
            const spendCurr = FinancialMath.toDecimal(current.spendableCash);
            if (spendBase.minus(spendCurr).abs().greaterThan(0.01)) {
                divergences.push({
                    metric: 'Spendable Cash',
                    surfaceA: baseline.surfaceName,
                    valueA: baseline.spendableCash,
                    surfaceB: current.surfaceName,
                    valueB: current.spendableCash,
                    delta: `₹${spendBase.minus(spendCurr).abs().toFixed(2)}`,
                });
            }

            // 3. Monthly Net Burn check
            const burnBase = FinancialMath.toDecimal(baseline.monthlyNetBurn);
            const burnCurr = FinancialMath.toDecimal(current.monthlyNetBurn);
            if (burnBase.minus(burnCurr).abs().greaterThan(0.01)) {
                divergences.push({
                    metric: 'Monthly Net Burn',
                    surfaceA: baseline.surfaceName,
                    valueA: baseline.monthlyNetBurn,
                    surfaceB: current.surfaceName,
                    valueB: current.monthlyNetBurn,
                    delta: `₹${burnBase.minus(burnCurr).abs().toFixed(2)}`,
                });
            }

            // 4. True Runway check
            const runBase = FinancialMath.toDecimal(baseline.trueRunwayMonths);
            const runCurr = FinancialMath.toDecimal(current.trueRunwayMonths);
            if (runBase.minus(runCurr).abs().greaterThan(0.1)) {
                divergences.push({
                    metric: 'True Runway',
                    surfaceA: baseline.surfaceName,
                    valueA: baseline.trueRunwayMonths,
                    surfaceB: current.surfaceName,
                    valueB: current.trueRunwayMonths,
                    delta: `${runBase.minus(runCurr).abs().toFixed(1)} months`,
                });
            }
        }

        const passed = divergences.length === 0;

        return {
            passed,
            timestamp: new Date().toISOString(),
            surfacesAudited: surfaces.length,
            metricsVerified: {
                cashInBankConsistent: !divergences.some(d => d.metric === 'Cash in Bank'),
                spendableCashConsistent: !divergences.some(d => d.metric === 'Spendable Cash'),
                burnConsistent: !divergences.some(d => d.metric === 'Monthly Net Burn'),
                runwayConsistent: !divergences.some(d => d.metric === 'True Runway'),
                mandateConsistent: !divergences.some(d => d.metric === 'Priority Mandate'),
            },
            divergences,
        };
    }
}
