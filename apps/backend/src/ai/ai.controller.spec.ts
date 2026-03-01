import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// Mock AiService
const mockAiService = {
  getInsights: jest.fn().mockResolvedValue([]),
  getCashFlowForecast: jest.fn().mockResolvedValue({
    currentBalance: 1000000,
    monthlyBurn: 100000,
    monthlyIncome: 150000,
    runwayMonths: 12,
    riskLevel: 'LOW',
    forecast: [],
    topExpenseCategories: [],
  }),
  getTdsLiability: jest.fn().mockResolvedValue({
    totalTdsPayable: 50000,
    liabilities: [],
    nextDueDate: '2026-02-07',
  }),
  getChatResponse: jest.fn().mockResolvedValue('AI response'),
  categorizeTransaction: jest.fn().mockResolvedValue({
    category: 'Professional Fees',
    confidence: 0.9,
    tdsApplicable: true,
  }),
  categorizeTransactionsBatch: jest.fn().mockResolvedValue([]),
  getComplianceAlerts: jest.fn().mockResolvedValue([]),
  getComplianceCalendar: jest.fn().mockResolvedValue([]),
  getPredictiveForecast: jest.fn().mockResolvedValue({
    scenarios: [],
    riskFactors: [],
    recommendations: [],
  }),
  generateBoardReport: jest.fn().mockResolvedValue('Board report'),
  generateInvestorUpdate: jest.fn().mockResolvedValue('Investor update'),
  detectAnomalies: jest.fn().mockResolvedValue([]),
  getAiAnalytics: jest.fn().mockResolvedValue({}),
};

describe('AiController', () => {
  let controller: AiController;
  let aiService: typeof mockAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    aiService = mockAiService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInsights', () => {
    it('should return insights', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getInsights(mockUser);
      expect(aiService.getInsights).toHaveBeenCalledWith('org1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCashFlowForecast', () => {
    it('should return cash flow forecast', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getCashFlowForecast(mockUser);
      expect(aiService.getCashFlowForecast).toHaveBeenCalledWith('org1');
      expect(result).toHaveProperty('currentBalance');
      expect(result).toHaveProperty('runwayMonths');
    });
  });

  describe('getTdsLiability', () => {
    it('should return TDS liability', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getTdsLiability(mockUser);
      expect(aiService.getTdsLiability).toHaveBeenCalledWith('org1');
      expect(result).toHaveProperty('totalTdsPayable');
    });
  });

  describe('chat', () => {
    it('should return chat response', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.chat(mockUser, { message: 'What is my runway?' });
      expect(aiService.getChatResponse).toHaveBeenCalledWith('org1', 'What is my runway?');
      expect(result).toHaveProperty('response');
    });
  });

  describe('categorizeTransaction', () => {
    it('should categorize a transaction', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.categorizeTransaction(mockUser, {
        description: 'Software development',
        amount: 100000,
        vendor: 'Tech Co',
      });
      expect(aiService.categorizeTransaction).toHaveBeenCalledWith(
        'org1',
        'Software development',
        100000,
        'Tech Co'
      );
      expect(result).toHaveProperty('category');
    });
  });

  describe('getComplianceAlerts', () => {
    it('should return compliance alerts', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getComplianceAlerts(mockUser);
      expect(aiService.getComplianceAlerts).toHaveBeenCalledWith('org1');
      expect(result).toHaveProperty('alerts');
    });
  });

  describe('getComplianceCalendar', () => {
    it('should return compliance calendar', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getComplianceCalendar(mockUser, '3');
      expect(aiService.getComplianceCalendar).toHaveBeenCalledWith('org1', 3);
      expect(result).toHaveProperty('calendar');
    });
  });

  describe('getPredictions', () => {
    it('should return predictions', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getPredictions(mockUser, '6');
      expect(aiService.getPredictiveForecast).toHaveBeenCalledWith('org1', 6);
      expect(result).toHaveProperty('scenarios');
    });
  });

  describe('getBoardReport', () => {
    it('should generate board report', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getBoardReport(mockUser);
      expect(aiService.generateBoardReport).toHaveBeenCalledWith('org1');
      expect(result).toHaveProperty('report');
    });
  });

  describe('getInvestorUpdate', () => {
    it('should generate investor update', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getInvestorUpdate(mockUser, { highlights: ['Raised funding'] });
      expect(aiService.generateInvestorUpdate).toHaveBeenCalledWith('org1', ['Raised funding']);
      expect(result).toHaveProperty('update');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.detectAnomalies(mockUser);
      expect(aiService.detectAnomalies).toHaveBeenCalledWith('org1');
      expect(result).toHaveProperty('anomalies');
    });
  });

  describe('getAiAnalytics', () => {
    it('should return AI analytics', async () => {
      const mockUser = { organizationId: 'org1' };
      const result = await controller.getAiAnalytics(mockUser);
      expect(aiService.getAiAnalytics).toHaveBeenCalledWith('org1');
    });
  });
});
