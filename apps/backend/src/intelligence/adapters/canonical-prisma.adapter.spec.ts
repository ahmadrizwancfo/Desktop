import { Test, TestingModule } from '@nestjs/testing';
import { CanonicalPrismaAdapter } from './canonical-prisma.adapter';
import { PrismaService } from '../../prisma/prisma.service';

describe('CanonicalPrismaAdapter Unit Tests', () => {
  let adapter: CanonicalPrismaAdapter;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      bankAccount: {
        findMany: jest.fn().mockResolvedValue([{ balance: 2500000 }]),
      },
      invoice: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.customerId) {
            return Promise.resolve([{ amount: 400000 }]);
          }
          if (where.vendorId) {
            return Promise.resolve([{ amount: 150000 }]);
          }
          return Promise.resolve([{ amount: 400000 }]);
        }),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { type: 'INCOME', amount: 800000 },
          { type: 'EXPENSE', amount: 500000 },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanonicalPrismaAdapter,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    adapter = module.get<CanonicalPrismaAdapter>(CanonicalPrismaAdapter);
  });

  it('should hydrate financial state from Prisma database records', async () => {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const state = await adapter.hydrateFinancialState(orgId);

    expect(state.organizationId).toBe(orgId);
    expect(state.cashInBank).toBe(2500000);
    expect(state.monthlyRevenue).toBe(800000);
    expect(state.monthlyExpenses).toBe(500000);
    expect(state.accountsReceivable).toBe(400000);
    expect(state.accountsPayable).toBe(150000);
  });

  it('should fallback gracefully to safe baseline when database query throws error', async () => {
    mockPrisma.bankAccount.findMany.mockRejectedValue(new Error('DB Connection Lost'));
    const orgId = '00000000-0000-0000-0000-000000000001';
    const state = await adapter.hydrateFinancialState(orgId);

    expect(state.organizationId).toBe(orgId);
    expect(state.cashInBank).toBeGreaterThan(0);
    expect(state.monthlyExpenses).toBeGreaterThan(0);
  });
});
