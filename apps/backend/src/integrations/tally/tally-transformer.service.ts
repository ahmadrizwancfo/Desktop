import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  CanonicalTransaction,
  CanonicalAccount,
  CanonicalVendor,
  CanonicalCustomer,
  CanonicalInvoice,
} from '../../common/canonical-model/canonical-model.interface';

import { CategoryNormalizationService } from '../../common/canonical-model/category-normalization.service';

@Injectable()
export class TallyTransformerService {
  private readonly logger = new Logger(TallyTransformerService.name);

  constructor(private normalizer: CategoryNormalizationService) {}

  /**
   * Transforms raw Tally Voucher objects into CanonicalTransaction
   */
  public transformVoucherToCanonicalTransaction(rawVoucher: any, organizationId: string): CanonicalTransaction {
    // FCF v1.1 Robust Amount Extraction (Handles Array & Object forms of ALLLEDGERENTRIES)
    let amount = 0;
    if (rawVoucher.AMOUNT !== undefined) {
      amount = Math.abs(Number(rawVoucher.AMOUNT));
    } else if (rawVoucher.ALLLEDGERENTRIES) {
      const entries = Array.isArray(rawVoucher.ALLLEDGERENTRIES) 
        ? rawVoucher.ALLLEDGERENTRIES 
        : rawVoucher.ALLLEDGERENTRIES['ALLLEDGERENTRIES.LIST'] || [rawVoucher.ALLLEDGERENTRIES];
      
      const list = Array.isArray(entries) ? entries : [entries];
      // Sum primary debits or take max ledger row
      const nonZeroAmounts = list
        .map((e: any) => Math.abs(Number(e.AMOUNT || 0)))
        .filter((a: number) => !isNaN(a) && a > 0);
      
      amount = nonZeroAmounts.length > 0 ? Math.max(...nonZeroAmounts) : 0;
    }

    const dateStr = rawVoucher.DATE || new Date().toISOString();
    const dateParsed = this.parseTallyDate(dateStr);
    const voucherNumber = rawVoucher.VOUCHERNUMBER || '';

    let voucherId = rawVoucher.MASTERID || rawVoucher.VOUCHERKEY || rawVoucher.GUID;
    if (!voucherId) {
      const hashSeed = `${organizationId}_${voucherNumber}_${amount}_${dateStr}`;
      const sha256Hash = createHash('sha256').update(hashSeed).digest('hex');
      voucherId = `TALLY-VCH-${sha256Hash}`;
    }

    const rawType = (rawVoucher.VOUCHERTYPENAME || 'Journal').toUpperCase();

    let canonicalType: 'DEBIT' | 'CREDIT' | 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE';
    if (rawType.includes('RECEIPT') || rawType.includes('SALES')) {
      canonicalType = 'INCOME';
    } else if (rawType.includes('PAYMENT') || rawType.includes('PURCHASE')) {
      canonicalType = 'EXPENSE';
    } else if (rawType.includes('CONTRA') || rawType.includes('JOURNAL')) {
      canonicalType = 'TRANSFER';
    }

    const rawCategory = rawVoucher.PARTYLEDGERNAME || rawVoucher.LEDGERNAME || 'Tally Expense';

    const unnormalizedTx: CanonicalTransaction = {
      id: String(voucherId),
      source: 'TALLY',
      sourceSystem: 'TALLY',
      schemaVersion: '1.0',
      organizationId,
      amount,
      type: canonicalType,
      category: rawCategory,
      originalCategory: rawCategory,
      date: dateParsed,
      narration: rawVoucher.NARRATION || `Tally ${rawType} Voucher`,
      referenceNumber: rawVoucher.VOUCHERNUMBER || String(voucherId),
      partyName: rawVoucher.PARTYNAME || rawVoucher.PARTYLEDGERNAME,
      partyGstin: rawVoucher.PARTYGSTIN,
      importedAt: new Date(),
      createdByConnector: 'tally-connector-v18.5',
      rawPayload: rawVoucher,
    };

    return this.normalizer.normalizeTransaction(unnormalizedTx);
  }

  /**
   * Transforms raw Tally Ledger objects into CanonicalAccount
   */
  public transformLedgerToCanonicalAccount(rawLedger: any, organizationId: string): CanonicalAccount {
    const parentGroup = (rawLedger.PARENT || '').toUpperCase();

    let group: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'BANK' | 'TAX' = 'EXPENSE';
    if (parentGroup.includes('BANK') || parentGroup.includes('CASH')) group = 'BANK';
    else if (parentGroup.includes('DIRECT EXPENSES') || parentGroup.includes('INDIRECT EXPENSES')) group = 'EXPENSE';
    else if (parentGroup.includes('SALES') || parentGroup.includes('INCOME')) group = 'REVENUE';
    else if (parentGroup.includes('DUTIES') || parentGroup.includes('TAX')) group = 'TAX';
    else if (parentGroup.includes('ASSET')) group = 'ASSET';
    else if (parentGroup.includes('LIABILITIES') || parentGroup.includes('CREDITORS')) group = 'LIABILITY';

    return {
      id: rawLedger.MASTERID || `TALLY-LED-${rawLedger.NAME}`,
      source: 'TALLY',
      organizationId,
      name: rawLedger.NAME || 'Unclassified Ledger',
      group,
      parentGroup: rawLedger.PARENT,
      openingBalance: Math.abs(Number(rawLedger.OPENINGBALANCE || 0)),
      closingBalance: Math.abs(Number(rawLedger.CLOSINGBALANCE || 0)),
      currency: 'INR',
    };
  }

  /**
   * Helper: Formats Tally date string (e.g. "20260727" or ISO string) to Date
   */
  private parseTallyDate(dateStr: string): Date {
    if (/^\d{8}$/.test(dateStr)) {
      const year = Number(dateStr.substring(0, 4));
      const month = Number(dateStr.substring(4, 6)) - 1;
      const day = Number(dateStr.substring(6, 8));
      return new Date(year, month, day);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }
}
