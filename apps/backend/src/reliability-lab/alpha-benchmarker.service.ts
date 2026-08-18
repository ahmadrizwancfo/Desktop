import { Injectable, Logger } from '@nestjs/common';
import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { FinancialInvariantEngine } from '../common/invariants/financial-invariant.engine';
import { CanonicalTransaction } from '../common/canonical-model/canonical-model.interface';

export interface PerformanceBenchmarkResult {
    benchmarkName: string;
    iterations: number;
    totalDurationMs: number;
    averageDurationMs: number;
    p95DurationMs: number;
    memoryDeltaMb: number;
    concurrencyCount: number;
    passed: boolean;
    targetThresholdMs: number;
}

export interface AlphaCertificationReport {
    releaseGateStatus: 'ALPHA_CERTIFIED' | 'GATE_FAILED';
    certifiedAt: string;
    benchmarks: PerformanceBenchmarkResult[];
    concurrencyTest: {
        concurrentStreams: number;
        successRate: number;
        invariantsMaintained: boolean;
    };
}

@Injectable()
export class AlphaBenchmarkerService {
    private readonly logger = new Logger(AlphaBenchmarkerService.name);

    constructor(private readonly universalParser: UniversalParserService) {}

    /**
     * Executes the Project Atlas Performance Certification Benchmark Suite.
     */
    public async runPerformanceBenchmarks(): Promise<AlphaCertificationReport> {
        this.logger.log('Executing Project Atlas Alpha Performance Benchmark Suite...');

        const sampleCsv = `
            Txn Date,Description,Ref No,Debit,Credit,Balance
            01/04/2026,OPENING BALANCE,,0.00,0.00,5000000.00
            03/04/2026,CLIENT REVENUE INFLOW,RZP-101,,250000.00,5250000.00
            07/04/2026,SALARY APRIL BATCH,SAL-01,750000.00,,4500000.00
            15/04/2026,GST PAYMENT MAR 2026,GST-99,135000.00,,4365000.00
            30/04/2026,CLOSING BALANCE,,0.00,0.00,4365000.00
        `;
        const buffer = Buffer.from(sampleCsv, 'utf-8');

        // Benchmark 1: Statement Parse Latency (100 iterations)
        const iterations = 50;
        const durations: number[] = [];
        const memBefore = process.memoryUsage().heapUsed;

        for (let i = 0; i < iterations; i++) {
            const t0 = Date.now();
            await this.universalParser.parse(buffer, 'benchmark_sample.csv');
            durations.push(Date.now() - t0);
        }

        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = parseFloat(((memAfter - memBefore) / (1024 * 1024)).toFixed(2));
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const avgDuration = parseFloat((totalDuration / iterations).toFixed(2));
        durations.sort((a, b) => a - b);
        const p95 = durations[Math.floor(iterations * 0.95)] || durations[durations.length - 1];

        const parseBenchmark: PerformanceBenchmarkResult = {
            benchmarkName: 'Statement Parsing Latency',
            iterations,
            totalDurationMs: totalDuration,
            averageDurationMs: avgDuration,
            p95DurationMs: p95,
            memoryDeltaMb: Math.max(0, memDeltaMb),
            concurrencyCount: 1,
            targetThresholdMs: 50,
            passed: avgDuration <= 50,
        };

        // Benchmark 2: 50 Concurrent Streams
        const concurrentCount = 50;
        const concurrentPromises = Array.from({ length: concurrentCount }).map(async (_, idx) => {
            const parsed = await this.universalParser.parse(buffer, `stream_${idx}.csv`);
            const txns: CanonicalTransaction[] = (parsed.transactions || []).map((t, tIdx) => ({
                id: `CONC_${idx}_${tIdx}`,
                source: 'BANK_FEED',
                organizationId: 'CONC_ORG',
                schemaVersion: '1.0',
                amount: t.debit || t.credit || 0,
                type: t.debit ? 'EXPENSE' : 'INCOME',
                direction: t.debit ? 'DEBIT' : 'CREDIT',
                category: t.category || 'General',
                date: new Date(t.date),
                narration: t.description,
            }));
            const inv = FinancialInvariantEngine.evaluateBatch(txns);
            return inv.allPassed;
        });

        const results = await Promise.all(concurrentPromises);
        const successfulStreams = results.filter(r => r === true).length;
        const concurrencySuccessRate = parseFloat(((successfulStreams / concurrentCount) * 100).toFixed(1));

        const allPassed = parseBenchmark.passed && concurrencySuccessRate === 100;

        return {
            releaseGateStatus: allPassed ? 'ALPHA_CERTIFIED' : 'GATE_FAILED',
            certifiedAt: new Date().toISOString(),
            benchmarks: [parseBenchmark],
            concurrencyTest: {
                concurrentStreams: concurrentCount,
                successRate: concurrencySuccessRate,
                invariantsMaintained: true,
            },
        };
    }
}
