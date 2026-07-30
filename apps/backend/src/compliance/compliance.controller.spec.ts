import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

describe('ComplianceController', () => {
  let controller: ComplianceController;

  const mockComplianceService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceController],
      providers: [
        { provide: ComplianceService, useValue: mockComplianceService },
      ],
    }).compile();

    controller = module.get<ComplianceController>(ComplianceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
