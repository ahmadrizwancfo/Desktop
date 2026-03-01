import { Test, TestingModule } from '@nestjs/testing';
import { BankSyncService } from './bank-sync.service';

describe('BankSyncService', () => {
  let service: BankSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BankSyncService],
    }).compile();

    service = module.get<BankSyncService>(BankSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
