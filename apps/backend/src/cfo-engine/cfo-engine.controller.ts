import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum } from 'class-validator';
import { CfoEngineService } from './cfo-engine.service';
import { StartupProfileService } from '../startup-profile/startup-profile.service';

class UpdateStatusDto {
    @IsEnum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED'])
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
}

@Controller('cfo-engine')
@UseGuards(AuthGuard('jwt'))
export class CfoEngineController {
    constructor(
        private readonly engineService: CfoEngineService,
        private readonly profileService: StartupProfileService,
    ) { }

    /**
     * Run the 6-domain CFO decision engine for the authenticated user's profile.
     */
    @Post('run')
    async runEngine(@Request() req: any) {
        const profile = await this.profileService.findByUser(req.user.id);
        if (!profile) {
            throw new NotFoundException('Startup profile not found. Complete onboarding first.');
        }
        return this.engineService.runEngine(profile.id, req.user.id);
    }

    /**
     * Get all CFO decisions for the current user's profile.
     */
    @Get('decisions')
    async getDecisions(@Request() req: any) {
        const profile = await this.profileService.findByUser(req.user.id);
        if (!profile) {
            throw new NotFoundException('No startup profile found.');
        }
        return this.engineService.getDecisionsForProfile(profile.id);
    }

    /**
     * Update the status of a specific decision (OPEN → ACKNOWLEDGED → RESOLVED).
     */
    @Patch('decisions/:id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateStatusDto,
    ) {
        return this.engineService.updateStatus(id, dto.status);
    }

    /**
     * Run engine for a specific profile ID (admin/testing use).
     */
    @Post('run/:profileId')
    async runEngineForProfile(@Param('profileId') profileId: string) {
        return this.engineService.runEngine(profileId);
    }
}
