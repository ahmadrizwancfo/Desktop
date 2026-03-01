import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;

  const mockPrismaService = {
    transaction: {
      findMany: jest.fn(),
    },
    financialMetrics: {
      findFirst: jest.fn(),
    },
    aiUsage: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    complianceItem: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'test-api-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getInsights', () => {
    it('should return insights for organization with transactions', async () => {
      const orgId = 'org-123';

      mockPrismaService.transaction.findMany.mockResolvedValue([
        { id: '1', amount: 10000, type: 'INCOME', date: new Date() },
        { id: '2', amount: 5000, type: 'EXPENSE', date: new Date() },
      ]);

      const result = await service.getInsights(orgId);

      expect(result).toHaveProperty('totalIncome');
      expect(result).toHaveProperty('totalExpenses');
      expect(result).toHaveProperty('netProfit');
    });

    it('should handle organization with no transactions', async () => {
      const orgId = 'org-empty';

      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      const result = await service.getInsights(orgId);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
    });
  });

  describe('getCashFlowForecast', () => {
    it('should return cash flow forecast', async () => {
      const orgId = 'org-123';

      mockPrismaService.transaction.findMany.mockResolvedValue([
        { id: '1', amount: 100000, type: 'INCOME', date: new Date() },
        { id: '2', amount: 80000, type: 'EXPENSE', date: new Date() },
      ]);

      const result = await service.getCashFlowForecast(orgId);

      expect(result).toHaveProperty('monthlyBurn');
      expect(result).toHaveProperty('runway');
    });
  });

  describe('getComplianceAlerts', () => {
    it('should return compliance alerts', async () => {
      const orgId = 'org-123';

      mockPrismaService.complianceItem.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'GST',
          title: 'GSTR-3B Due',
          dueDate: new Date(),
          severity: 'HIGH',
          status: 'PENDING',
        },
      ]);

      const result = await service.getComplianceAlerts(orgId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getAiAnalytics', () => {
    it('should return AI usage analytics', async () => {
      const orgId = 'org-123';

      mockPrismaService.aiUsage.findMany.mockResolvedValue([
        { id: '1', endpoint: '/ai/chat', totalTokens: 1000, cost: 0.01 },
      ]);
      mockPrismaService.aiUsage.aggregate.mockResolvedValue({
        _sum: { totalTokens: 1000, cost: 0.01 },
        _count: { id: 1 },
      });

      const result = await service.getAiAnalytics(orgId);

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('totalCost');
    });
  });
});
