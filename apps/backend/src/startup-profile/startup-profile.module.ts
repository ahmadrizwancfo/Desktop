import { Module, forwardRef } from '@nestjs/common';
import { StartupProfileController } from './startup-profile.controller';
import { StartupProfileService } from './startup-profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';
import { AiExplainerModule } from '../ai-explainer/ai-explainer.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => CfoEngineModule),
        AiExplainerModule,
    ],
    controllers: [StartupProfileController],
    providers: [StartupProfileService],
    exports: [StartupProfileService],
})
export class StartupProfileModule { }

