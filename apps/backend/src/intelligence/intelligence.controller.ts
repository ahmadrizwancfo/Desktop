import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { SimulationPlatformService } from './simulation/simulation-platform.service';
import { DynamicsPlatformService } from './dynamics/dynamics-platform.service';
import { MetricsEngineService } from './metrics/metrics-engine.service';
import { CanonicalPrismaAdapter } from './adapters/canonical-prisma.adapter';
import { SimulationDecisionType } from './simulation/domain/simulation.types';

import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class SimulationRequestDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  decisionType!: SimulationDecisionType;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly simulationPlatform: SimulationPlatformService,
    private readonly dynamicsPlatform: DynamicsPlatformService,
    private readonly metricsEngine: MetricsEngineService,
    private readonly prismaAdapter: CanonicalPrismaAdapter,
  ) {}

  @Post('simulation/run')
  async runSimulation(@Body() dto: SimulationRequestDto, @Req() req: any) {
    const orgId = dto.organizationId || req?.user?.organizationId || '00000000-0000-0000-0000-000000000001';
    
    // Hydrate baseline parameters from live DB state
    const baselineParams = await this.prismaAdapter.hydrateFinancialState(orgId);

    const simulationResult = this.simulationPlatform.runSimulation({
      organizationId: orgId,
      decision: {
        type: dto.decisionType,
        value: dto.value,
        description: dto.description,
        params: dto.params || {},
      },
      baselineParams,
    });

    return {
      success: true,
      data: simulationResult,
    };
  }

  @Get('dynamics/health')
  async getBusinessHealth(@Query('organizationId') queryOrgId?: string, @Req() req?: any) {
    const orgId = queryOrgId || req?.user?.organizationId || '00000000-0000-0000-0000-000000000001';
    
    const baselineParams = await this.prismaAdapter.hydrateFinancialState(orgId);
    const metricsMap = this.metricsEngine.calculateAllMetrics(baselineParams);
    const dynamicsResult = this.dynamicsPlatform.processBusinessDynamics({
      organizationId: orgId,
      metricsMap,
    });

    return {
      success: true,
      data: {
        healthReport: dynamicsResult.healthReport,
        systemStates: dynamicsResult.systemStates,
        violatedLaws: dynamicsResult.laws.filter(l => l.isViolated),
        executionTimeMs: dynamicsResult.executionTimeMs,
      },
    };
  }

  @Get('insights')
  async getInsights(@Query('organizationId') queryOrgId?: string, @Req() req?: any) {
    const orgId = queryOrgId || req?.user?.organizationId || '00000000-0000-0000-0000-000000000001';
    const baselineParams = await this.prismaAdapter.hydrateFinancialState(orgId);
    const metricsMap = this.metricsEngine.calculateAllMetrics(baselineParams);

    return {
      success: true,
      data: {
        organizationId: orgId,
        metricsCount: metricsMap.size,
        timestamp: new Date(),
      },
    };
  }
}
