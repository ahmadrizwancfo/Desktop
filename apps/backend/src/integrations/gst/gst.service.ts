import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGSTProvider } from './gst.interface';
import { SandboxGSTProvider } from './providers/sandbox.provider';

@Injectable()
export class GstService {
    private readonly logger = new Logger(GstService.name);
    private provider: IGSTProvider;

    constructor(
        private configService: ConfigService,
        private sandboxProvider: SandboxGSTProvider
    ) {
        const mode = this.configService.get<string>('GST_MODE') || 'sandbox';

        if (mode === 'sandbox') {
            this.logger.log('Initializing GST Service in SANDBOX mode');
            this.provider = this.sandboxProvider;
        } else {
            // Future: Initialize ClearTax or other providers here
            this.logger.warn('Production provider not configured, falling back to sandbox');
            this.provider = this.sandboxProvider;
        }
    }

    async getReturns(gstin: string, period: string) {
        return this.provider.fetchReturns(gstin, period);
    }

    async getLiability(gstin: string, period: string) {
        return this.provider.fetchLiability(gstin, period);
    }

    async getStatus(gstin: string, period: string) {
        return this.provider.fetchFilingStatus(gstin, period);
    }

    async validateGSTIN(gstin: string) {
        return this.provider.validateGSTIN(gstin);
    }
}
