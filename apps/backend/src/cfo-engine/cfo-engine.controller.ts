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
    Logger
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum } from 'class-validator';
import { CfoEngineService } from './cfo-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { CfoBrainService } from './cfo-brain.service';
import { CfoStateService } from './cfo-state.service';
import { StartupProfileService } from '../startup-profile/startup-profile.service';
import { CfoMetricsService } from './cfo-metrics.service';
import { CfoBriefService } from './cfo-brief.service';
import { CfoForecastService } from './cfo-forecast.service';
import { CfoExecutionService } from './cfo-execution.service';
import { CfoAutoExecutionService } from './cfo-auto-execution.service';
import { CfoAutoPilotService } from './cfo-auto-pilot.service';

class UpdateStatusDto {
    @IsEnum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED'])
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
}

@Controller('cfo-engine')
@UseGuards(AuthGuard('jwt'))
export class CfoEngineController {
    private readonly logger = new Logger(CfoEngineController.name);
    
    constructor(
        private readonly engineService: CfoEngineService,
        private readonly brainService: CfoBrainService,
        private readonly stateService: CfoStateService,
        private readonly profileService: StartupProfileService,
        private readonly prisma: PrismaService,
        private readonly metricsService: CfoMetricsService,
        private readonly briefService: CfoBriefService,
        private readonly forecastService: CfoForecastService,
        private readonly executionService: CfoExecutionService,
        private readonly autoExecService: CfoAutoExecutionService,
        private readonly autoPilot: CfoAutoPilotService,
    ) { }

    @Post('actions/start-shadow')
    async startShadow(@Body() body: { actionId: string }, @Request() req: any) {
        return this.autoPilot.startShadow(req.user.id, body.actionId);
    }

    @Post('actions/schedule')
    async scheduleAction(@Body() body: { actionId: string, delayMinutes?: number }, @Request() req: any) {
        return this.autoPilot.scheduleAction(req.user.id, body.actionId, body.delayMinutes);
    }

    @Post('actions/cancel/:logId')
    async cancelAction(@Param('logId') logId: string) {
        return this.autoPilot.cancelAction(logId);
    }

    @Post('actions/execute/:actionId')
    async executeAction(@Param('actionId') actionId: string, @Request() req: any) {
        return this.autoPilot.executeImmediately(req.user.id, actionId);
    }

    @Post('actions/rollback/:actionId')
    async rollbackAction(@Param('actionId') actionId: string, @Request() req: any) {
        return this.autoPilot.rollbackAction(req.user.id, actionId);
    }

    /**
     * Mark a CFO mandate as COMPLETED (Founder claims it's done).
     */
    @Post('state/mandate-claim/:id')
    async claimMandate(@Param('id') id: string, @Body() body: { overrideReason?: string }, @Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        await this.executionService.claimAction(id, body.overrideReason);
        this.stateService.invalidateCache(orgId);
        
        return { message: 'Mandate claimed as done. CFO will now verify.' };
    }

    @Post('state/mandate-feedback/:id')
    async submitFeedback(
        @Param('id') id: string, 
        @Body() body: { type: any, message: string },
        @Request() req: any
    ) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        const result = await this.executionService.submitFeedback(req.user.id, id, body.type, body.message);
        this.stateService.invalidateCache(orgId);
        
        return result;
    }

    @Post('state/mandate-apply/:id')
    async applyMandate(@Param('id') id: string, @Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        const result = await this.autoExecService.applyAction(req.user.id, id);
        this.stateService.invalidateCache(orgId);
        
        return result;
    }

    @Post('state/mandate-undo/:id')
    async undoMandate(@Param('id') id: string, @Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        const result = await this.autoExecService.rollbackExecution(req.user.id, id);
        this.stateService.invalidateCache(orgId);
        
        return result;
    }

    @Post('state/mandate-approve/:id')
    async approveMandate(@Param('id') id: string, @Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        // Approving effectively applies the action
        const result = await this.autoExecService.applyAction(req.user.id, id);
        this.stateService.invalidateCache(orgId);
        
        return result;
    }

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



    // ─── AI CFO Metrics Endpoints ──────────────────────────────────────────────
    
    @Get('metrics')
    async getMetrics(@Request() req: any) {
        let metrics = await this.metricsService.getLatestMetrics(req.user.id);
        const profile = await this.prisma.user.findUnique({ where: { id: req.user.id }, select: { organizationId: true }});
        
        if (!metrics && profile?.organizationId) {
            // Trigger background calculation implicitly if none exist
            await this.metricsService.calculateMetrics(profile.organizationId);
            metrics = await this.metricsService.getLatestMetrics(req.user.id);
        }
        
        if (!metrics) throw new NotFoundException('Metrics not found.');

        let forecast: any = null;
        let confidenceScore = 'LOW'; // default mapping

        if (profile?.organizationId) {
            forecast = await this.forecastService.generateForecast(req.user.id, profile.organizationId);
            
            // Confidence Score (HIGH if live bank sync, LOW if manual)
            const activeBankSync = await this.prisma.integrationConnection.count({
                where: { organizationId: profile.organizationId, status: 'CONNECTED' }
            });
            confidenceScore = activeBankSync > 0 ? 'HIGH' : 'LOW';
        }

        return { ...metrics, forecast, confidenceScore };
    }

    @Get('alerts')
    async getAlerts(@Request() req: any) {
        return this.prisma.alert.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        }); // We'll load decisions via /decisions endpoint separately
    }

    @Get('weekly-brief')
    async getWeeklyBrief(@Request() req: any) {
        let brief = await this.briefService.getLatestBrief(req.user.id);
        
        // Auto-generate if brief is older than 7 days or missing
        const isStagnant = !brief || (Date.now() - new Date(brief.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000);
        
        if (isStagnant) {
            const userState = await this.prisma.user.findUnique({ where: { id: req.user.id }, select: { organizationId: true } });
            if (userState?.organizationId) {
                brief = await this.briefService.generateWeeklyBrief(userState.organizationId);
            }
        }
        
        if (!brief) throw new NotFoundException('Could not generate weekly brief at this time.');
        return brief;
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
     * CFO Brain v1 — Generate data-driven insights from real transactions.
     * Returns DIAGNOSTIC, RISK, and ACTION insights with real ₹ values.
     */
    @Get('brain')
    async getBrainInsights(@Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) {
            throw new NotFoundException('No organization found. Complete onboarding first.');
        }
        return this.brainService.generateReport(orgId, req.user.id);
    }

    /**
     * CFO State — THE SINGLE SOURCE OF TRUTH.
     * Every page, every action depends on this one endpoint.
     * Returns: death clock, forced decisions with action payloads,
     * cash forecast, receivables, primary risk, trust layer.
     */
    @Get('state')
    async getCfoState(@Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) {
            throw new NotFoundException('No organization found. Complete onboarding first.');
        }
        return this.stateService.getState(orgId, req.user.id);
    }

    /**
     * CFO State Debug Mode — Returns raw inputs and calculation derivation.
     * Use this to verify SSOT parity between Dashboard and AI.
     */
    @Get('debug')
    async getDebug(@Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        return this.stateService.getDebugState(orgId);
    }

    /**
     * Invalidate CFO State cache (Manual Refresh).
     * Clears cache and forces recomputation for the entire system.
     */
    @Post('state/invalidate')
    async invalidateState(@Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        this.logger.log(`Manual refresh triggered for org ${orgId}. Invalidating cache.`);
        this.stateService.invalidateCache(orgId);
        
        // Re-fetch to ensure it's ready (optional, but good for "instant" feel)
        const newState = await this.stateService.getState(orgId, req.user.id);
        
        return { 
            message: 'Cache invalidated. Financial metrics recomputed.',
            lastUpdated: newState.generatedAt,
            confidence: newState.dynamicConfidence
        };
    }

    /**
     * GAP 2: Track decision click (founder chose an option)
     */
    @Post('state/decision-click')
    async trackDecisionClick(@Request() req: any, @Body() body: { decisionId: string; optionChosen: string }) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        await this.stateService.recordDecisionClick(orgId, body.decisionId, body.optionChosen);
        return { message: 'Decision click recorded.' };
    }

    /**
     * GAP 2: Track decision acted (founder completed the action)
     */
    @Post('state/decision-acted')
    async trackDecisionActed(@Request() req: any, @Body() body: { decisionId: string; currentRunway: number }) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        await this.stateService.recordDecisionActed(orgId, body.decisionId, body.currentRunway);
        this.stateService.invalidateCache(orgId); // Force recompute to show outcome
        return { message: 'Decision action recorded.' };
    }

    /**
     * Acknowledge a critical AI CFO alert to dismiss it.
     */
    @Post('state/alert-acknowledge/:id')
    async acknowledgeAlert(@Param('id') id: string, @Request() req: any) {
        await this.stateService.acknowledgeAlert(id);
        if (req.user.organizationId) {
            this.stateService.invalidateCache(req.user.organizationId);
        }
        return { message: 'Alert acknowledged.' };
    }

    /**
     * Log a simulation for behavioral pattern detection and auditing.
     */
    @Post('state/simulation-log')
    async logSimulation(@Request() req: any, @Body() body: { modifiers: any, evaluation: any }) {
        const userId = req.user.id;
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');

        // 1. Persist the simulation
        await this.prisma.simulationLog.create({
            data: {
                userId,
                organizationId: orgId,
                inputSnapshot: body.modifiers || {},
                impactSummary: body.evaluation || {},
                riskLevel: body.evaluation?.riskLevel || 'UNKNOWN'
            }
        });

        // 2. Clear inertia (engagement)
        await this.stateService.resetInertia(userId);

        return { message: 'Simulation logged.' };
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
     * Simulation Sandbox — Call forecast engine with multipliers.
     */
    @Post('simulate')
    async simulate(@Request() req: any, @Body() body: { burnInc?: number, revDrop?: number, addedCosts?: number }) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        // Simulation counts as engagement — reset inertia timer
        await this.stateService.resetInertia(req.user.id);
        
        return this.forecastService.simulateScenario(req.user.id, orgId, body);
    }

    /**
     * Run engine for a specific profile ID (admin/testing use).
     */
    @Patch('state/auto-pilot')
    async updateAutoPilot(
        @Body() body: { mode: any, maxImpact: number, shadowMode: boolean, delayMinutes?: number },
        @Request() req: any
    ) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');
        
        const data: any = {
            autoPilotMode: body.mode,
            maxAutoBurnImpact: body.maxImpact,
            shadowModeEnabled: body.shadowMode
        };

        if (body.delayMinutes) {
            data.autoPilotDelayMinutes = Math.max(15, Math.min(120, body.delayMinutes));
        }

        // If turning ON, set enabledAt
        if (body.mode !== 'OFF') {
            data.autoPilotEnabledAt = new Date();
        }
        
        await this.prisma.startupProfile.update({
            where: { organizationId: orgId },
            data
        });
        
        this.stateService.invalidateCache(orgId);
        return { message: 'Auto-Pilot settings updated' };
    }

    @Post('state/auto-pilot-cancel/:logId')
    async cancelAutoPilotExecution(@Param('logId') logId: string, @Request() req: any) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new NotFoundException('No organization found.');

        await this.prisma.autoPilotLog.updateMany({
            where: { id: logId, profile: { organizationId: orgId }, status: 'PENDING' },
            data: { status: 'CANCELLED', reason: 'Founder manually cancelled before execution.' }
        });

        this.stateService.invalidateCache(orgId);
        return { message: 'Auto-Pilot action cancelled.' };
    }
}
