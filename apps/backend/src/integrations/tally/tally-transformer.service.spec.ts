import { Test, TestingModule } from '@nestjs/testing';
import { TallyTransformerService } from './tally-transformer.service';
import { CategoryNormalizationService } from '../../common/canonical-model/category-normalization.service';
import { createHash } from 'crypto';

describe('TallyTransformerService', () => {
  let service: TallyTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyTransformerService,
        CategoryNormalizationService,
      ],
    }).compile();

    service = module.get<TallyTransformerService>(TallyTransformerService);
  });

  describe('transformVoucherToCanonicalTransaction', () => {
    it('should use rawVoucher.MASTERID if available', () => {
      const voucher = {
        MASTERID: 'MASTER-123',
        VOUCHERTYPENAME: 'Payment',
        AMOUNT: 5000,
        DATE: '20260728',
      };
      const result = service.transformVoucherToCanonicalTransaction(voucher, 'org-1');
      expect(result.id).toBe('MASTER-123');
    });

    it('should generate stable deterministic SHA-256 fallback ID when MASTERID and VOUCHERKEY are missing', () => {
      const voucher = {
        VOUCHERTYPENAME: 'Payment',
        VOUCHERNUMBER: 'VCH-999',
        AMOUNT: 12500,
        DATE: '20260728',
      };
      const orgId = 'org-777';

      const result1 = service.transformVoucherToCanonicalTransaction(voucher, orgId);
      const result2 = service.transformVoucherToCanonicalTransaction(voucher, orgId);

      const hashSeed = `${orgId}_VCH-999_12500_20260728`;
      const expectedHash = createHash('sha256').update(hashSeed).digest('hex');
      const expectedId = `TALLY-VCH-${expectedHash}`;

      expect(result1.id).toBe(expectedId);
      expect(result2.id).toBe(expectedId);
      expect(result1.id).toEqual(result2.id);
    });
  });
});
