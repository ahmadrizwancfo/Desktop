import { Test, TestingModule } from '@nestjs/testing';
import { StatementsService } from './statements.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UniversalParserService } from './parsers/universal-parser.service';
import { FinancialAnalyzerService } from './analyzers/financial-analyzer.service';
import { BadRequestException } from '@nestjs/common';

describe('StatementsService', () => {
  let service: StatementsService;

  const mockPrismaService = {
    bankAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    financialMetrics: {
      create: jest.fn(),
    },
  };

  const mockAiService = {
    getChatResponse: jest.fn(),
    generateSummary: jest.fn(),
  };

  const mockUniversalParser = {
    parse: jest.fn(),
  };

  const mockFinancialAnalyzer = {
    analyze: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: UniversalParserService, useValue: mockUniversalParser },
        { provide: FinancialAnalyzerService, useValue: mockFinancialAnalyzer },
      ],
    }).compile();

    service = module.get<StatementsService>(StatementsService);
    jest.clearAllMocks();
  });

  describe('processUpload', () => {
    const mockFile = {
      originalname: 'test-balance-sheet.pdf',
      buffer: Buffer.from('test content'),
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    it('should process PDF file and extract financial metrics', async () => {
      const orgId = 'org-123';
      const userId = 'user-123';

      mockUniversalParser.parse.mockResolvedValue({
        type: 'pdf',
        rawText: 'Total Assets: 1,00,00,000\nTotal Liabilities: 50,00,000',
      });

      mockFinancialAnalyzer.analyze.mockResolvedValue({
        documentType: 'Balance Sheet',
        confidence: 'high',
        totalAssets: 10000000,
        totalLiabilities: 5000000,
        extractedFields: ['totalAssets', 'totalLiabilities'],
        warnings: [],
      });

      mockPrismaService.financialMetrics.create.mockResolvedValue({
        id: 'metrics-123',
        documentType: 'Balance Sheet',
      });

      mockPrismaService.notification.create.mockResolvedValue({});
      mockAiService.generateSummary.mockResolvedValue('Analysis summary...');

      const result = await service.processUpload(mockFile, orgId, userId);

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveProperty('documentType', 'Balance Sheet');
      expect(mockUniversalParser.parse).toHaveBeenCalledTimes(1);
      expect(mockFinancialAnalyzer.analyze).toHaveBeenCalledTimes(1);
    });

    it('should handle Tally XML files separately', async () => {
      const xmlFile = {
        originalname: 'tally-export.xml',
        buffer: Buffer.from(`
                    <ENVELOPE>
                        <BODY>
                            <DATA>
                                <TALLYMESSAGE>
                                    <VOUCHER>
                                        <DATE>20260101</DATE>
                                        <AMOUNT>10000</AMOUNT>
                                        <NARRATION>Test</NARRATION>
                                    </VOUCHER>
                                </TALLYMESSAGE>
                            </DATA>
                        </BODY>
                    </ENVELOPE>
                `),
      } as Express.Multer.File;

      const orgId = 'org-123';
      const userId = 'user-123';

      mockPrismaService.bankAccount.findFirst.mockResolvedValue(null);
      mockPrismaService.bankAccount.create.mockResolvedValue({ id: 'bank-123' });
      mockPrismaService.notification.create.mockResolvedValue({});
      mockAiService.getChatResponse.mockResolvedValue('Tally import summary');

      const result = await service.processUpload(xmlFile, orgId, userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Tally');
    });

    it('should throw error for unsupported file types', async () => {
      const unsupportedFile = {
        originalname: 'document.docx',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      mockUniversalParser.parse.mockRejectedValue(
        new BadRequestException('Unsupported file type')
      );

      await expect(
        service.processUpload(unsupportedFile, 'org-123', 'user-123')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
