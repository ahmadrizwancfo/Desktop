import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { IndiaTaxRulesEngine } from '../india-tax-rules.engine';
import { PipelineStageResult } from '../pipeline-types.interface';

@Injectable()
export class EnrichmentStage {
  private readonly logger = new Logger(EnrichmentStage.name);

  constructor(private readonly taxEngine: IndiaTaxRulesEngine) {}

  enrichTransaction(tx: CanonicalTransaction): PipelineStageResult<CanonicalTransaction> {
    const descUpper = (tx.description || '').toUpperCase();
    const partyUpper = (tx.counterpartyName || '').toUpperCase();
    const catUpper = (tx.category || '').toUpperCase();

    // 1. Derive Cash Flow Category (Operating / Investing / Financing / Transfer)
    let cashFlowType: 'OPERATING' | 'INVESTING' | 'FINANCING' | 'TRANSFER' = 'OPERATING';
    if (tx.transactionType === 'INTERNAL_TRANSFER') {
      cashFlowType = 'TRANSFER';
    } else if (
      catUpper.includes('EQUITY') ||
      catUpper.includes('INVESTMENT') ||
      descUpper.includes('INVESTOR') ||
      descUpper.includes('SHARES') ||
      catUpper.includes('LOAN') ||
      descUpper.includes('VENTURE DEBT')
    ) {
      cashFlowType = 'FINANCING';
    } else if (
      catUpper.includes('EQUIPMENT') ||
      catUpper.includes('FIXED ASSET') ||
      descUpper.includes('HARDWARE') ||
      descUpper.includes('LAPTOP')
    ) {
      cashFlowType = 'INVESTING';
    }

    // 2. Classify Transaction Subtype & Category Tagging
    let category = tx.category;
    let subCategory = tx.subCategory;
    const tags = new Set<string>(tx.tags || []);

    tags.add(`CF_${cashFlowType}`);

    if (partyUpper.includes('RAZORPAY') || descUpper.includes('GATEWAY FEE') || catUpper.includes('BANK_FEES')) {
      category = 'BANK_FEES';
      subCategory = 'GATEWAY_FEES';
      tags.add('GATEWAY_FEE');
    } else if (descUpper.includes('PAYROLL') || descUpper.includes('SALARY') || partyUpper.includes('ZETHR') || partyUpper.includes('RAZORPAYX PAYROLL')) {
      category = 'SALARIES';
      subCategory = 'MONTHLY_PAYROLL';
      tags.add('PAYROLL');
    } else if (descUpper.includes('GST') || descUpper.includes('TDS') || descUpper.includes('CHALLAN') || catUpper.includes('TAX')) {
      category = 'TAX';
      tags.add('TAX_PAYMENT');
    } else if (descUpper.includes('AWS') || descUpper.includes('GOOGLE WORKSPACE') || descUpper.includes('GITHUB') || descUpper.includes('VERCEL')) {
      category = 'SOFTWARE_SUBSCRIPTIONS';
      tags.add('SUBSCRIPTION');
    } else if (tx.direction === 'INFLOW') {
      category = category === 'UNCATEGORIZED' ? 'CUSTOMER_RECEIPT' : category;
      tags.add('REVENUE');
    } else {
      category = category === 'UNCATEGORIZED' ? 'VENDOR_PAYMENT' : category;
      tags.add('OPEX');
    }

    // 3. Apply India Regulatory Tax Engine (GST & TDS)
    const gstMetadata = this.taxEngine.calculateGstBreakdown({
      amount: tx.amount,
      supplierGstin: tx.counterpartyGstin,
      overrideTaxRate: tx.gstMetadata?.gstRatePercent,
    });

    const tdsMetadata = this.taxEngine.evaluateTdsDeduction({
      category,
      description: tx.description,
      amount: tx.amount,
    });

    const enrichedTx: CanonicalTransaction = {
      ...tx,
      category,
      subCategory,
      tags: Array.from(tags),
      gstMetadata: {
        isGstApplicable: gstMetadata.gstAmount > 0,
        gstRatePercent: gstMetadata.gstRatePercent,
        cgstAmount: gstMetadata.cgstAmount,
        sgstAmount: gstMetadata.sgstAmount,
        igstAmount: gstMetadata.igstAmount,
        isItcEligible: gstMetadata.isItcEligible,
      },
      tdsMetadata: {
        isTdsDeducted: tdsMetadata.isTdsDeducted,
        section: tdsMetadata.section,
        tdsRatePercent: tdsMetadata.tdsRatePercent,
        tdsAmount: tdsMetadata.tdsAmount,
      },
      updatedAt: new Date(),
    };

    return { success: true, data: enrichedTx };
  }
}
