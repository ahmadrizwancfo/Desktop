import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../common/guards/tenant.guard';
import { BetaCommandCenterService } from './beta-command-center.service';

@Controller('beta-command-center')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class BetaCommandCenterController {
    constructor(private readonly commandCenterService: BetaCommandCenterService) {}

    /**
     * Fetch internal private beta command center telemetry data.
     */
    @Get()
    async getCommandCenterData() {
        const data = await this.commandCenterService.getBetaCommandCenterData();
        return {
            success: true,
            data,
        };
    }
}
