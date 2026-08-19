import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CfoStateService } from '../cfo-engine/cfo-state.service';
import { CfoBrainService } from '../cfo-engine/cfo-brain.service';
import { AiMetricsService } from './ai-metrics.service';
import { FinancialContextEngine } from '../kernel/financial-context.engine';

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
      if (key === 'GEMINI_API_KEY') return 'YOUR_GEMINI_API_KEY_HERE';
      return null;
    }),
  };

  const mockCfoStateService = {
    getState: jest.fn(),
  };

  const mockCfoBrainService = {};

  const mockAiMetricsService = {
    recordUsage: jest.fn(),
    isRateLimitExceeded: jest.fn().mockReturnValue(false),
    getUsageSummary: jest.fn(),
    getRealtimeStats: jest.fn(),
    getCostEstimates: jest.fn(),
  };

  const mockFinancialContextEngine = {
    buildOperatingContext: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CfoStateService, useValue: mockCfoStateService },
        { provide: CfoBrainService, useValue: mockCfoBrainService },
        { provide: AiMetricsService, useValue: mockAiMetricsService },
        { provide: FinancialContextEngine, useValue: mockFinancialContextEngine },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getInsights', () => {
    it('should return insights for organization with transactions', async () => {
      const orgId = 'org-123';

      mockCfoStateService.getState.mockResolvedValue({
        summary: {
          monthlyExpenses: 600000,
        },
      });

      const result = await service.getInsights(orgId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('type', 'OPTIMIZATION');
    });

    it('should handle organization with low expenses', async () => {
      const orgId = 'org-empty';

      mockCfoStateService.getState.mockResolvedValue({
        summary: {
          monthlyExpenses: 100000,
        },
      });

      const result = await service.getInsights(orgId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('getCashFlowForecast', () => {
    it('should return cash flow forecast', async () => {
      const orgId = 'org-123';

      mockCfoStateService.getState.mockResolvedValue({
        summary: {
          cashInBank: 1000000,
          netBurn: 100000,
          monthlyRevenue: 150000,
          runwayMonths: 10,
        },
        companyStatus: 'stable',
        cashForecast: {
          next30Days: [],
        },
      });

      const result = await service.getCashFlowForecast(orgId);

      expect(result).toHaveProperty('monthlyBurn');
      expect(result).toHaveProperty('runwayMonths');
    });
  });

  describe('getComplianceAlerts', () => {
    it('should return compliance alerts', async () => {
      const orgId = 'org-123';

      mockCfoStateService.getState.mockResolvedValue({
        summary: {
          cashInBank: 1000000,
          monthlyExpenses: 100000,
          netBurn: 100000,
        },
      });

      // Spy on Date to return a controlled date early in the month to guarantee deadline alerts trigger
      const realDate = global.Date;
      const mockDate = new Date('2026-05-01T00:00:00Z');
      const dateMock = function (...args: any[]) {
        if (args.length === 0) {
          return mockDate;
        }
        return new (realDate as any)(...args);
      } as any;
      dateMock.prototype = realDate.prototype;
      dateMock.now = () => mockDate.getTime();
      dateMock.parse = realDate.parse;
      dateMock.UTC = realDate.UTC;

      global.Date = dateMock;

      const result = await service.getComplianceAlerts(orgId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      global.Date = realDate;
    });
  });

  describe('getAiAnalytics', () => {
    it('should return AI usage analytics', async () => {
      const orgId = 'org-123';

      mockAiMetricsService.getUsageSummary.mockResolvedValue({ totalRequests: 10, totalTokens: 1000, cost: 0.01 });
      mockAiMetricsService.getRealtimeStats.mockReturnValue({});
      mockAiMetricsService.getCostEstimates.mockReturnValue({});

      const result = await service.getAiAnalytics(orgId);

      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('realtime');
      expect(result).toHaveProperty('costEstimates');
    });
  });
});
