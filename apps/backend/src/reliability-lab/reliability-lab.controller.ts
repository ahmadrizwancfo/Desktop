import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReliabilityLabService } from './reliability-lab.service';
import { OperatingContextSnapshot } from './drift-detector.service';

@Controller('reliability-lab')
@UseGuards(AuthGuard('jwt'))
export class ReliabilityLabController {
    constructor(private readonly reliabilityLab: ReliabilityLabService) {}

    /**
     * Triggers live execution of all Golden Dataset fixtures and returns regression report.
     */
    @Post('run-regression')
    async runRegression() {
        return this.reliabilityLab.runFullRegression();
    }

    /**
     * Compares baseline vs candidate OperatingContext for state and decision drift.
     */
    @Post('detect-drift')
    async detectDrift(@Body() body: { baseline: OperatingContextSnapshot; candidate: OperatingContextSnapshot }) {
        return this.reliabilityLab.detectDrift(body.baseline, body.candidate);
    }

    /**
     * Returns internal engineering dashboard health metrics.
     */
    @Get('dashboard')
    async getDashboard() {
        return this.reliabilityLab.getDashboardOverview();
    }
}
