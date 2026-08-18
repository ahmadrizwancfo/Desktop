import * as fs from 'fs';
import * as path from 'path';
import { FinancialReplayEngine, ReplayCoordinate } from '../../common/replay/financial-replay.engine';
import { UniversalParserService } from './universal-parser.service';
import { ConfigService } from '@nestjs/config';

describe('FOUNDERCFO REPLAY CERTIFICATION (WORKSTREAM 5)', () => {
    let parser: UniversalParserService;

    beforeAll(() => {
        const mockConfig = { get: () => 'MOCK_KEY' } as unknown as ConfigService;
        parser = new UniversalParserService(mockConfig);
    });

    it('REPLAY-01: Should reproduce 100% identical state hash across consecutive replay runs', async () => {
        const sbiFixturePath = path.resolve(__dirname, '../../../datasets/banks/sbi_disclaimer_header.csv');
        const fileBuffer = fs.readFileSync(sbiFixturePath);

        const coordinate: ReplayCoordinate = {
            rawFileSha256: '',
            parserVersion: '2.1.0',
            financialEngineVersion: '2.0.0',
            ruleRegistryVersion: '1.4.0',
        };

        // Run 1
        const snapshot1 = await FinancialReplayEngine.replayPipeline(fileBuffer, 'sbi_disclaimer_header.csv', coordinate, parser);

        // Run 2
        const snapshot2 = await FinancialReplayEngine.replayPipeline(fileBuffer, 'sbi_disclaimer_header.csv', coordinate, parser);

        expect(snapshot1.reproducedStateHash).toBe(snapshot2.reproducedStateHash);
        expect(snapshot1.canonicalTransactions.length).toBe(snapshot2.canonicalTransactions.length);
        expect(snapshot1.derivedState.trueRunwayMonths).toBe(snapshot2.derivedState.trueRunwayMonths);
        expect(snapshot1.invariants.allPassed).toBe(true);
        expect(snapshot1.derivedState.spendableCash).toBeGreaterThanOrEqual(0);
    });
});
