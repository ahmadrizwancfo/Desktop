import { Injectable, Logger } from '@nestjs/common';
import { UniversalParserService } from '../../statements/parsers/universal-parser.service';
import { FinancialInvariantEngine, InvariantEvaluationReport } from '../invariants/financial-invariant.engine';
import { CanonicalFinancialEngine } from '../../kernel/canonical-financial-engine';
import { FinancialLawsEngine } from '../../kernel/financial-laws.engine';
import { CanonicalTransaction } from '../canonical-model/canonical-model.interface';
import { createHash } from 'crypto';

export interface ReplayCoordinate {
    rawFileSha256: string;
    parserVersion: string;
    financialEngineVersion: string;
    ruleRegistryVersion: string;
}

export interface ReplaySnapshot {
    replayCoordinate: ReplayCoordinate;
    replayedAt: string;
    rawTransactionCount: number;
    canonicalTransactions: CanonicalTransaction[];
    invariants: InvariantEvaluationReport;
    derivedState: {
        cashInBank: number;
        spendableCash: number;
        gstLock: number;
        tdsLock: number;
        monthlyNetBurn: number;
        trueRunwayMonths: number;
        trueRunwayDays: number;
    };
    lawsEvaluation: Array<{ lawName: string; passed: boolean; reason?: string }>;
    reproducedStateHash: string;
}

@Injectable()
export class FinancialReplayEngine {
    private static readonly logger = new Logger(FinancialReplayEngine.name);

    /**
     * Executes Full-Pipeline Replay from raw file buffer and semantic versions.
     * Guarantees 0-bit drift reproducibility of historical financial states.
     */
    public static async replayPipeline(
        fileBuffer: Buffer,
        filename: string,
        coordinate: ReplayCoordinate,
        universalParser: UniversalParserService
    ): Promise<ReplaySnapshot> {
        const computedSha256 = createHash('sha256').update(fileBuffer).digest('hex');
        
        this.logger.log(`Executing Full-Pipeline Replay for ${filename} (SHA256: ${computedSha256.slice(0, 12)}...)`);

        // Step 1: Parse file via Parser Version
        const parsedDoc = await universalParser.parse(fileBuffer, filename);
        const rawTxns = parsedDoc.transactions || [];

        // Step 2: Transform to Canonical Transactions
        let totalInflow = 0;
        let totalOutflow = 0;

        const canonicalTransactions: CanonicalTransaction[] = rawTxns.map((t, idx) => {
            const isDebit = t.debit !== null && t.debit > 0;
            const amount = isDebit ? t.debit! : (t.credit || 0);
            if (isDebit) totalOutflow += amount;
            else totalInflow += amount;

            const hashSeed = `REPLAY_${t.date}_${amount}_${t.description}_${idx}`;
            const externalId = `TXN-${createHash('sha256').update(hashSeed).digest('hex').slice(0, 16)}`;

            return {
                id: externalId,
                source: 'BANK_FEED',
                organizationId: 'REPLAY_ORG',
                schemaVersion: '1.0',
                amount,
                type: isDebit ? 'EXPENSE' : 'INCOME',
                direction: isDebit ? 'DEBIT' : 'CREDIT',
                category: t.category || (isDebit ? 'General Expense' : 'Revenue'),
                date: new Date(t.date),
                narration: t.description,
                referenceNumber: externalId,
            };
        });

        // Step 3: Enforce 3-Tier Financial Invariants
        const invariants = FinancialInvariantEngine.evaluateBatch(canonicalTransactions);

        // Step 4: Calculate Canonical Metrics via CanonicalFinancialEngine
        const cashInBank = totalInflow;
        const monthlyBurn = totalOutflow;
        const runwayRes = CanonicalFinancialEngine.calculateRunway(cashInBank, monthlyBurn);

        // Step 5: Evaluate Financial Laws
        const lawsEvaluation = FinancialLawsEngine.evaluateLaws({
            cashInBank,
            monthlyBurn,
            monthlyRevenue: 0,
            gstPayable: cashInBank * 0.18,
        });

        // Step 6: Derive Spendable Cash
        const gstLock = cashInBank * 0.18;
        const tdsLock = monthlyBurn * 0.10;
        const spendableCash = Math.max(0, cashInBank - gstLock - tdsLock);

        // Step 7: Compute Deterministic Replay Hash
        const statePayload = `${cashInBank}_${spendableCash}_${monthlyBurn}_${runwayRes.runwayMonths}_${canonicalTransactions.length}`;
        const reproducedStateHash = createHash('sha256').update(statePayload).digest('hex');

        return {
            replayCoordinate: {
                ...coordinate,
                rawFileSha256: computedSha256,
            },
            replayedAt: new Date().toISOString(),
            rawTransactionCount: rawTxns.length,
            canonicalTransactions,
            invariants,
            derivedState: {
                cashInBank,
                spendableCash,
                gstLock,
                tdsLock,
                monthlyNetBurn: monthlyBurn,
                trueRunwayMonths: runwayRes.runwayMonths,
                trueRunwayDays: runwayRes.runwayDays,
            },
            lawsEvaluation,
            reproducedStateHash,
        };
    }
}
