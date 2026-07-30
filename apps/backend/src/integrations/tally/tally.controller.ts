import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TallyConnectorService } from './tally-connector.service';
import { TallyConfig } from './interfaces/tally-config.interface';

@Controller('integrations/tally')
@UseGuards(AuthGuard('jwt'))
export class TallyController {
  constructor(private readonly tallyService: TallyConnectorService) {}

  @Get('status')
  async getStatus() {
    return {
      enabled: this.tallyService.isTallyIntegrationEnabled(),
      message: this.tallyService.isTallyIntegrationEnabled()
        ? 'Tally Integration Module Active'
        : 'Tally Integration Disabled (ENABLE_TALLY_INTEGRATION=false)',
    };
  }

  @Post('test-connection')
  async testConnection(@Body() body: TallyConfig) {
    return await this.tallyService.testConnection(body);
  }

  @Post('sync')
  async syncVouchers(@Body() body: { organizationId: string; tallyHostUrl?: string }, @Request() req: any) {
    const orgId = body.organizationId || req.user.organizationId;
    const config: TallyConfig = {
      tallyHostUrl: body.tallyHostUrl || 'http://localhost:9000',
      enabled: true,
    };
    return await this.tallyService.syncTallyVouchers(orgId, config);
  }
}
