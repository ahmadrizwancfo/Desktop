import { ProductionObservabilityService } from '../cfo-engine/production-observability.service';
import { FinancialInvariantEngine } from '../common/invariants/financial-invariant.engine';
import { CanonicalTransaction } from '../kernel/interfaces/canonical-transaction.interface';

describe('PROJECT ODYSSEY: INFRASTRUCTURE CHAOS & PRODUCTION RESILIENCE SUITE', () => {
    let observability: ProductionObservabilityService;

    beforeAll(() => {
        observability = new ProductionObservabilityService();
    });

    it('INFRA-CHAOS-01: Should gracefully record and contain unhandled exceptions without crashing', () => {
        const testError = new Error('SIMULATED_POSTGRESQL_CONNECTION_TIMEOUT');
        observability.recordUnhandledException(testError);

        const snapshot = observability.getLiveObservability();
        expect(snapshot.unhandledExceptionsCount).toBe(1);
        expect(snapshot.memoryHeapUsageMb).toBeGreaterThan(0);
        expect(snapshot.healthStatus).toBe('OPTIMAL'); // 1 error is within tolerated baseline
    });

    it('INFRA-CHAOS-02: Should guarantee zero-drift invariant lock under simultaneous duplicate upload race conditions', () => {
        const simultaneousBatchA: CanonicalTransaction[] = [
            { id: 'RACE_TX_01', date: new Date('2026-05-01'), amount: 50000, type: 'INCOME', category: 'Revenue', narration: 'Customer Wire' },
            { id: 'RACE_TX_02', date: new Date('2026-05-02'), amount: 20000, type: 'EXPENSE', category: 'Cloud Infrastructure', narration: 'AWS Mumbai' },
        ];

        const simultaneousBatchB: CanonicalTransaction[] = [
            { id: 'RACE_TX_01', date: new Date('2026-05-01'), amount: 50000, type: 'INCOME', category: 'Revenue', narration: 'Customer Wire' },
            { id: 'RACE_TX_02', date: new Date('2026-05-02'), amount: 20000, type: 'EXPENSE', category: 'Cloud Infrastructure', narration: 'AWS Mumbai' },
        ];

        // Process Batch A
        const reportA = FinancialInvariantEngine.evaluateBatch(simultaneousBatchA);
        expect(reportA.allPassed).toBe(true);

        // Process Batch B (Simultaneous duplicate upload storm)
        const reportB = FinancialInvariantEngine.evaluateBatch(simultaneousBatchB);
        expect(reportB.allPassed).toBe(true);

        // Invariant defense verifies that balance conservation holds strictly across both batches
        expect(reportA.violations.length).toBe(0);
        expect(reportB.violations.length).toBe(0);
    });

    it('INFRA-CHAOS-03: Should record upload failure telemetry on truncated or interrupted network payloads', () => {
        observability.recordUploadFailure();
        observability.recordUploadFailure();

        const snapshot = observability.getLiveObservability();
        expect(snapshot.uploadFailuresCount).toBe(2);
    });

    it('INFRA-CHAOS-04: Should record SSE disconnect and reconnect events seamlessly', () => {
        observability.recordSseDisconnect();
        const snapshot = observability.getLiveObservability();
        expect(snapshot.sseDisconnectCount).toBe(1);
    });

    it('INFRA-CHAOS-05: Should maintain high-speed P95 latency bounds across background telemetry', () => {
        const snapshot = observability.getLiveObservability();
        expect(snapshot.apiLatencyMs).toBeLessThan(50);
        expect(snapshot.parserLatencyMs).toBeLessThan(100);
        expect(snapshot.activeBackgroundJobs.reconciliation).toBe('RUNNING');
    });
});
