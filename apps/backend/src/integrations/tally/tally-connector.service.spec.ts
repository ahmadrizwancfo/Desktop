import { Test, TestingModule } from '@nestjs/testing';
import { TallyConnectorService } from './tally-connector.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TallyClient } from './tally-client';
import { TallyTransformerService } from './tally-transformer.service';

describe('TallyConnectorService', () => {
  let service: TallyConnectorService;

  const mockPrisma = {
    transaction: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockTallyClient = {
    buildExportXmlEnvelope: jest.fn().mockReturnValue('<ENVELOPE/>'),
    sendTallyXmlRequest: jest.fn(),
  };

  const mockTransformer = {
    transformVoucherToCanonicalTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyConnectorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: TallyClient, useValue: mockTallyClient },
        { provide: TallyTransformerService, useValue: mockTransformer },
      ],
    }).compile();

    service = module.get<TallyConnectorService>(TallyConnectorService);
  });

  describe('syncTallyVouchers', () => {
    it('should skip duplicate transactions based on externalId and orgId', async () => {
      process.env.ENABLE_TALLY_INTEGRATION = 'true';
      const config = { tallyHostUrl: 'http://localhost:9000', enabled: true };

      mockTallyClient.sendTallyXmlRequest.mockResolvedValue(`
        <ENVELOPE>
          <BODY>
            <DATA>
              <COLLECTION>
                <VOUCHER>
                  <MASTERID>VCH-DUP-1</MASTERID>
                  <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
                  <AMOUNT>1000</AMOUNT>
                </VOUCHER>
              </COLLECTION>
            </DATA>
          </BODY>
        </ENVELOPE>
      `);

      mockTransformer.transformVoucherToCanonicalTransaction.mockReturnValue({
        id: 'VCH-DUP-1',
        amount: 1000,
        type: 'EXPENSE',
        category: 'Office',
        narration: 'Payment',
        date: new Date(),
        source: 'TALLY',
      });

      mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'existing-tx-uuid' });

      const result = await service.syncTallyVouchers('org-dedup', config);

      expect(result.count).toBe(0);
      expect(result.duplicates).toBe(1);
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('transaction.ingested', expect.anything());
    });

    it('should handle partial sync failures gracefully and create audit logs', async () => {
      process.env.ENABLE_TALLY_INTEGRATION = 'true';
      const config = { tallyHostUrl: 'http://localhost:9000', enabled: true };

      mockTallyClient.sendTallyXmlRequest.mockResolvedValue(`
        <ENVELOPE>
          <BODY>
            <DATA>
              <COLLECTION>
                <VOUCHER><MASTERID>VCH-OK</MASTERID></VOUCHER>
                <VOUCHER><MASTERID>VCH-FAIL</MASTERID></VOUCHER>
              </COLLECTION>
            </DATA>
          </BODY>
        </ENVELOPE>
      `);

      mockTransformer.transformVoucherToCanonicalTransaction.mockImplementation((rawVch: any) => {
        if (rawVch.MASTERID === 'VCH-FAIL') {
          throw new Error('Transformation Error for corrupted voucher');
        }
        return {
          id: rawVch.MASTERID,
          amount: 500,
          type: 'EXPENSE',
          category: 'Misc',
          narration: 'Valid voucher',
          date: new Date(),
          source: 'TALLY',
        };
      });

      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-admin-1' });

      const result = await service.syncTallyVouchers('org-partial', config);

      expect(result.count).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TALLY_PARTIAL_SYNC_FAILURE',
            entity: 'TallyConnector',
            entityId: 'org-partial',
            userId: 'user-admin-1',
          }),
        }),
      );
    });
  });
});
