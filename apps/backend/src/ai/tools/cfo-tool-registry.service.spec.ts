import { Test, TestingModule } from '@nestjs/testing';
import { CfoToolRegistryService } from './cfo-tool-registry.service';
import { FinancialToolsService } from './financial-tools.service';

describe('CfoToolRegistryService Bridge 3 Spec', () => {
  let toolRegistry: CfoToolRegistryService;
  let mockToolsService: any;

  beforeEach(async () => {
    mockToolsService = {
      simulate_business_decision: jest.fn().mockResolvedValue({
        simulationId: '00000000-0000-0000-0000-000000000001',
        decision: { type: 'HIRING', value: 5 },
        recommendation: { isRecommended: true },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CfoToolRegistryService,
        { provide: FinancialToolsService, useValue: mockToolsService },
      ],
    }).compile();

    toolRegistry = module.get<CfoToolRegistryService>(CfoToolRegistryService);
  });

  it('should expose simulate_business_decision in tool declarations', () => {
    const declarations = toolRegistry.getToolDeclarations();
    const tool = declarations.find(t => t.name === 'simulate_business_decision');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Deterministically simulate');
  });

  it('should execute simulate_business_decision with Zod validation', async () => {
    const res = await toolRegistry.executeTool('simulate_business_decision', {
      organizationId: '00000000-0000-0000-0000-000000000001',
      decisionType: 'HIRING',
      value: 5,
      description: 'Hire 5 engineers',
    });

    expect(res.simulationId).toBeDefined();
    expect(mockToolsService.simulate_business_decision).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001',
      'HIRING',
      5,
      'Hire 5 engineers',
      {}
    );
  });
});
