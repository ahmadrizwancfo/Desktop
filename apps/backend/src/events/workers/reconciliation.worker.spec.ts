import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationWorker, roundToTwoDecimals } from './reconciliation.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ReconciliationWorker', () => {
  let worker: ReconciliationWorker;
  let prisma: PrismaService;

  const mockPrisma = {
    orgFinancialState: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    bankAccount: {
      findMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationWorker,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    worker = module.get<ReconciliationWorker>(ReconciliationWorker);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('roundToTwoDecimals', () => {
    it('should round numbers to two decimal places without precision drift', () => {
      expect(roundToTwoDecimals(10.456)).toBe(10.46);
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
      expect(roundToTwoDecimals(1234.5678)).toBe(1234.57);
      expect(roundToTwoDecimals(100)).toBe(100);
    });
  });

  describe('reconcileOrgState', () => {
    it('should round monetary sums and net burn to two decimal places', async () => {
      mockPrisma.orgFinancialState.findUnique.mockResolvedValue(null);
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: 100.333, type: 'EXPENSE' },
        { amount: 200.444, type: 'EXPENSE' },
        { amount: 50.111, type: 'INCOME' },
      ]);
      mockPrisma.bankAccount.findMany.mockResolvedValue([
        { balance: 5000.123 },
      ]);
      mockPrisma.orgFinancialState.upsert.mockImplementation(({ create }) => Promise.resolve(create));

      const state = await worker.reconcileOrgState('org-123');

      expect(state.debitSum30d).toBe(300.77); // 100.33 + 200.44 = 300.77
      expect(state.creditSum30d).toBe(50.11);
      expect(state.cashInBank).toBe(5000.12);
      expect(state.netBurn).toBe(250.66); // 300.77 - 50.11 = 250.66
    });
  });
});
