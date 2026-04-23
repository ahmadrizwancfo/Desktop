import { Logger } from '@nestjs/common';
import { DecisionEngineService } from '../apps/backend/src/cfo-engine/decision-engine.service';
import { CFOState } from '../apps/backend/src/cfo-engine/cfo-state.service';

/**
 * Mocking dependencies to run DecisionEngineService in isolation.
 */
class MockLogger {
    log(msg: string) {}
    error(msg: string) {}
    warn(msg: string) {}
}

async function runTests() {
    const service = new DecisionEngineService();
    // @ts-ignore - bypassing private logger
    service.logger = new MockLogger();

    console.log("🚀 STARTING STRESS TEST SCENARIOS (v3.5 OUTCOME CLARITY)\n");

    // 🟥 Scenario 1: “Death is Near”
    const s1: Partial<CFOState> = {
        summary: {
            runwayMonths: 2.2,
            netBurn: 150000, 
            cashInBank: 500000,
            monthlyRevenue: 50000,
            monthlyExpenses: 200000,
            burnTrend: 'up',
            revenueTrend: 'down'
        },
        dynamicConfidence: { score: 85, warnings: [] },
        changeDrivers: [],
        negativeTrends: [{ metric: 'Runway', message: 'Runway is below 3 months.' }],
        decisionMemory: { pendingDecisions: 0 } as any
    };

    const res1 = service.generateDecisions(s1 as CFOState, []);
    const d1 = res1.dailyFocus.fix;
    console.log("🟥 SCENARIO 1: SURVIVAL MODE");
    console.log("Alternative Option:", d1?.alternative.option);
    console.log("Confidence:", d1?.alternative.confidence.toUpperCase());
    console.log("Timeframe:", d1?.alternative.timeframe);
    console.log("Outcome:", d1?.alternative.consequence);
    console.log("----------------------------------\n");

    // 🟧 Scenario 2: “Confusing Growth Trap”
    const s2: Partial<CFOState> = {
        summary: {
            runwayMonths: 5.0,
            netBurn: 80000,
            cashInBank: 1200000,
            monthlyRevenue: 220000,
            monthlyExpenses: 300000,
            burnTrend: 'up',
            revenueTrend: 'up'
        },
        dynamicConfidence: { score: 68, warnings: [{ problem: 'Volatile', impact: 'Low', action: 'Fix' }] },
        changeDrivers: [],
        negativeTrends: [],
        decisionMemory: { pendingDecisions: 0 } as any
    };

    const res2 = service.generateDecisions(s2 as CFOState, [
        { state: { summary: { runwayMonths: 10 } } }
    ]);
    const d2 = res2.dailyFocus.fix;
    console.log("🟧 SCENARIO 2: STABILIZE MODE");
    console.log("Alternative Option:", d2?.alternative.option);
    console.log("Confidence:", d2?.alternative.confidence.toUpperCase());
    console.log("Timeframe:", d2?.alternative.timeframe);
    console.log("Outcome:", d2?.alternative.consequence);
    console.log("----------------------------------\n");

    // 🟩 Scenario 3: “Healthy Growth”
    const s3: Partial<CFOState> = {
        summary: {
            runwayMonths: 12.0,
            netBurn: 20000,
            cashInBank: 2500000,
            monthlyRevenue: 180000,
            monthlyExpenses: 200000,
            burnTrend: 'up',
            revenueTrend: 'down'
        },
        dynamicConfidence: { score: 90, warnings: [] },
        changeDrivers: [],
        negativeTrends: [{ metric: 'Revenue', message: 'Slightly down' }],
        decisionMemory: { pendingDecisions: 0 } as any
    };

    const res3 = service.generateDecisions(s3 as CFOState, []);
    const d3 = res3.dailyFocus.fix;
    console.log("🟩 SCENARIO 3: GROWTH MODE");
    console.log("Alternative Option:", d3?.alternative.option);
    console.log("Confidence:", d3?.alternative.confidence.toUpperCase());
    console.log("Timeframe:", d3?.alternative.timeframe);
    console.log("Outcome:", d3?.alternative.consequence);
    console.log("----------------------------------\n");

    console.log("\n✅ v3.5 OUTCOME CLARITY VERIFICATION COMPLETE");
}

runTests();
