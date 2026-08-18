import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { UniversalParserService } from '../statements/parsers/universal-parser.service';
import { FinancialInvariantEngine } from '../common/invariants/financial-invariant.engine';
import { FinancialReplayEngine, ReplayCoordinate } from '../common/replay/financial-replay.engine';
import { CanonicalTransaction } from '../common/canonical-model/canonical-model.interface';

export interface FixtureTestResult {
    fixtureName: string;
    category: 'banks' | 'accounting' | 'edge-cases';
    passed: boolean;
    extractedCount: number;
    invariantsPassed: boolean;
    replayHash: string;
    executionTimeMs: number;
    errors: string[];
}

export interface RegressionRunReport {
    totalFixtures: number;
    passedFixtures: number;
    failedFixtures: number;
    overallPassRate: number; // 0 - 100
    executedAt: string;
    results: FixtureTestResult[];
}

@Injectable()
export class RegressionRunnerService {
    private readonly logger = new Logger(RegressionRunnerService.name);

    constructor(private readonly universalParser: UniversalParserService) {}

    /**
     * Discovers and executes all Golden Dataset fixtures automatically.
     */
    public async runAllGoldenDatasets(): Promise<RegressionRunReport> {
        const datasetsRoot = path.resolve(__dirname, '../../datasets');
        this.logger.log(`Executing Regression Runner across Golden Datasets root: ${datasetsRoot}`);

        const results: FixtureTestResult[] = [];
        const categories: Array<'banks' | 'accounting' | 'edge-cases'> = ['banks', 'accounting', 'edge-cases'];

        for (const cat of categories) {
            const catDir = path.join(datasetsRoot, cat);
            if (!fs.existsSync(catDir)) continue;

            const files = fs.readdirSync(catDir).filter(f => f.endsWith('.csv') || f.endsWith('.xml') || f.endsWith('.xlsx'));

            for (const file of files) {
                const filePath = path.join(catDir, file);
                const startTime = Date.now();
                const errors: string[] = [];

                try {
                    const buffer = fs.readFileSync(filePath);
                    const parsedDoc = await this.universalParser.parse(buffer, file);

                    const canonicalTxns: CanonicalTransaction[] = (parsedDoc.transactions || []).map((t, idx) => ({
                        id: `REG_${file}_${idx}`,
                        source: 'BANK_FEED',
                        organizationId: 'REG_ORG',
                        schemaVersion: '1.0',
                        amount: t.debit || t.credit || 0,
                        type: t.debit ? 'EXPENSE' : 'INCOME',
                        direction: t.debit ? 'DEBIT' : 'CREDIT',
                        category: t.category || 'General',
                        date: new Date(t.date),
                        narration: t.description,
                    }));

                    const invReport = FinancialInvariantEngine.evaluateBatch(canonicalTxns);
                    if (!invReport.allPassed) {
                        errors.push(...invReport.violations.map(v => v.message));
                    }

                    const coordinate: ReplayCoordinate = {
                        rawFileSha256: '',
                        parserVersion: '2.1.0',
                        financialEngineVersion: '2.0.0',
                        ruleRegistryVersion: '1.4.0',
                    };

                    const replay = await FinancialReplayEngine.replayPipeline(buffer, file, coordinate, this.universalParser);

                    const executionTimeMs = Date.now() - startTime;
                    const passed = errors.length === 0 && canonicalTxns.length >= 0;

                    results.push({
                        fixtureName: file,
                        category: cat,
                        passed,
                        extractedCount: canonicalTxns.length,
                        invariantsPassed: invReport.allPassed,
                        replayHash: replay.reproducedStateHash,
                        executionTimeMs,
                        errors,
                    });
                } catch (err: any) {
                    results.push({
                        fixtureName: file,
                        category: cat,
                        passed: false,
                        extractedCount: 0,
                        invariantsPassed: false,
                        replayHash: '',
                        executionTimeMs: Date.now() - startTime,
                        errors: [err.message || 'Unknown parsing exception'],
                    });
                }
            }
        }

        const total = results.length;
        const passedCount = results.filter(r => r.passed).length;
        const failedCount = total - passedCount;
        const overallPassRate = total > 0 ? parseFloat(((passedCount / total) * 100).toFixed(1)) : 100;

        return {
            totalFixtures: total,
            passedFixtures: passedCount,
            failedFixtures: failedCount,
            overallPassRate,
            executedAt: new Date().toISOString(),
            results,
        };
    }
}
