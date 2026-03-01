import { Module } from '@nestjs/common';
import { StartupProfileController } from './startup-profile.controller';
import { StartupProfileService } from './startup-profile.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [StartupProfileController],
    providers: [StartupProfileService],
    exports: [StartupProfileService],
})
export class StartupProfileModule { }
