import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('ComplianceService', () => {
  let service: ComplianceService;

  const mockPrismaService = {};
  const mockAiService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
