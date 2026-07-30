import { Injectable, Logger } from '@nestjs/common';
import { CanonicalTransactionSchema, CanonicalTransaction } from '../../domain/canonical-transaction.schema';
import { CanonicalAccountSchema, CanonicalAccount } from '../../domain/canonical-account.schema';
import { CanonicalInvoiceSchema, CanonicalInvoice } from '../../domain/canonical-invoice.schema';
import { PipelineStageResult } from '../pipeline-types.interface';

@Injectable()
export class ValidationStage {
  private readonly logger = new Logger(ValidationStage.name);

  validateTransaction(payload: any): PipelineStageResult<CanonicalTransaction> {
    const parseResult = CanonicalTransactionSchema.safeParse(payload);
    
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
      this.logger.warn(`Validation Failure [CanonicalTransaction]: ${errMsgs}`);
      return {
        success: false,
        data: payload as any,
        quarantined: true,
        quarantineReason: `Validation Failure: ${errMsgs}`,
      };
    }

    const data = parseResult.data;

    // Additional Financial Sanity Rules
    if (data.amount <= 0 || isNaN(data.amount)) {
      return {
        success: false,
        data,
        quarantined: true,
        quarantineReason: `Invalid transaction amount: ${data.amount}`,
      };
    }

    return { success: true, data };
  }

  validateAccount(payload: any): PipelineStageResult<CanonicalAccount> {
    const parseResult = CanonicalAccountSchema.safeParse(payload);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
      return {
        success: false,
        data: payload as any,
        quarantined: true,
        quarantineReason: `Account Validation Failure: ${errMsgs}`,
      };
    }
    return { success: true, data: parseResult.data };
  }

  validateInvoice(payload: any): PipelineStageResult<CanonicalInvoice> {
    const parseResult = CanonicalInvoiceSchema.safeParse(payload);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
      return {
        success: false,
        data: payload as any,
        quarantined: true,
        quarantineReason: `Invoice Validation Failure: ${errMsgs}`,
      };
    }
    return { success: true, data: parseResult.data };
  }
}
