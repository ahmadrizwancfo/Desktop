import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateStartupProfileDto } from './dto/create-startup-profile.dto';
import { StartupProfileService } from './startup-profile.service';

@Controller('startup-profile')
@UseGuards(AuthGuard('jwt'))
export class StartupProfileController {
    constructor(private readonly service: StartupProfileService) { }

    /**
     * Create or update the authenticated user's startup profile.
     * Triggers the CFO engine automatically after save.
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async upsert(@Request() req: any, @Body() dto: CreateStartupProfileDto) {
        return this.service.upsert(req.user.id, dto);
    }

    /**
     * Get the authenticated user's startup profile (used by frontend for dashboard gate).
     * Returns 404 if not found — frontend uses this to redirect to /onboarding.
     */
    @Get('me')
    async getMyProfile(@Request() req: any) {
        const profile = await this.service.findByUser(req.user.id);
        if (!profile) {
            throw new NotFoundException('Startup profile not found');
        }
        return profile;
    }
}
