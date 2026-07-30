import { Test, TestingModule } from '@nestjs/testing';
import { BankSyncService } from './bank-sync.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BankSyncService', () => {
  let service: BankSyncService;

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BankSyncService>(BankSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
