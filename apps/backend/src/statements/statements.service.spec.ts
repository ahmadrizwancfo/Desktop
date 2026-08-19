import { Test, TestingModule } from '@nestjs/testing';
import { StatementsService } from './statements.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UniversalParserService } from './parsers/universal-parser.service';
import { FinancialAnalyzerService } from './analyzers/financial-analyzer.service';
import { BadRequestException } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

describe('StatementsService', () => {
  let service: StatementsService;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockPrismaService = {
    bankAccount: {
      findFirst: jest.fn().mockResolvedValue({ id: 'acc-1', balance: 50000 }),
      create: jest.fn().mockResolvedValue({ id: 'acc-1', balance: 0 }),
      update: jest.fn().mockResolvedValue({ id: 'acc-1', balance: 50000 }),
    },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'txn-1' }),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
    financialMetrics: {
      create: jest.fn().mockResolvedValue({}),
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
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<StatementsService>(StatementsService);
    jest.clearAllMocks();
  });

  describe('processUpload', () => {
    it('should process PDF file and extract financial metrics', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const orgId = 'org-123';
      const userId = 'user-123';

      mockUniversalParser.parse.mockResolvedValue({
        type: 'pdf',
        rawText: 'Balance Sheet 2026',
        transactions: [
          { date: '2026-04-01', description: 'Opening Balance', debit: 0, credit: 0, balance: 50000 },
          { date: '2026-04-05', description: 'Sales Revenue Inflow', debit: 0, credit: 150000, balance: 200000 },
        ],
        quality: { score: 98 },
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
      expect(result.canonicalCount).toBe(2);
      expect(mockUniversalParser.parse).toHaveBeenCalledTimes(1);
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
