import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const aiService = app.get(AiService);
    
    // Using the seeded test user organization ID we found
    const orgId = "9a55f294-4de6-4caa-af34-9f6d5c2518dc";
    
    const prompts = [
        "What should I cut this month?",
        "TDS/GST compliance risks right now?",
        "Am I ready to raise funds?"
    ];
    
    for (const prompt of prompts) {
        console.log(`\n=========================================\nPROMPT: "${prompt}"`);
        try {
            const result = await aiService.getChatResponse(orgId, prompt);
            console.log("RESPONSE:", JSON.stringify(result, null, 2));
        } catch (e) {
            console.error(`Error for prompt "${prompt}":`, e);
        }
    }
    
    await app.close();
}

bootstrap().catch(err => {
    console.error("Bootstrap error:", err);
    process.exit(1);
});
