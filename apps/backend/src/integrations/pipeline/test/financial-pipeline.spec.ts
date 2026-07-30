import { Test, TestingModule } from '@nestjs/testing';
import { FinancialProcessingPipelineService } from '../financial-processing-pipeline.service';
import { IndiaTaxRulesEngine } from '../india-tax-rules.engine';
import { ValidationStage } from '../stages/validation-stage.service';
import { NormalizationStage } from '../stages/normalization-stage.service';
import { EnrichmentStage } from '../stages/enrichment-stage.service';
import { DuplicateDetectionStage } from '../stages/duplicate-detection-stage.service';
import { PersistencePreparationStage } from '../stages/persistence-preparation-stage.service';
import { EventPreparationStage } from '../stages/event-preparation-stage.service';
import crypto from 'crypto';

describe('FinancialProcessingPipeline & IndiaTaxRulesEngine Test Suite', () => {
  let pipelineService: FinancialProcessingPipelineService;
  let taxEngine: IndiaTaxRulesEngine;
  let validationStage: ValidationStage;
  let normalizationStage: NormalizationStage;
  let enrichmentStage: EnrichmentStage;
  let duplicateDetectionStage: DuplicateDetectionStage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndiaTaxRulesEngine,
        ValidationStage,
        NormalizationStage,
        EnrichmentStage,
        DuplicateDetectionStage,
        PersistencePreparationStage,
        EventPreparationStage,
        FinancialProcessingPipelineService,
      ],
    }).compile();

    pipelineService = module.get<FinancialProcessingPipelineService>(FinancialProcessingPipelineService);
    taxEngine = module.get<IndiaTaxRulesEngine>(IndiaTaxRulesEngine);
    validationStage = module.get<ValidationStage>(ValidationStage);
    normalizationStage = module.get<NormalizationStage>(NormalizationStage);
    enrichmentStage = module.get<EnrichmentStage>(EnrichmentStage);
    duplicateDetectionStage = module.get<DuplicateDetectionStage>(DuplicateDetectionStage);
  });

  describe('IndiaTaxRulesEngine', () => {
    it('should correctly determine Indian Fiscal Year (April to March)', () => {
      const aprilDate = new Date('2026-04-15');
      const fyApril = taxEngine.getIndianFiscalYear(aprilDate);
      expect(fyApril.fiscalYear).toBe('FY2026-27');
      expect(fyApril.quarter).toBe('Q1');

      const marchDate = new Date('2026-03-15');
      const fyMarch = taxEngine.getIndianFiscalYear(marchDate);
      expect(fyMarch.fiscalYear).toBe('FY2025-26');
      expect(fyMarch.quarter).toBe('Q4');
    });

    it('should calculate CGST and SGST for intrastate transactions', () => {
      const res = taxEngine.calculateGstBreakdown({
        amount: 118,
        supplierGstin: '27AAAAA0000A1Z5',
        buyerGstin: '27BBBBB1111B1Z2', // Both Maharashtra (27)
        overrideTaxRate: 18,
      });

      expect(res.isInterstate).toBe(false);
      expect(res.baseAmount).toBe(100);
      expect(res.gstAmount).toBe(18);
      expect(res.cgstAmount).toBe(9);
      expect(res.sgstAmount).toBe(9);
      expect(res.igstAmount).toBe(0);
    });

    it('should calculate IGST for interstate transactions', () => {
      const res = taxEngine.calculateGstBreakdown({
        amount: 118,
        supplierGstin: '27AAAAA0000A1Z5', // MH (27)
        buyerGstin: '29BBBBB1111B1Z2',    // KA (29)
        overrideTaxRate: 18,
      });

      expect(res.isInterstate).toBe(true);
      expect(res.igstAmount).toBe(18);
      expect(res.cgstAmount).toBe(0);
      expect(res.sgstAmount).toBe(0);
    });

    it('should evaluate TDS Section 194J for professional fees > 30,000', () => {
      const tds = taxEngine.evaluateTdsDeduction({
        category: 'PROFESSIONAL_FEES',
        description: 'Legal & Secretarial Retainer',
        amount: 50000,
      });

      expect(tds.isTdsDeducted).toBe(true);
      expect(tds.section).toBe('194J');
      expect(tds.tdsRatePercent).toBe(10);
      expect(tds.tdsAmount).toBe(5000);
    });
  });

  describe('Validation & Normalization Stages', () => {
    it('should quarantine invalid transaction payloads with negative amounts', () => {
      const badTx = {
        schemaVersion: '1.0',
        internalTransactionId: crypto.randomUUID(),
        externalTransactionId: 'BAD_001',
        idempotencyHash: 'abc',
        organizationId: crypto.randomUUID(),
        bankAccountId: crypto.randomUUID(),
        sourceProvider: 'MOCK',
        amount: -500, // Invalid
        currency: 'INR',
        direction: 'INFLOW',
        transactionType: 'CREDIT',
        transactionDate: new Date(),
      };

      const val = validationStage.validateTransaction(badTx);
      expect(val.success).toBe(false);
      expect(val.quarantined).toBe(true);
    });

    it('should clean raw UPI narrations and convert USD to INR in NormalizationStage', () => {
      const rawTx: any = {
        schemaVersion: '1.0',
        internalTransactionId: crypto.randomUUID(),
        externalTransactionId: 'USD_001',
        idempotencyHash: 'def',
        organizationId: crypto.randomUUID(),
        bankAccountId: crypto.randomUUID(),
        sourceProvider: 'MOCK',
        amount: 100,
        currency: 'USD',
        direction: 'INFLOW',
        transactionType: 'CREDIT',
        transactionDate: new Date(),
        description: 'UPI/412398129/PAYTM/ACME CORP/ICICI',
        counterpartyName: 'UNKNOWN',
        tags: [],
      };

      const norm = normalizationStage.normalizeTransaction(rawTx);
      expect(norm.success).toBe(true);
      expect(norm.data.currency).toBe('INR');
      expect(norm.data.amount).toBe(8350); // 100 USD * 83.5
      expect(norm.data.counterpartyName).toBe('ACME CORP');
    });
  });

  describe('Duplicate Detection Stage', () => {
    it('should detect exact duplicate idempotency hash', () => {
      const orgId = crypto.randomUUID();
      const bankId = crypto.randomUUID();
      const now = new Date();

      const tx1: any = {
        schemaVersion: '1.0',
        internalTransactionId: crypto.randomUUID(),
        externalTransactionId: 'TX_100',
        idempotencyHash: 'hash_123',
        organizationId: orgId,
        bankAccountId: bankId,
        sourceProvider: 'MOCK',
        amount: 5000,
        currency: 'INR',
        direction: 'INFLOW',
        transactionType: 'CREDIT',
        transactionDate: now,
      };

      const dupRes = duplicateDetectionStage.detectDuplicates(tx1, [tx1]);
      expect(dupRes.isDuplicate).toBe(true);
      expect(dupRes.duplicateConfidenceScore).toBe(1.0);
    });
  });

  describe('FinancialProcessingPipeline Integration Test', () => {
    it('should execute end-to-end 6-stage pipeline and record telemetry metrics', () => {
      const orgId = crypto.randomUUID();
      const bankId = crypto.randomUUID();

      const rawItems = [
        {
          schemaVersion: '1.0',
          internalTransactionId: crypto.randomUUID(),
          externalTransactionId: 'PIPE_001',
          idempotencyHash: 'hash_p1',
          organizationId: orgId,
          bankAccountId: bankId,
          sourceProvider: 'MOCK',
          amount: 10000,
          currency: 'INR',
          direction: 'INFLOW',
          transactionType: 'CREDIT',
          transactionDate: new Date(),
          counterpartyName: 'Stripe Payouts',
          category: 'REVENUE',
          tags: [],
        },
        {
          schemaVersion: '1.0',
          internalTransactionId: crypto.randomUUID(),
          externalTransactionId: 'PIPE_002',
          idempotencyHash: 'hash_p2',
          organizationId: orgId,
          bankAccountId: bankId,
          sourceProvider: 'MOCK',
          amount: -50, // Invalid -> Quarantine
          currency: 'INR',
          direction: 'OUTFLOW',
          transactionType: 'DEBIT',
          transactionDate: new Date(),
        },
      ];

      const res = pipelineService.processTransactionBatch(rawItems);
      expect(res.success).toBe(true);
      expect(res.validCount).toBe(1);
      expect(res.quarantinedCount).toBe(1);
      expect(res.items.length).toBe(1);

      const metrics = pipelineService.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.quarantinedRecords).toBeGreaterThan(0);
    });
  });
});
