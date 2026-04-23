/**
 * FounderCFO — Behavioral Trust Audit
 * ===================================
 * 
 * This simulation validates the "Founder Trust Experience" by
 * mapping technical engine states to human-centric messaging
 * and scoring them against three distinct founder personas.
 * 
 * Personas:
 *   A. First-Time Founder (Paranoid, Low Trust)
 *   B. Growth Founder (Fast, Speed-focused)
 *   C. Experienced Founder (Predictability-focused)
 */

import { PrismaClient, AutoPilotMode, AutoPilotRisk, AutoPilotLogStatus, ActionStatus, ExecutionMode, ActionPriority, StartupStage, PrimaryGoal, DecisionQuality, OutcomeClassification, Role } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), override: true });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.includes('foundercfo_test')) {
    console.error('\n🚨 FATAL: Behavioral Audit must run on foundercfo_test database.\n');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
    log: ['error'], // Keep logs clean for report
});

// ─── Persona Definitions ────────────────────────────────────────────────────

interface Persona {
    id: string;
    name: string;
    description: string;
    trustBias: number;         // Base trust (0-100)
    anxietyMultiplier: number; // Sensitivity to bad news
    speedValue: number;        // Value placed on execution speed
    jargonPenalty: number;     // Penalty for technical terms
}

const personas: Persona[] = [
    {
        id: 'A',
        name: 'First-Time Founder (Arjun)',
        description: 'Paranoid about money, low trust in automation, needs constant reassurance.',
        trustBias: 40,
        anxietyMultiplier: 1.5,
        speedValue: 0.5,
        jargonPenalty: 2.0,
    },
    {
        id: 'B',
        name: 'Growth Founder (Sanya)',
        description: 'Moving fast, wants speed + control, values action over explanations.',
        trustBias: 70,
        anxietyMultiplier: 0.8,
        speedValue: 1.5,
        jargonPenalty: 1.0,
    },
    {
        id: 'C',
        name: 'Experienced Founder (Vikram)',
        description: 'Has seen mistakes, values predictability and audit trails.',
        trustBias: 60,
        anxietyMultiplier: 1.2,
        speedValue: 1.0,
        jargonPenalty: 1.5,
    }
];

// ─── Scoring Logic ──────────────────────────────────────────────────────────

interface PersonaScore {
    personaId: string;
    trust: number;
    clarity: number;
    control: number;
    panicRisk: number;
}

function calculateTrustScore(persona: Persona, message: string, status: string, risk: string): PersonaScore {
    let trust = persona.trustBias;
    let clarity = 80;
    let control = 85;
    let panicRisk = 10 * persona.anxietyMultiplier;

    // 1. Text Analysis
    const hasWhy = message.includes('We\'re testing this') || message.includes('We held this back') || message.includes('because');
    const hasControl = message.includes('control') || message.includes('cancel') || message.includes('undo') || message.includes('stopped');
    const hasReassurance = /safe|protected|locked|verified/i.test(message);
    const hasJargon = /shadow mode|execution pipeline|confidence score|eligibility|checks/i.test(message);

    if (hasWhy) { trust += 15; clarity += 10; }
    if (hasControl) { trust += 10; control += 10; }
    if (hasReassurance) { trust += 15; panicRisk -= 10; }
    if (hasJargon) { trust -= (5 * persona.jargonPenalty); clarity -= (10 * persona.jargonPenalty); }

    // 2. Status Analysis
    if (status === 'CANCELLED') {
        trust += 10; // Transparency improves trust
        panicRisk -= 5;
    }
    if (status === 'PENDING') {
        if (!hasControl) control -= 20;
    }

    // 3. Risk Analysis
    if (risk === 'HIGH' && status === 'EXECUTED') {
        panicRisk += 30 * persona.anxietyMultiplier;
        trust -= 20;
    }

    // Normalize
    trust = Math.max(0, Math.min(100, trust));
    clarity = Math.max(0, Math.min(100, clarity));
    control = Math.max(0, Math.min(100, control));
    panicRisk = Math.max(0, Math.min(100, panicRisk));

    return { personaId: persona.id, trust, clarity, control, panicRisk };
}

// ─── Simulation Run ─────────────────────────────────────────────────────────

async function runBehavioralAudit() {
    console.log('\n🎭 FOUNDERCFO BEHAVIORAL TRUST AUDIT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Targeting Database: ${DATABASE_URL}`);
    console.log('Personas: Arjun (Paranoid), Sanya (Growth), Vikram (Experienced)\n');

    // Fetch all logs from the database (populated by previous safety test)
    const logs = await prisma.autoPilotLog.findMany({
        include: { action: true },
        orderBy: { executedAt: 'desc' }
    });

    if (logs.length === 0) {
        console.error('❌ NO LOGS FOUND. Run auto-pilot.simulation.ts first.');
        process.exit(1);
    }

    const auditResults: { logId: string; personaScores: PersonaScore[] }[] = [];

    for (const log of logs) {
        const personaScores = personas.map(p => calculateTrustScore(p, log.reason, log.status, log.riskLevel));
        auditResults.push({ logId: log.id, personaScores });
    }

    // Aggregate Scores
    const aggregate: Record<string, { trust: number; clarity: number; control: number; panic: number; count: number }> = {};
    personas.forEach(p => aggregate[p.id] = { trust: 0, clarity: 0, control: 0, panic: 0, count: 0 });

    auditResults.forEach(res => {
        res.personaScores.forEach(ps => {
            aggregate[ps.personaId].trust += ps.trust;
            aggregate[ps.personaId].clarity += ps.clarity;
            aggregate[ps.personaId].control += ps.control;
            aggregate[ps.personaId].panic += ps.panicRisk;
            aggregate[ps.personaId].count++;
        });
    });

    // Final Report Generation
    console.log('📊 PERSONA TRUST SCORECARD');
    console.log('───────────────────────────────────────────────────────');
    
    let totalTrustAcrossPersonas = 0;

    personas.forEach(p => {
        const data = aggregate[p.id];
        const avgTrust = Math.round(data.trust / data.count);
        const avgClarity = Math.round(data.clarity / data.count);
        const avgControl = Math.round(data.control / data.count);
        const avgPanic = Math.round(data.panic / data.count);

        totalTrustAcrossPersonas += avgTrust;

        console.log(`👤 ${p.name}`);
        console.log(`   🛡️ Trust:     ${avgTrust >= 80 ? '🟢' : avgTrust >= 60 ? '🟠' : '🔴'} ${avgTrust}/100`);
        console.log(`   👁️ Clarity:   ${avgClarity}/100`);
        console.log(`   🎮 Control:   ${avgControl}/100`);
        console.log(`   🚨 Panic:     ${avgPanic}/100`);
        console.log('');
    });

    const finalTrustScore = Math.round(totalTrustAcrossPersonas / personas.length);
    console.log('───────────────────────────────────────────────────────');
    console.log(`🏁 OVERALL FOUNDER TRUST SCORE: ${finalTrustScore >= 80 ? '🟢' : '🟠'} ${finalTrustScore}/100`);
    
    if (finalTrustScore >= 80) {
        console.log('\n✅ AUDIT PASSED: The new Trust Language System effectively builds founder confidence.');
    } else {
        console.log('\n❌ AUDIT FAILED: Trust scores are below the 80/100 threshold. Refine messaging.');
    }
}

runBehavioralAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
