import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const aiService = app.get(AiService);
    
    const prompts = [
        "What should I cut this month?",
        "TDS/GST compliance risks right now?",
        "Am I ready to raise funds?"
    ];
    
    // We mock the processCfoChat context to bypass the low-data guardrail and simulate a real-world high quality state.
    // Let's create a custom context with exact numbers as requested.
    const mockContext = {
        runway: 12.5,
        burn: 400000, // ₹4.0 Lakhs per month
        cash: 5000000, // ₹50.0 Lakhs
        completionRate: 85, // 85% data quality
        oneThing: "Stabilize marketing burn and clear pending GST return",
        memory: "No previous history",
        userName: "Raj",
        complianceScore: 92,
        activeMandates: [
            { id: "mandate-1", title: "Cut marketing expenses by 15%", status: "IN_PROGRESS" }
        ],
        categoryBreakdown: [
            { category: "Marketing", amount: 200000 },
            { category: "Software/SaaS", amount: 80000 },
            { category: "Salaries", amount: 100000 },
            { category: "Rent", amount: 20000 }
        ],
        insights: [
            { type: "WARNING", message: "Marketing spend is 50% of monthly burn" }
        ],
        criticalAlerts: [
            { message: "GST filing deadline is in 5 days" }
        ]
    };

    const mockTools = {
        get_runway: () => ({
            runwayMonths: mockContext.runway,
            netBurn: mockContext.burn,
            cashInBank: mockContext.cash,
            deathClock: 375
        }),
        get_expenses: () => ({
            topCategories: mockContext.categoryBreakdown,
            totalExpenses: 400000
        }),
        get_decisions: () => ({
            pending: [],
            completionRate: mockContext.completionRate
        })
    };

    for (const prompt of prompts) {
        console.log(`\n=========================================\nPROMPT: "${prompt}"`);
        try {
            const result = await aiService.processCfoChat(prompt, mockContext, mockTools);
            console.log("RESPONSE:", JSON.stringify(result, null, 2));
        } catch (e) {
            console.error(`Error for prompt "${prompt}":`, e);
        }
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    await app.close();
}

bootstrap().catch(err => {
    console.error("Bootstrap error:", err);
    process.exit(1);
});
