import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceController } from './intelligence.controller';
import { SimulationPlatformService } from './simulation/simulation-platform.service';
import { DynamicsPlatformService } from './dynamics/dynamics-platform.service';
import { MetricsEngineService } from './metrics/metrics-engine.service';
import { CanonicalPrismaAdapter } from './adapters/canonical-prisma.adapter';
import { SimulationModule } from './simulation/simulation.module';
import { PrismaService } from '../prisma/prisma.service';

import { DynamicsModule } from './dynamics/dynamics.module';

describe('IntelligenceController REST API Spec', () => {
  let controller: IntelligenceController;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      bankAccount: { findMany: jest.fn().mockResolvedValue([{ balance: 5000000 }]) },
      invoice: { findMany: jest.fn().mockResolvedValue([{ amount: 500000 }]) },
      transaction: { findMany: jest.fn().mockResolvedValue([{ type: 'INCOME', amount: 1500000 }]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationModule, DynamicsModule],
      controllers: [IntelligenceController],
      providers: [
        MetricsEngineService,
        CanonicalPrismaAdapter,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<IntelligenceController>(IntelligenceController);
  });

  it('1. POST /intelligence/simulation/run should return deterministic simulation results', async () => {
    const res = await controller.runSimulation(
      {
        organizationId: '00000000-0000-0000-0000-000000000001',
        decisionType: 'HIRING',
        value: 3,
        description: 'Hire 3 engineers',
      },
      {}
    );

    expect(res.success).toBe(true);
    expect(res.data.simulationId).toBeDefined();
    expect(res.data.decision.type).toBe('HIRING');
    expect(res.data.affectedSystems).toContain('SYS_HIRING');
  });

  it('2. GET /intelligence/dynamics/health should return business health and system breakdown', async () => {
    const res = await controller.getBusinessHealth('00000000-0000-0000-0000-000000000001', {});

    expect(res.success).toBe(true);
    expect(res.data.healthReport.overallHealthScore).toBeGreaterThan(0);
    expect(res.data.systemStates.length).toBe(10);
  });
});
